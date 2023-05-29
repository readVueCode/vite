# `src/node/server/sourcemap`

## 完整代码

```ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import getEtag from 'etag'
import convertSourceMap from 'convert-source-map'
import type { SourceDescription, SourceMap } from 'rollup'
import colors from 'picocolors'
import type { ModuleNode, ViteDevServer } from '..'
import {
  blankReplacer,
  cleanUrl,
  createDebugger,
  ensureWatchedFile,
  isObject,
  prettifyUrl,
  removeTimestampQuery,
  timeFrom,
} from '../utils'
import { checkPublicFile } from '../plugins/asset'
import { getDepsOptimizer } from '../optimizer'
import { applySourcemapIgnoreList, injectSourcesContent } from './sourcemap'
import { isFileServingAllowed } from './middlewares/static'

export const ERR_LOAD_URL = 'ERR_LOAD_URL'
export const ERR_LOAD_PUBLIC_URL = 'ERR_LOAD_PUBLIC_URL'

const debugLoad = createDebugger('vite:load')
const debugTransform = createDebugger('vite:transform')
const debugCache = createDebugger('vite:cache')

export interface TransformResult {
  code: string
  map: SourceMap | null
  etag?: string
  deps?: string[]
  dynamicDeps?: string[]
}

export interface TransformOptions {
  ssr?: boolean
  html?: boolean
}

export function transformRequest(
  url: string,
  server: ViteDevServer,
  options: TransformOptions = {},
): Promise<TransformResult | null> {
  const cacheKey = (options.ssr ? 'ssr:' : options.html ? 'html:' : '') + url

  // This module may get invalidated while we are processing it. For example
  // when a full page reload is needed after the re-processing of pre-bundled
  // dependencies when a missing dep is discovered. We save the current time
  // to compare it to the last invalidation performed to know if we should
  // cache the result of the transformation or we should discard it as stale.
  //
  // A module can be invalidated due to:
  // 1. A full reload because of pre-bundling newly discovered deps
  // 2. A full reload after a config change
  // 3. The file that generated the module changed
  // 4. Invalidation for a virtual module
  //
  // For 1 and 2, a new request for this module will be issued after
  // the invalidation as part of the browser reloading the page. For 3 and 4
  // there may not be a new request right away because of HMR handling.
  // In all cases, the next time this module is requested, it should be
  // re-processed.
  //
  // We save the timestamp when we start processing and compare it with the
  // last time this module is invalidated
  const timestamp = Date.now()

  const pending = server._pendingRequests.get(cacheKey)
  if (pending) {
    return server.moduleGraph
      .getModuleByUrl(removeTimestampQuery(url), options.ssr)
      .then((module) => {
        if (!module || pending.timestamp > module.lastInvalidationTimestamp) {
          // The pending request is still valid, we can safely reuse its result
          return pending.request
        } else {
          // Request 1 for module A     (pending.timestamp)
          // Invalidate module A        (module.lastInvalidationTimestamp)
          // Request 2 for module A     (timestamp)

          // First request has been invalidated, abort it to clear the cache,
          // then perform a new doTransform.
          pending.abort()
          return transformRequest(url, server, options)
        }
      })
  }

  const request = doTransform(url, server, options, timestamp)

  // Avoid clearing the cache of future requests if aborted
  let cleared = false
  const clearCache = () => {
    if (!cleared) {
      server._pendingRequests.delete(cacheKey)
      cleared = true
    }
  }

  // Cache the request and clear it once processing is done
  server._pendingRequests.set(cacheKey, {
    request,
    timestamp,
    abort: clearCache,
  })
  request.then(clearCache, clearCache)

  return request
}

async function doTransform(
  url: string,
  server: ViteDevServer,
  options: TransformOptions,
  timestamp: number,
) {
  url = removeTimestampQuery(url)

  const { config, pluginContainer } = server
  const prettyUrl = debugCache ? prettifyUrl(url, config.root) : ''
  const ssr = !!options.ssr

  const module = await server.moduleGraph.getModuleByUrl(url, ssr)

  // check if we have a fresh cache
  const cached =
    module && (ssr ? module.ssrTransformResult : module.transformResult)
  if (cached) {
    // TODO: check if the module is "partially invalidated" - i.e. an import
    // down the chain has been fully invalidated, but this current module's
    // content has not changed.
    // in this case, we can reuse its previous cached result and only update
    // its import timestamps.

    debugCache?.(`[memory] ${prettyUrl}`)
    return cached
  }

  // resolve
  const id =
    module?.id ??
    (await pluginContainer.resolveId(url, undefined, { ssr }))?.id ??
    url

  const result = loadAndTransform(id, url, server, options, timestamp)

  getDepsOptimizer(config, ssr)?.delayDepsOptimizerUntil(id, () => result)

  return result
}

async function loadAndTransform(
  id: string,
  url: string,
  server: ViteDevServer,
  options: TransformOptions,
  timestamp: number,
) {
  const { config, pluginContainer, moduleGraph, watcher } = server
  const { root, logger } = config
  const prettyUrl =
    debugLoad || debugTransform ? prettifyUrl(url, config.root) : ''
  const ssr = !!options.ssr

  const file = cleanUrl(id)

  let code: string | null = null
  let map: SourceDescription['map'] = null

  // load
  const loadStart = debugLoad ? performance.now() : 0
  const loadResult = await pluginContainer.load(id, { ssr })
  if (loadResult == null) {
    // if this is an html request and there is no load result, skip ahead to
    // SPA fallback.
    if (options.html && !id.endsWith('.html')) {
      return null
    }
    // try fallback loading it from fs as string
    // if the file is a binary, there should be a plugin that already loaded it
    // as string
    // only try the fallback if access is allowed, skip for out of root url
    // like /service-worker.js or /api/users
    if (options.ssr || isFileServingAllowed(file, server)) {
      try {
        code = await fs.readFile(file, 'utf-8')
        debugLoad?.(`${timeFrom(loadStart)} [fs] ${prettyUrl}`)
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e
        }
      }
    }
    if (code) {
      try {
        map = (
          convertSourceMap.fromSource(code) ||
          (await convertSourceMap.fromMapFileSource(
            code,
            createConvertSourceMapReadMap(file),
          ))
        )?.toObject()

        code = code.replace(convertSourceMap.mapFileCommentRegex, blankReplacer)
      } catch (e) {
        logger.warn(`Failed to load source map for ${url}.`, {
          timestamp: true,
        })
      }
    }
  } else {
    debugLoad?.(`${timeFrom(loadStart)} [plugin] ${prettyUrl}`)
    if (isObject(loadResult)) {
      code = loadResult.code
      map = loadResult.map
    } else {
      code = loadResult
    }
  }
  if (code == null) {
    const isPublicFile = checkPublicFile(url, config)
    const msg = isPublicFile
      ? `This file is in /public and will be copied as-is during build without ` +
        `going through the plugin transforms, and therefore should not be ` +
        `imported from source code. It can only be referenced via HTML tags.`
      : `Does the file exist?`
    const importerMod: ModuleNode | undefined = server.moduleGraph.idToModuleMap
      .get(id)
      ?.importers.values()
      .next().value
    const importer = importerMod?.file || importerMod?.url
    const err: any = new Error(
      `Failed to load url ${url} (resolved id: ${id})${
        importer ? ` in ${importer}` : ''
      }. ${msg}`,
    )
    err.code = isPublicFile ? ERR_LOAD_PUBLIC_URL : ERR_LOAD_URL
    throw err
  }
  // ensure module in graph after successful load
  const mod = await moduleGraph.ensureEntryFromUrl(url, ssr)
  ensureWatchedFile(watcher, mod.file, root)

  // transform
  const transformStart = debugTransform ? performance.now() : 0
  const transformResult = await pluginContainer.transform(code, id, {
    inMap: map,
    ssr,
  })
  const originalCode = code
  if (
    transformResult == null ||
    (isObject(transformResult) && transformResult.code == null)
  ) {
    // no transform applied, keep code as-is
    debugTransform?.(
      timeFrom(transformStart) + colors.dim(` [skipped] ${prettyUrl}`),
    )
  } else {
    debugTransform?.(`${timeFrom(transformStart)} ${prettyUrl}`)
    code = transformResult.code!
    map = transformResult.map
  }

  if (map && mod.file) {
    map = (typeof map === 'string' ? JSON.parse(map) : map) as SourceMap
    if (map.mappings && !map.sourcesContent) {
      await injectSourcesContent(map, mod.file, logger)
    }

    const sourcemapPath = `${mod.file}.map`
    applySourcemapIgnoreList(
      map,
      sourcemapPath,
      config.server.sourcemapIgnoreList,
      logger,
    )

    if (path.isAbsolute(mod.file)) {
      for (
        let sourcesIndex = 0;
        sourcesIndex < map.sources.length;
        ++sourcesIndex
      ) {
        const sourcePath = map.sources[sourcesIndex]
        if (sourcePath) {
          // Rewrite sources to relative paths to give debuggers the chance
          // to resolve and display them in a meaningful way (rather than
          // with absolute paths).
          if (path.isAbsolute(sourcePath)) {
            map.sources[sourcesIndex] = path.relative(
              path.dirname(mod.file),
              sourcePath,
            )
          }
        }
      }
    }
  }

  const result =
    ssr && !server.config.experimental.skipSsrTransform
      ? await server.ssrTransform(code, map as SourceMap, url, originalCode)
      : ({
          code,
          map,
          etag: getEtag(code, { weak: true }),
        } as TransformResult)

  // Only cache the result if the module wasn't invalidated while it was
  // being processed, so it is re-processed next time if it is stale
  if (timestamp > mod.lastInvalidationTimestamp) {
    if (ssr) mod.ssrTransformResult = result
    else mod.transformResult = result
  }

  return result
}

function createConvertSourceMapReadMap(originalFileName: string) {
  return (filename: string) => {
    return fs.readFile(
      path.resolve(path.dirname(originalFileName), filename),
      'utf-8',
    )
  }
}
```

