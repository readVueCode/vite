# src/node/server/sourcemap

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