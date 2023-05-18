# 完整代码

> 文件路径 `src/node/server/sourcemap`

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

## 创建一个调试器

```js
import { createDebugger } from '../utils'

const debug = createDebugger('vite:sourcemap', {
  onlyWhenFocused: true,
})
```

### `createDebugger`源码

```js
import debug from 'debug'
...
// set in bin/vite.js
const filter = process.env.VITE_DEBUG_FILTER
const DEBUG = process.env.DEBUG
...
export function createDebugger(
  namespace: ViteDebugScope,
  options: DebuggerOptions = {},
): debug.Debugger['log'] | undefined {
  const log = debug(namespace)
  const { onlyWhenFocused } = options

  let enabled = log.enabled
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
    enabled = !!DEBUG?.includes(ns)
  }

  if (enabled) {
    return (...args: [string, ...any[]]) => {
      if (!filter || args.some((a) => a?.includes?.(filter))) {
        log(...args)
      }
    }
  }
}
```

`createDebugger` 函数的作用是根据给定的命名空间和选项创建一个调试器，并根据调试器的状态和条件输出调试信息。

调试器的启用状态和输出内容可以通过选项进行配置，其中包括仅在 "focused"（聚焦）状态下输出调试信息以及应用过滤器。

```js
export function createDebugger(
  namespace: ViteDebugScope,
  options: DebuggerOptions = {},
): debug.Debugger['log'] | undefined {
  ...
}
```

接下来，代码通过调用 `debug(namespace)` 创建了一个调试器，并将其赋值给变量 `log`。`debug` 函数来自于 `debug` 模块，它用于创建调试器实例，并指定调试器的名称。

```js
 const log = debug(namespace)
```

然后，代码从 `options` 对象中提取 `onlyWhenFocused` 属性的值，并将其赋值给变量 `onlyWhenFocused`。

```js
const { onlyWhenFocused } = options
```

接下来，代码使用变量 `log.enabled` 的值来确定调试器是否处于启用状态，并将结果赋值给变量 `enabled`。

如果 `enabled` 为 `true`，并且 `onlyWhenFocused` 也为 `true`，则进入下一个条件判断。在这个条件中，代码首先根据 `onlyWhenFocused` 的类型（可能是字符串或布尔值）来确定需要验证的命名空间。

然后，代码检查全局变量 `DEBUG` 是否存在，并且其中是否包含指定的命名空间 `ns`。如果是，则将 `enabled` 设置为 `true`，否则设置为 `false`。

```js
  let enabled = log.enabled
  if (enabled && onlyWhenFocused) {
    const ns = typeof onlyWhenFocused === 'string' ? onlyWhenFocused : namespace
    enabled = !!DEBUG?.includes(ns)
  }
```

最后，如果 `enabled` 为 `true`，则返回一个函数，这个函数接受参数 `...args: [string, ...any[]]`，这里使用了 TypeScript 的语法。

1. `...args`：这表示函数可以接受任意数量的参数。`...` 是展开操作符，它允许将多个参数打包成一个数组。
2. `:`：这是 TypeScript 中用来指定类型的语法。在这里，它表示参数的类型。
3. `[string, ...any[]]`：这是参数的类型注解。它指定了参数的类型为一个数组，其中第一个元素的类型是 `string`，后续的元素可以是任意类型。

总结起来，`...args: [string, ...any[]]` 表示这个函数可以接受一个字符串作为第一个参数，后续参数的数量不限，并且可以是任意类型。

返回的函数体内，它首先检查是否存在过滤器 `filter`，如果不存在或者传入的参数数组中至少有一个元素包含了 `filter`，则调用 `log(...args)`，输出调试信息。

```ts
if (enabled) {
    return (...args: [string, ...any[]]) => {
      if (!filter || args.some((a) => a?.includes?.(filter))) {
        log(...args)
      }
    }
  }
```

## 为sourcemap中的所有源文件加载源代码内容

```js
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
```

该函数的主要目的是为源代码映射（Source Map）对象中的所有源文件加载源代码内容，并将其存储在`sourcesContent`数组中。该函数使用`map.sources`数组中的每个源文件路径调用`fs.readFile`方法异步加载文件内容，并将内容存储在`sourcesContent`数组中的相应位置。在加载源代码期间，如果发现一个源文件不存在，则将该文件添加到`missingSources`数组中。

1. 
   virtualSourceRE是一个正则表达式，用于匹配sourcePath是否符合某些特定的前缀规则。这些规则包括：

   - 以"dep:"开头
   - 以"browser-external:"开头
   - 以"virtual:"开头
   - 包含null字节"\0"

   如果sourcePath符合这些规则之一，则被视为不需要进行文件读取的虚拟模块，以避免在“injectSourcesContent”函数中引发“missing source”警告