## `transformRequest`：

```ts
export function transformRequest(
  url: string,
  server: ViteDevServer,
  options: TransformOptions = {},
): Promise<TransformResult | null> {
  const cacheKey = (options.ssr ? 'ssr:' : options.html ? 'html:' : '') + url

  // This module may get invalidated while we are processing it. For example
  // when a full page reload is needed after the re-processing of pre-bundled
  // dependencies when a missing dep is discovered. We save the current time
  // to compare it to the last invalidation performed to know if we should
  // cache the result of the transformation or we should discard it as stale.
  //
  // A module can be invalidated due to:
  // 1. A full reload because of pre-bundling newly discovered deps
  // 2. A full reload after a config change
  // 3. The file that generated the module changed
  // 4. Invalidation for a virtual module
  //
  // For 1 and 2, a new request for this module will be issued after
  // the invalidation as part of the browser reloading the page. For 3 and 4
  // there may not be a new request right away because of HMR handling.
  // In all cases, the next time this module is requested, it should be
  // re-processed.
  //
  // We save the timestamp when we start processing and compare it with the
  // last time this module is invalidated
  const timestamp = Date.now()

  const pending = server._pendingRequests.get(cacheKey)
  if (pending) {
    return server.moduleGraph
      .getModuleByUrl(removeTimestampQuery(url), options.ssr)
      .then((module) => {
        if (!module || pending.timestamp > module.lastInvalidationTimestamp) {
          // The pending request is still valid, we can safely reuse its result
          return pending.request
        } else {
          // Request 1 for module A     (pending.timestamp)
          // Invalidate module A        (module.lastInvalidationTimestamp)
          // Request 2 for module A     (timestamp)

          // First request has been invalidated, abort it to clear the cache,
          // then perform a new doTransform.
          pending.abort()
          return transformRequest(url, server, options)
        }
      })
  }

  const request = doTransform(url, server, options, timestamp)

  // Avoid clearing the cache of future requests if aborted
  let cleared = false
  const clearCache = () => {
    if (!cleared) {
      server._pendingRequests.delete(cacheKey)
      cleared = true
    }
  }

  // Cache the request and clear it once processing is done
  server._pendingRequests.set(cacheKey, {
    request,
    timestamp,
    abort: clearCache,
  })
  request.then(clearCache, clearCache)

  return request
}
```

