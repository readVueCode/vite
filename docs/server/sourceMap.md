#  `src/node/server/sourcemap`

## 完整代码

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

### `createDebugger`函数

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

1. 通过调用 `debug(namespace)` 创建了一个调试器，并将其赋值给变量 `log`。`debug` 函数来自于 `debug` 库，它用于创建调试器实例，并指定调试器的名称。
2. 然后，从 `options` 对象中提取 `onlyWhenFocused` 属性的值，并将其赋值给变量 `onlyWhenFocused`。
3. 接下来，代码使用变量 `log.enabled` 的值来确定调试器是否处于启用状态，并将结果赋值给变量 `enabled`。
4. 如果 `enabled` 为 `true`，并且 `onlyWhenFocused` 也为 `true`，则进入下一个条件判断。在这个条件中，代码首先根据 `onlyWhenFocused` 的类型（可能是字符串或布尔值）来确定需要验证的命名空间。检查全局变量 `DEBUG` 是否存在，并且其中是否包含指定的命名空间 `ns`。如果是，则将 `enabled` 设置为 `true`，否则设置为 `false`。
5. 最后，如果 `enabled` 为 `true`，则返回一个函数，这个函数接受参数 `...args: [string, ...any[]]`，这里使用了 TypeScript 的语法。
6. `...args`：这表示函数可以接受任意数量的参数。`...` 是展开操作符，它允许将多个参数打包成一个数组。`:`：这是 TypeScript 中用来指定类型的语法。在这里，它表示参数的类型。`[string, ...any[]]`：这是参数的类型注解。它指定了参数的类型为一个数组，其中第一个元素的类型是 `string`，后续的元素可以是任意类型。总结起来，`...args: [string, ...any[]]` 表示这个函数可以接受一个字符串作为第一个参数，后续参数的数量不限，并且可以是任意类型。
7. 如果过滤值`filter`即`process.env.VITE_DEBUG_FILTER`不存在或者传入的参数数组中至少有一个参数包含了 `filter`，则调用 `log(...args)`，输出调试信息。

## 什么是源文件和源映射文件

在代码中，源文件（source file）指的是原始的、未经过编译或处理的代码文件，通常是开发人员编写的源代码文件，例如 JavaScript 文件、CSS 文件、或其他编程语言的源代码文件。

而源映射文件（source map file）是一种与源文件相关的辅助文件，它提供了一种映射关系，将已经转换、压缩或混淆后的代码映射回原始的源代码。源映射文件通常以单独的文件形式存在，通常具有与源文件相同的文件名，但使用不同的扩展名（例如 `.map`）。source-map是一个用于调试JavaScript代码的技术，它可以将经过压缩的JavaScript代码映射回其原始源代码的位置。在开发大型JavaScript应用程序时，使用source-map可以帮助开发人员更快地调试代码并定位其中的错误。

源映射文件包含了一系列映射关系，用于将转换后的代码中的行号、列号等信息映射回源代码中的对应位置。这样，在调试或错误追踪时，可以通过源映射文件还原出源代码中的位置，以便更方便地理解和调试代码。

源映射文件通常由编译器、转换工具或构建工具生成，并与转换后的代码一起部署到生产环境中。当在生产环境中遇到错误时，开发人员可以使用源映射文件来还原源代码位置，以便更容易地调试和修复问题。

## 为sourcemap中的所有源文件加载源代码内容`injectSourcesContent`

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

## `genSourceMapUrl`：生成SourceMap文件的URL地址

```ts
export function genSourceMapUrl(map: SourceMap | string): string {
  if (typeof map !== 'string') {
    map = JSON.stringify(map)
  }
  return `data:application/json;base64,${Buffer.from(map).toString('base64')}`
}
```

这个函数用于生成SourceMap文件的URL地址

函数接收一个名为`map`的参数，可以是SourceMap对象类型或字符串类型，如果不是字符串，则说明是对象，就将其转换为字符串

然后，使用 `Buffer.from()` 将字符串编码为 Base64，并将 `data` URL 的前缀和 Base64 编码的字符串拼接起来。最后，将生成的 URL 地址字符串返回。

## `getCodeWithSourcemap`：获取带有Sourcemap的代码字符串

```ts
export function getCodeWithSourcemap(
  type: 'js' | 'css',
  code: string,
  map: SourceMap,
): string {
  if (debug) {
    code += `\n/*${JSON.stringify(map, null, 2).replace(/1\*\//g, '*\\/')}*/\n`
  }

  if (type === 'js') {
    code += `\n//# sourceMappingURL=${genSourceMapUrl(map)}`
  } else if (type === 'css') {
    code += `\n/*# sourceMappingURL=${genSourceMapUrl(map)} */`
  }

  return code
}
```

函数的作用是将给定的 `code`（代码）和 `map`（源映射）结合起来，并返回一个带有源映射的字符串。

接收三个参数：

1. `type`，指定代码类型为 JavaScript 还是 CSS，类型为 `'js'` 或 `'css'`。
2. `code`，JavaScript 或 CSS 代码字符串。
3. `map`，表示源映射文件，包含源代码和生成代码之间的映射信息。

首先，函数检查是否启用了调试模式（`debug` 变量）。如果启用了调试模式，它会在 `code` 的末尾添加一个包含源映射的注释。注释使用 `JSON.stringify` 方法将源映射对象转换为字符串，并对斜杠进行转义。

`JSON.stringify(map, null, 2)`参数说明：

- 第一个参数 `map` 是要转换为 JSON 的 JavaScript 对象。
- 第二个参数 `null` 是用于控制 JSON 字符串中的替换函数或数组的 replacer 参数。在这个例子中，没有指定 replacer，所以将其设置为 `null`。
- 第三个参数 `2` 是用于控制 JSON 字符串的缩进的空格数。在这个例子中，缩进设置为 2，因此生成的 JSON 字符串会以 2 个空格缩进。

通过使用这样的格式化，生成的 JSON 字符串将具有更易读的结构，每个键值对都会在单独的行上，并且会有适当的缩进。这样可以提高可读性，并方便调试和查看生成的源映射的内容。

然后，根据 `type` 的值（可以是 `'js'` 或 `'css'`），函数在 `code` 的末尾添加一个指向源映射的注释。如果 `type` 是 `'js'`，则添加的注释是 `//# sourceMappingURL=<sourceMapUrl>`，如果 `type` 是 `'css'`，则添加的注释是 `/*# sourceMappingURL=<sourceMapUrl> */`。调用`genSourceMapUrl` 函数生成`<sourceMapUrl>`