2. 在函数的开头，通过调用`fs.realpath`方法，确定了源代码文件的根目录，该根目录在后续加载源文件时会被使用。若无法确定根目录，则将`sourceRoot`设置为`undefined`。

3. 在函数的末尾，如果`missingSources`数组不为空，则会发出警告，表明有一些源文件无法加载。这个警告会被日志记录器（`logger`）记录下来。如果定义了`debug`函数，则会将缺少的源文件的列表打印出来，方便进行调试。

## genSourceMapUrl

这是一个用于生成源代码映射文件的URL地址的函数。它接收一个名为`map`的参数，可以是字符串或对象类型的 SourceMap，然后将其转换为 Base64 编码的字符串，最后将它们拼接到一个 `data` URL 上，返回生成的 URL 地址字符串。

具体而言，函数首先检查 `map` 参数的类型，如果是一个对象，就将其转换为字符串类型。然后，使用 `Buffer.from()` 将字符串编码为 Base64，并将 `data` URL 的前缀和 Base64 编码的字符串拼接起来。最后，将生成的 URL 地址字符串返回。

使用这个函数生成源代码映射文件的 URL 地址，可以用于在浏览器中调试 JavaScript 代码时，将源代码映射到编译后的代码。

```js
export function genSourceMapUrl(map: SourceMap | string): string {
  if (typeof map !== 'string') {
    map = JSON.stringify(map)
  }
  return `data:application/json;base64,${Buffer.from(map).toString('base64')}`
}
```

## getCodeWithSourcemap

```ts
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
```

1. `type`，指定代码类型为 JavaScript 还是 CSS，类型为 `'js'` 或 `'css'`。
2. `code`，包含 JavaScript 或 CSS 代码的字符串。
3. `map`，表示源映射的对象，其中包含源代码和生成代码之间的映射信息。

函数首先检查是否设置了 `debug` 标志，如果设置了，将源映射对象序列化为 JSON 格式，并添加为注释行附加到代码的末尾，以便调试使用。

接着，函数根据代码类型添加相应的 source map 信息，这些信息在浏览器中用于调试时跟踪源代码和生成代码之间的对应关系。对于 JavaScript，会添加一个单独的注释行，指向生成的 source map 文件。对于 CSS，将 source map URL 包含在注释块中。

最后，函数返回包含代码和 source map 信息的字符串。

## applySourcemapIgnoreList

```ts
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

 `applySourcemapIgnoreList` 的导出函数。该函数接受以下参数：

- `map`：类型为 `ExistingRawSourceMap` 的变量，表示一个已存在的原始源映射。
- `sourcemapPath`：类型为字符串的变量，表示源映射文件的路径。
- `sourcemapIgnoreList`：类型为函数的变量，它接受两个参数：`sourcePath`（源文件路径）和 `sourcemapPath`（源映射文件路径），并返回一个布尔值。
- `logger`（可选）：类型为 `Logger` 的变量，用于记录日志信息。

函数的主要目的是将满足特定条件的源文件添加到 `x_google_ignoreList` 数组中。该数组是 `map` 对象的属性，用于记录应忽略的源文件索引。

```js
  let { x_google_ignoreList } = map
  if (x_google_ignoreList === undefined) {
    x_google_ignoreList = []
  }
```

首先，函数从 `map` 对象中提取 `x_google_ignoreList` 属性的值，并赋给变量 `{ x_google_ignoreList }`。如果 `x_google_ignoreList` 的值为 `undefined`，则将其赋值为一个空数组 `[]`。

```js
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
```

然后，函数使用 `for` 循环遍历 `map.sources` 数组中的每个元素。在每次循环中，它将当前源文件的路径赋给变量 `sourcePath`。如果 `sourcePath` 为空，则跳过当前循环。

接下来，函数调用 `sourcemapIgnoreList` 函数，并传入源文件的绝对路径或者将其解析为绝对路径后的值，以及源映射文件的路径。`sourcemapIgnoreList` 函数返回一个布尔值，指示是否要忽略该源文件。如果传入了 `logger` 并且 `ignoreList` 的类型不是布尔值，则记录一条警告信息，指出 `sourcemapIgnoreList` 函数必须返回布尔值。

如果 `ignoreList` 为 `true`，且当前源文件的索引在 `x_google_ignoreList` 数组中不存在，则将该索引添加到 `x_google_ignoreList` 数组中。

最后，如果 `x_google_ignoreList` 数组的长度大于 0，并且 `map` 对象中不存在 `x_google_ignoreList` 属性，则将 `x_google_ignoreList` 数组赋值给 `map.x_google_ignoreList`。

总之，该函数用于应用源文件忽略列表，根据一定的条件将满足条件的源文件索引添加到 `x_google_ignoreList` 数组中，并最终更新源映射对象的属性。