这段代码是一个函数，其名称为`transformRequest`。它接受三个参数：

- `url`：表示要转换的资源的URL。
- `server`：表示正在运行的Vite开发服务器实例。
- `options`：包含用于转换过程的选项的对象。

该函数的主要目的是对指定的资源进行转换，并返回转换结果。在转换资源之前，该函数会检查是否已经存在一个在处理中的请求（使用`_pendingRequests`缓存）。如果是，则等待该请求完成并返回其结果。否则，将启动新的转换请求，并将其添加到挂起请求列表中，以便可以在未来的请求中重用转换结果。

在检查缓存之后，该函数调用名为`doTransform`的辅助函数，该函数执行实际的转换操作。在执行转换期间，该函数还会记录当前时间戳，并将其与最近一次无效化缓存的时间戳进行比较。如果缓存已经无效，那么就会尝试丢弃缓存并重新进行转换操作。

最后，该函数会将新的转换请求添加到缓存中，并设置清除缓存的回调函数。当请求完成时（无论是成功还是失败），都会调用该回调函数清除缓存。这样做是为了确保不会在将来的请求中重用失效的转换结果。

## doTransform

```ts
async function doTransform(
  url: string,
  server: ViteDevServer,
  options: TransformOptions,
  timestamp: number,
) {
  url = removeTimestampQuery(url)

  const { config, pluginContainer } = server
  const prettyUrl = debugCache ? prettifyUrl(url, config.root) : ''
  const ssr = !!options.ssr

  const module = await server.moduleGraph.getModuleByUrl(url, ssr)

  // check if we have a fresh cache
  const cached =
    module && (ssr ? module.ssrTransformResult : module.transformResult)
  if (cached) {
    // TODO: check if the module is "partially invalidated" - i.e. an import
    // down the chain has been fully invalidated, but this current module's
    // content has not changed.
    // in this case, we can reuse its previous cached result and only update
    // its import timestamps.

    debugCache?.(`[memory] ${prettyUrl}`)
    return cached
  }

  // resolve
  const id =
    module?.id ??
    (await pluginContainer.resolveId(url, undefined, { ssr }))?.id ??
    url

  const result = loadAndTransform(id, url, server, options, timestamp)

  getDepsOptimizer(config, ssr)?.delayDepsOptimizerUntil(id, () => result)

  return result
}
```



