# sourceMap

source-map是一个用于调试JavaScript代码的技术，它可以将经过压缩的JavaScript代码映射回其原始源代码的位置。在开发大型JavaScript应用程序时，使用source-map可以帮助开发人员更快地调试代码并定位其中的错误。

Vite使用`convert-source-map`库进行source-map操作。

## convert-source-map

`convert-source-map` 是一个可以转换source-map为不同格式，或从不同格式转换source-map，并且允许增改属性的库。

```js
var convert = require('convert-source-map');

var json = convert
  .fromComment('//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQvZm9vLm1pbi5qcyIsInNvdXJjZXMiOlsic3JjL2Zvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSIsInNvdXJjZVJvb3QiOiIvIn0=')
  .toJSON();

var modified = convert
  .fromComment('//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGQvZm9vLm1pbi5qcyIsInNvdXJjZXMiOlsic3JjL2Zvby5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSIsInNvdXJjZVJvb3QiOiIvIn0=')
  .setProperty('sources', [ 'SRC/FOO.JS' ])
  .toJSON();

console.log(json);
console.log(modified);
```

```js
{"version":3,"file":"build/foo.min.js","sources":["src/foo.js"],"names":[],"mappings":"AAAA","sourceRoot":"/"}
{"version":3,"file":"build/foo.min.js","sources":["SRC/FOO.JS"],"names":[],"mappings":"AAAA","sourceRoot":"/"}
```

### 升级

 在 v2.0.0 之前，`fromMapFileComment` 和 `fromMapFileSource` 函数接受一个字符串类型的目录路径，并从文件系统中解析并读取源映射文件。但是，这种做法限制了库在 Node.js 环境下的使用，并且无法处理包含查询字符串的源文件。

在 v2.0.0 中，你需要传递一个自定义的函数来执行文件读取操作。该函数将接收源文件名作为字符串类型的参数，你可以将其解析为文件系统路径、URL 或其他任何格式。

如果你正在 Node.js 环境中使用 `convert-source-map` 并希望保留先前的行为，则可以使用以下类似的函数：

```js
+ var fs = require('fs'); // Import the fs module to read a file
+ var path = require('path'); // Import the path module to resolve a path against your directory
- var conv = convert.fromMapFileSource(css, '../my-dir');
+ var conv = convert.fromMapFileSource(css, function (filename) {
+   return fs.readFileSync(path.resolve('../my-dir', filename), 'utf-8');
+ });
```

### fromMapFileSource

fromMapFileSource(source, readMap)函数会在文件中查找最后一个sourcemap注释，如果找到则返回源映射转换器，否则返回null。

readMap必须是一个函数，该函数接收源映射文件名作为参数，并返回源映射的字符串或缓冲区（如果是同步读取）或包含源映射字符串或缓冲区的Promise（如果是异步读取）。

如果readMap不返回Promise，fromMapFileSource将同步返回源映射转换器。

如果readMap返回Promise，则fromMapFileSource也将返回Promise。该Promise将被解析为源映射转换器或被拒绝为一个错误。

在 `fromMapFileSource` 函数中，`source` 是指包含源映射信息的文件的源代码。该函数的目的是在源代码中查找最后一个 sourcemap 注释，并从 `readMap` 函数中读取与注释中指定的源映射信息相对应的源映射文件，然后返回一个源映射转换器，以便后续操作源映射信息。



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

## createConvertSourceMapReadMap函数

`convertSourceMap.fromMapFileSource()` 是 `convert-source-map` 库提供的一个方法，用于将源映射文件的内容转换为 JavaScript 对象或字符串。这个方法接收两个参数：

- `code`: 要解析的源映射文件的内容。
- `readmap`: 一个函数，用于读取源映射文件的内容。该函数接收一个参数 `filename`，表示要读取的文件路径，返回一个 Promise，该 Promise 的解析值为源映射文件的内容。

在解析源映射文件的过程中，`convertSourceMap.fromMapFileSource()` 方法会使用 `readmap` 函数读取源映射文件的内容，并将其转换为 JavaScript 对象或字符串。

```ts
convertSourceMap.fromMapFileSource(
            code,
            createConvertSourceMapReadMap(file),
          )
```

readmap函数读取指定文件名的文件内容并以 UTF-8 编码格式返回该文件的文本内容

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

