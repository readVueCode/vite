# 完整代码

```ts
import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { ExistingRawSourceMap, SourceMap } from 'rollup'
import type { Logger } from '../logger'
import { createDebugger } from '../utils'

const debug = createDebugger('vite:sourcemap', {
  onlyWhenFocused: true,
})

// Virtual modules should be prefixed with a null byte to avoid a
// false positive "missing source" warning. We also check for certain
// prefixes used for special handling in esbuildDepPlugin.
const virtualSourceRE = /^(?:dep:|browser-external:|virtual:)|\0/

interface SourceMapLike {
  sources: string[]
  sourcesContent?: (string | null)[]
  sourceRoot?: string
}

export async function injectSourcesContent(
  map: SourceMapLike,
  file: string,
  logger: Logger,
): Promise<void> {
  let sourceRoot: string | undefined
  try {
    // The source root is undefined for virtual modules and permission errors.
    sourceRoot = await fs.realpath(
      path.resolve(path.dirname(file), map.sourceRoot || ''),
    )
  } catch {}

  const missingSources: string[] = []
  map.sourcesContent = await Promise.all(
    map.sources.map((sourcePath) => {
      if (sourcePath && !virtualSourceRE.test(sourcePath)) {
        sourcePath = decodeURI(sourcePath)
        if (sourceRoot) {
          sourcePath = path.resolve(sourceRoot, sourcePath)
        }
        return fs.readFile(sourcePath, 'utf-8').catch(() => {
          missingSources.push(sourcePath)
          return null
        })
      }
      return null
    }),
  )

  // Use this command…
  //    DEBUG="vite:sourcemap" vite build
  // …to log the missing sources.
  if (missingSources.length) {
    logger.warnOnce(`Sourcemap for "${file}" points to missing source files`)
    debug?.(`Missing sources:\n  ` + missingSources.join(`\n  `))
  }
}

export function genSourceMapUrl(map: SourceMap | string): string {
  if (typeof map !== 'string') {
    map = JSON.stringify(map)
  }
  return `data:application/json;base64,${Buffer.from(map).toString('base64')}`
}

export function getCodeWithSourcemap(
  type: 'js' | 'css',
  code: string,
  map: SourceMap,
): string {
  if (debug) {
    code += `\n/*${JSON.stringify(map, null, 2).replace(/\*\//g, '*\\/')}*/\n`
  }

  if (type === 'js') {
    code += `\n//# sourceMappingURL=${genSourceMapUrl(map)}`
  } else if (type === 'css') {
    code += `\n/*# sourceMappingURL=${genSourceMapUrl(map)} */`
  }

  return code
}

export function applySourcemapIgnoreList(
  map: ExistingRawSourceMap,
  sourcemapPath: string,
  sourcemapIgnoreList: (sourcePath: string, sourcemapPath: string) => boolean,
  logger?: Logger,
): void {
  let { x_google_ignoreList } = map
  if (x_google_ignoreList === undefined) {
    x_google_ignoreList = []
  }
  for (
    let sourcesIndex = 0;
    sourcesIndex < map.sources.length;
    ++sourcesIndex
  ) {
    const sourcePath = map.sources[sourcesIndex]
    if (!sourcePath) continue

    const ignoreList = sourcemapIgnoreList(
      path.isAbsolute(sourcePath)
        ? sourcePath
        : path.resolve(path.dirname(sourcemapPath), sourcePath),
      sourcemapPath,
    )
    if (logger && typeof ignoreList !== 'boolean') {
      logger.warn('sourcemapIgnoreList function must return a boolean.')
    }

    if (ignoreList && !x_google_ignoreList.includes(sourcesIndex)) {
      x_google_ignoreList.push(sourcesIndex)
    }
  }

  if (x_google_ignoreList.length > 0) {
    if (!map.x_google_ignoreList) map.x_google_ignoreList = x_google_ignoreList
  }
}
```

## 什么是sourceMap

source-map是一个用于调试JavaScript代码的技术，它可以将经过压缩的JavaScript代码映射回其原始源代码的位置。在开发大型JavaScript应用程序时，使用source-map可以帮助开发人员更快地调试代码并定位其中的错误。

## transformRequest

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
```

这段代码首先判断变量 `code` 是否有值，如果有，则尝试从该代码中提取源映射信息并将其转换为 JavaScript 对象。

具体而言，它会先尝试调用 `convertSourceMap.fromSource(code)` 方法，该方法会尝试从 `code` 中提取源映射信息，如果提取成功，则返回一个 `SourceMapGenerator` 对象。如果提取失败，则继续尝试调用 `convertSourceMap.fromMapFileSource(code, createConvertSourceMapReadMap(file))` 方法，该方法会尝试从 `code` 中提取映射文件的路径，并读取该路径下的映射文件，将其解析为 JavaScript 对象并返回。如果两个方法都无法提取源映射信息，则变量 `map` 的值为 `undefined`。

如果成功提取了源映射信息并将其转换为 JavaScript 对象，则变量 `map` 的值为该对象。此外，该代码还使用正则表达式 `convertSourceMap.mapFileCommentRegex` 在 `code` 中查找源映射文件的注释，并使用 `blankReplacer` 替换注释的内容，从而将 `code` 中的源映射信息删除。

如果提取源映射信息的过程中发生错误，则会捕获该错误并记录一个警告日志，告知用户加载源映射信息失败

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

`createConvertSourceMapReadMap`实际上是`convertSourceMap.fromMapFileSource(source, readMap)`方法的第二个传参

`source` 是指包含源映射信息的文件的源代码。 `readMap` 函数用于读取与注释中指定的源映射信息相对应的源映射文件，该函数会在 `source` 文件中查找最后一个 `sourcemap` 注释，如果找到则返回源映射转换器，以便后续操作源映射信息，否则返回null。

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

## path.dirname

`path.dirname()` 是 Node.js 中的一个函数，用于返回指定文件路径中的目录名部分，即去掉文件名和扩展名后的部分。这个函数接受一个字符串参数，表示文件路径，返回该文件路径中的目录名部分。

例如，如果文件路径为 `/foo/bar/index.js`，那么 `path.dirname('/foo/bar/index.js')` 将返回 `/foo/bar`。这个函数可以用于拼接文件路径，如 `path.resolve(path.dirname(originalFileName), filename)`，可以将原始文件的目录名与指定的文件名 `filename` 拼接成完整的文件路径。在实际应用中，`path.dirname()` 可以用于获取文件所在的目录路径，进而读取该目录下的其他文件。

## path.resolve

`path.resolve()` 是 Node.js 中的一个函数，用于将路径或路径片段拼接成完整的路径。

这个函数接受一到多个路径片段作为参数，并以操作系统特定的路径分隔符作为分隔符将这些路径片段连接起来，返回拼接后的完整路径字符串。如果参数中包含绝对路径（以 `/` 或 Windows 系统的盘符开头），则之前的路径都将被忽略，只返回最后一个绝对路径。

例如，在 Unix 系统中，`path.resolve('/foo/bar', './baz')` 返回 `/foo/bar/baz`，而 `path.resolve('/foo/bar', '/tmp/file/')` 返回 `/tmp/file`。在 Windows 系统中，`path.resolve('C:/foo/bar', './baz')` 返回 `C:\foo\bar\baz`，而 `path.resolve('C:/foo/bar', 'D:/tmp/file/')` 返回 `D:\tmp\file`。

在实际应用中，`path.resolve()` 可以用于拼接文件路径、构建绝对路径等场景。

## fs.readFile

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