## loadAndTransform

```ts
async function loadAndTransform(
  id: string,
  url: string,
  server: ViteDevServer,
  options: TransformOptions,
  timestamp: number,
) {
  const { config, pluginContainer, moduleGraph, watcher } = server
  const { root, logger } = config
  const prettyUrl =
    debugLoad || debugTransform ? prettifyUrl(url, config.root) : ''
  const ssr = !!options.ssr

  const file = cleanUrl(id)

  let code: string | null = null
  let map: SourceDescription['map'] = null

  // load
  const loadStart = debugLoad ? performance.now() : 0
  const loadResult = await pluginContainer.load(id, { ssr })
  if (loadResult == null) {
    // if this is an html request and there is no load result, skip ahead to
    // SPA fallback.
    if (options.html && !id.endsWith('.html')) {
      return null
    }
    // try fallback loading it from fs as string
    // if the file is a binary, there should be a plugin that already loaded it
    // as string
    // only try the fallback if access is allowed, skip for out of root url
    // like /service-worker.js or /api/users
    if (options.ssr || isFileServingAllowed(file, server)) {
      try {
        code = await fs.readFile(file, 'utf-8')
        debugLoad?.(`${timeFrom(loadStart)} [fs] ${prettyUrl}`)
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e
        }
      }
    }
    if (code) {
      try {
        map = (
          convertSourceMap.fromSource(code) ||
          (await convertSourceMap.fromMapFileSource(
            code,
            createConvertSourceMapReadMap(file),
          ))
        )?.toObject()

        code = code.replace(convertSourceMap.mapFileCommentRegex, blankReplacer)
      } catch (e) {
        logger.warn(`Failed to load source map for ${url}.`, {
          timestamp: true,
        })
      }
    }
  } else {
    debugLoad?.(`${timeFrom(loadStart)} [plugin] ${prettyUrl}`)
    if (isObject(loadResult)) {
      code = loadResult.code
      map = loadResult.map
    } else {
      code = loadResult
    }
  }
  if (code == null) {
    const isPublicFile = checkPublicFile(url, config)
    const msg = isPublicFile
      ? `This file is in /public and will be copied as-is during build without ` +
        `going through the plugin transforms, and therefore should not be ` +
        `imported from source code. It can only be referenced via HTML tags.`
      : `Does the file exist?`
    const importerMod: ModuleNode | undefined = server.moduleGraph.idToModuleMap
      .get(id)
      ?.importers.values()
      .next().value
    const importer = importerMod?.file || importerMod?.url
    const err: any = new Error(
      `Failed to load url ${url} (resolved id: ${id})${
        importer ? ` in ${importer}` : ''
      }. ${msg}`,
    )
    err.code = isPublicFile ? ERR_LOAD_PUBLIC_URL : ERR_LOAD_URL
    throw err
  }
  // ensure module in graph after successful load
  const mod = await moduleGraph.ensureEntryFromUrl(url, ssr)
  ensureWatchedFile(watcher, mod.file, root)

  // transform
  const transformStart = debugTransform ? performance.now() : 0
  const transformResult = await pluginContainer.transform(code, id, {
    inMap: map,
    ssr,
  })
  const originalCode = code
  if (
    transformResult == null ||
    (isObject(transformResult) && transformResult.code == null)
  ) {
    // no transform applied, keep code as-is
    debugTransform?.(
      timeFrom(transformStart) + colors.dim(` [skipped] ${prettyUrl}`),
    )
  } else {
    debugTransform?.(`${timeFrom(transformStart)} ${prettyUrl}`)
    code = transformResult.code!
    map = transformResult.map
  }

  if (map && mod.file) {
    map = (typeof map === 'string' ? JSON.parse(map) : map) as SourceMap
    if (map.mappings && !map.sourcesContent) {
      await injectSourcesContent(map, mod.file, logger)
    }

    const sourcemapPath = `${mod.file}.map`
    applySourcemapIgnoreList(
      map,
      sourcemapPath,
      config.server.sourcemapIgnoreList,
      logger,
    )

    if (path.isAbsolute(mod.file)) {
      for (
        let sourcesIndex = 0;
        sourcesIndex < map.sources.length;
        ++sourcesIndex
      ) {
        const sourcePath = map.sources[sourcesIndex]
        if (sourcePath) {
          // Rewrite sources to relative paths to give debuggers the chance
          // to resolve and display them in a meaningful way (rather than
          // with absolute paths).
          if (path.isAbsolute(sourcePath)) {
            map.sources[sourcesIndex] = path.relative(
              path.dirname(mod.file),
              sourcePath,
            )
          }
        }
      }
    }
  }

  const result =
    ssr && !server.config.experimental.skipSsrTransform
      ? await server.ssrTransform(code, map as SourceMap, url, originalCode)
      : ({
          code,
          map,
          etag: getEtag(code, { weak: true }),
        } as TransformResult)

  // Only cache the result if the module wasn't invalidated while it was
  // being processed, so it is re-processed next time if it is stale
  if (timestamp > mod.lastInvalidationTimestamp) {
    if (ssr) mod.ssrTransformResult = result
    else mod.transformResult = result
  }

  return result
}
```