最后，函数返回拼接了源映射的 `code` 字符串。

### 示例-js指向源映射的注释

```js
const type = 'js';
const code = 'console.log("Hello, World!");';
const map = { file: 'bundle.js.map', mappings: '...' };
const codeWithSourcemap = getCodeWithSourcemap(type, code, map);
console.log(codeWithSourcemap);
```

```js
/*# sourceMappingURL=data:application/json;base64,eyJmaWxlIjoic3R5bGVzLmNzcy5tYXAiLCJtYXBwaW5ncyI6Ii4uLiJ9 */ 
```

### 示例-css指向源映射的注释

```js
const type = 'css';
const code = 'body { background-color: #000; }';
const map = { file: 'styles.css.map', mappings: '...' };
const codeWithSourcemap = getCodeWithSourcemap(type, code, map);
console.log(codeWithSourcemap);
```

```css
/*# sourceMappingURL=data:application/json;base64,eyJmaWxlIjoiYnVuZGxlLmpzLm1hcCIsIm1hcHBpbmdzIjoiLi4uIn0= */ 
```

## 应用源映射忽略列表`applySourcemapIgnoreList`

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

`applySourcemapIgnoreList` 函数的主要目的是将满足特定条件的源文件添加到 `x_google_ignoreList` 数组中。该数组是 `map` 对象的属性，用于记录应忽略的源文件索引。

函数接受四个参数：

- `map`：类型为 `ExistingRawSourceMap` 的变量，表示一个已存在的原始源映射。
- `sourcemapPath`：类型为字符串的变量，表示源映射文件的路径。
- `sourcemapIgnoreList`：类型为函数的变量，一个回调函数，用于确定哪些源文件需要被忽略。该函数接受两个参数：`sourcePath`（源文件路径）和 `sourcemapPath`（源映射文件路径），并返回一个布尔值来表示是否忽略该源文件。
- `logger`（可选）：类型为 `Logger` 的变量，一个日志记录器对象，用于输出警告信息。

1. 首先，函数从 `map` 对象中提取 `x_google_ignoreList` 属性的值，并赋给变量 `{ x_google_ignoreList }`。

2. 如果 `x_google_ignoreList` 的值为 `undefined`，则将其赋值为一个空数组 `[]`。

3. 然后，使用 `for` 循环遍历 `map.sources` 数组中的每个元素。在这段代码中，使用 `++sourcesIndex` 和 `sourcesIndex++` 是等效的，因为它们都是对 `sourcesIndex` 变量进行递增操作。

   `++sourcesIndex` 和 `sourcesIndex++` 都是自增操作符，它们的区别在于它们的返回值不同：

   - `++sourcesIndex` 是前缀自增操作符，它会先将 `sourcesIndex` 的值加一，然后返回递增后的值。
   - `sourcesIndex++` 是后缀自增操作符，它也会将 `sourcesIndex` 的值加一，但它返回的是递增前的值。

   在这段代码中，循环的目的是遍历源映射对象的 `sources` 数组。通过使用 `++sourcesIndex` 或 `sourcesIndex++`，我们可以确保在每次迭代中，`sourcesIndex` 的值都会递增，以便访问下一个源文件路径。具体使用哪种自增形式取决于个人偏好，因为它们在这里的效果是相同的。

4. 在每次循环中，它将当前源文件的路径赋给变量 `sourcePath`。如果 `sourcePath` 为空，则跳过当前循环。

5. 接下来，函数调用 `sourcemapIgnoreList` 函数，传入源文件的绝对路径或者将其解析为绝对路径后的值，以及源映射文件的路径。`sourcemapIgnoreList` 函数返回一个布尔值，指示是否要忽略该源文件。

6. 如果传入了 `logger` 并且 `ignoreList` 的类型不是布尔值，则输出警告信息，提醒`sourcemapIgnoreList`函数必须返回布尔值。

7. 如果 `ignoreList` 为 `true`，且当前源文件的索引在 `x_google_ignoreList` 数组中不存在，则将该索引添加到 `x_google_ignoreList` 数组中。

8. 最后，如果 `x_google_ignoreList` 数组的长度大于 0，并且 `map` 对象中不存在 `x_google_ignoreList` 属性，则将 `x_google_ignoreList` 数组赋值给 `map.x_google_ignoreList`。

这个函数的作用是根据给定的源映射文件和源文件路径，通过回调函数来确定哪些源文件需要被忽略，并将需要忽略的源文件索引添加到原始源映射对象的 `x_google_ignoreList` 属性中。

