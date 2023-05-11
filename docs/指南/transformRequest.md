## 创建一个转换并读取 Source Map 的函数

该函数可以读取指定文件名的文件内容并以 UTF-8 编码格式返回该文件的文本内容

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

### path.dirname

`path.dirname()` 是 Node.js 中的一个函数，用于返回指定文件路径中的目录名部分，即去掉文件名和扩展名后的部分。这个函数接受一个字符串参数，表示文件路径，返回该文件路径中的目录名部分。

例如，如果文件路径为 `/foo/bar/index.js`，那么 `path.dirname('/foo/bar/index.js')` 将返回 `/foo/bar`。这个函数可以用于拼接文件路径，如 `path.resolve(path.dirname(originalFileName), filename)`，可以将原始文件的目录名与指定的文件名 `filename` 拼接成完整的文件路径。在实际应用中，`path.dirname()` 可以用于获取文件所在的目录路径，进而读取该目录下的其他文件。

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