## createConvertSourceMapReadMap

```js
function createConvertSourceMapReadMap(originalFileName: string) {
  return (filename: string) => {
    return fs.readFile(
      path.resolve(path.dirname(originalFileName), filename),
      'utf-8',
    )
  }
}
```

这个函数用于调用`convert-source-map`库的方法`convertSourceMap.fromMapFileSource(source, readMap)`时，作为第二个参数，也就是`readMap`参数

`source` 是指包含源映射信息的文件的源代码。 `readMap` 函数用于读取注释中指定的源映射信息相对应的源映射文件，该函数会在 `source` 文件中查找最后一个 `sourcemap` 注释，如果找到则返回源映射转换器，以便后续操作源映射信息，否则返回null。

`readMap` 必须是一个函数，该函数接收源映射文件名作为参数，并返回源映射的字符串或缓冲区（如果是同步读取）或包含源映射字符串或缓冲区的Promise（如果是异步读取）。

如果 `readMap` 不返回Promise，`fromMapFileSource` 将同步返回源映射转换器。

如果 `readMap` 返回Promise，则 `fromMapFileSource` 也将返回Promise。该Promise将被解析为源映射转换器或被拒绝为一个错误

在解析源映射文件的过程中，`convertSourceMap.fromMapFileSource()` 方法会使用 `readmap` 函数读取源映射文件的内容，并将其转换为 JavaScript 对象或字符串。

```ts
convertSourceMap.fromMapFileSource(
            code,
            createConvertSourceMapReadMap(file),
          )
```

readmap函数读取指定文件名的文件内容并以 UTF-8 编码格式返回该文件的文本内容

### path.dirname

`path.dirname()` 是 Node.js 中的一个函数，用于返回指定文件路径中的目录名部分，即去掉文件名和扩展名后的部分。这个函数接受一个字符串参数，表示文件路径，返回该文件路径中的目录名部分。

例如，如果文件路径为 `/foo/bar/index.js`，那么 `path.dirname('/foo/bar/index.js')` 将返回 `/foo/bar`。这个函数可以用于拼接文件路径，这里的 `path.resolve(path.dirname(originalFileName), filename)`，可以将原始文件的目录名与指定的文件名 `filename` 拼接成完整的文件路径。

### path.resolve

`path.resolve()` 是 Node.js 中的一个函数，用于将路径或路径片段拼接成完整的路径。

这个函数接受一到多个路径片段作为参数，并以操作系统特定的路径分隔符作为分隔符将这些路径片段连接起来，返回拼接后的完整路径字符串。如果参数中包含绝对路径（以 `/` 或 Windows 系统的盘符开头），则之前的路径都将被忽略，只返回最后一个绝对路径。

例如，在 Unix 系统中，`path.resolve('/foo/bar', './baz')` 返回 `/foo/bar/baz`，而 `path.resolve('/foo/bar', '/tmp/file/')` 返回 `/tmp/file`。在 Windows 系统中，`path.resolve('C:/foo/bar', './baz')` 返回 `C:\foo\bar\baz`，而 `path.resolve('C:/foo/bar', 'D:/tmp/file/')` 返回 `D:\tmp\file`。

在实际应用中，`path.resolve()` 可以用于拼接文件路径、构建绝对路径等场景。

### fs.readFile

`fs.readFile()` 是 Node.js 中的一个函数，用于异步地读取文件的内容。它接受三个参数：

- `path`：要读取的文件路径。
- `options`：可选参数，指定读取文件时的选项，例如编码格式、读取起始位置等。
- `callback`：回调函数，用于处理读取结果。该函数接受两个参数，第一个参数为错误对象，第二个参数为读取到的文件内容。

当文件读取完成后，`fs.readFile()` 会调用回调函数，将读取到的文件内容传递给回调函数的第二个参数。如果读取文件时出现错误，例如文件不存在、无读取权限等，则 `fs.readFile()` 会将错误对象传递给回调函数的第一个参数。

例如，下面的代码读取指定路径的文件内容，并将读取到的内容输出到控制台上：

```js
const fs = require('fs');

fs.readFile('/path/to/file.txt', 'utf-8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
```

若没有指定回调函数，则该函数返回一个 Promise 对象，可以通过 Promise 的 `then()` 方法来处理文件读取结果

```js
const fs = require('fs');

fs.readFile('/path/to/file.txt', 'utf-8')
  .then(data => {
    console.log(data); // 输出读取到的文件内容
  })
  .catch(err => {
    console.error(err); // 输出读取文件时的错误信息
  });
```

