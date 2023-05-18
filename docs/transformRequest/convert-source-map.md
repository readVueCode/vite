# convert-source-map

> https://www.npmjs.com/package/convert-source-map

Vite使用`convert-source-map`库进行source-map（源代码映射）操作。

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

这种格式是 Source Map 的 JSON 格式，包含以下属性：

- version：Source Map 版本号，目前最新版为 3。
- file：源文件编译后的文件名。
- sources：源文件路径的数组，可以包含多个文件路径。
- names：被映射的代码中的所有变量名或函数名，如果存在的话。
- mappings：源代码与编译后代码之间的映射关系，是一个字符串。
- sourceRoot：可选字段，表示源文件的根路径。

在上述示例中，两条记录的版本、文件名、sourcRoot 都相同，区别在于 sources 字段的大小写不同，以及 mappings 的值为 "AAAA"，表示原始代码中的第一行映射到编译后代码的第一行。

在 Sourcemap 的 mappings 字段中，一个字符代表一组映射规则，这个字符包括四个部分，每个部分表示一组映射的信息。

## Mappings 

Mappings 是一个字符串，它包含多个分号分隔的段，每个段都是一行代码到原始代码的映射。每个段由逗号分隔的四个值组成：generatedCodeColumn, sourceFileIndex, sourceCodeLine, sourceCodeColumn，可以用于将生成代码映射回原始代码的位置。每个段中的每个值都可以通过基于前一个段中的值的差异进行编码，以尽可能缩短字符串的长度。

比如，CAAC 中的 CAA 表示生成代码列数为 1，对应的原始代码在 input.js 文件中，行数为 2，列数为 1

## 升级

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

## fromObject(obj) 

从给定的对象返回源映射转换器。

### 示例

```js
const convertSourceMap = require('convert-source-map');

const sourceMap = convertSourceMap.fromObject({
  version: 3,
  file: 'output.js',
  sources: ['input.js'],
  mappings: 'AAAA,CAAC,GAAG,EAAE',
});

console.log(sourceMap.toObject()); // 输出 source map 对象
//{
//  version: 3,
//  file: 'output.js',
//  sources: ['input.js'],
//  mappings: 'AAAA,CAAC,GAAG,EAAE'
//}
```

## fromJSON(json) 

从给定的JSON字符串返回源映射转换器。

### 示例

```js
const convertSourceMap = require('convert-source-map');

const json = '{"version":3,"sources":["input.js"],"names":[],"mappings":"AAAA,CAAC,GAAG,EAAE","file":"output.js"}';

const sourceMap = convertSourceMap.fromJSON(json);

console.log(sourceMap.toObject());
//{
//  version: 3,
//  file: 'output.js',
//  sources: ['input.js'],
//  mappings: 'AAAA,CAAC,GAAG,EAAE'
//}
```

## fromURI(uri) 

从给定的URI编码的JSON字符串返回源映射转换器。

## fromBase64(base64) 

从给定的base64编码的JSON字符串返回源映射转换器。

## fromComment(comment) 

从以`//# sourceMappingURL=...`为前缀的给定base64或URI编码的JSON字符串返回源映射转换器。

### 示例

假设有一个JavaScript源文件main.js，它引用了一个包含源映射的JavaScript文件main.min.js。源映射信息存储在另一个文件main.min.js.map中。

在main.js文件的底部，有一个指向源映射文件的注释：

```js
//# sourceMappingURL=main.min.js.map
```

现在，我们可以使用`convert-source-map`模块的`fromComment`方法来获取源映射转换器，以便后续使用：

```js
const convert = require('convert-source-map');
const fs = require('fs');

const code = fs.readFileSync('main.min.js', 'utf8');
const comment = convert().fromSource(code).toComment();
const map = convert().fromComment(comment);
console.log(map.toObject());
```

在这个例子中，`fromComment`方法将从给定的注释中提取源映射信息并返回源映射转换器。`toObject()`方法用于将转换器转换为一个JavaScript对象，该对象包含源映射的所有信息。

## fromMapFileComment(comment, readMap)

根据解析的 `//# sourceMappingURL=filename`，返回一个与给定文件名对应的源代码映射转换器(source map converter)。

`readMap` 必须是一个函数，该函数接收源代码映射文件名，并返回源代码映射的字符串或缓冲区（如果同步读取），或者返回包含源代码映射字符串或缓冲区的 Promise（如果异步读取）。

如果 `readMap` 函数不返回 Promise，则 `fromMapFileComment` 方法将同步返回源代码映射转换器。

如果 `readMap` 函数返回 Promise，则 `fromMapFileComment` 方法也将返回一个 Promise。该 Promise 将被解析为源代码映射转换器，或被拒绝为一个错误。

### 示例

在 Node.js 中进行同步读取：

```js
var convert = require('convert-source-map');
var fs = require('fs');

function readMap(filename) {
  return fs.readFileSync(filename, 'utf8');
}

var json = convert
  .fromMapFileComment('//# sourceMappingURL=map-file-comment.css.map', readMap)
  .toJSON();
console.log(json);
```

在 Node.js 中进行异步读取：

```js
var convert = require('convert-source-map');
var { promises: fs } = require('fs'); // Notice the `promises` import

function readMap(filename) {
  return fs.readFile(filename, 'utf8');
}

var converter = await convert.fromMapFileComment('//# sourceMappingURL=map-file-comment.css.map', readMap)
var json = converter.toJSON();
console.log(json);
```

在浏览器中进行异步读取：

```js
var convert = require('convert-source-map');

async function readMap(url) {
  const res = await fetch(url);
  return res.text();
}

const converter = await convert.fromMapFileComment('//# sourceMappingURL=map-file-comment.css.map', readMap)
var json = converter.toJSON();
console.log(json);
```

## fromSource(source)

在给定的源代码中查找最后一个 source map 的注释，如果没有找到注释，则返回 null。如果找到了注释，则返回 source map 转换器

## fromMapFileSource(source, readMap)

在文件中查找最后一个源代码映射注释，并返回对应的源代码映射转换器；如果没有找到源代码映射注释，则返回 `null`。

`readMap` 必须是一个函数，该函数接收源代码映射文件名，并返回源代码映射的字符串或缓冲区（如果同步读取），或者返回包含源代码映射字符串或缓冲区的 Promise（如果异步读取）。

如果 `readMap` 函数不返回 Promise，则 `fromMapFileSource` 方法将同步返回源代码映射转换器。

如果 `readMap` 函数返回 Promise，则 `fromMapFileSource` 方法也将返回一个 Promise。该 Promise 将被解析为源代码映射转换器，或被拒绝为一个错误。

## fromSource和fromMapFileSource有啥区别

`fromSource` 方法和 `fromMapFileSource` 方法的主要区别在于它们寻找 source map 注释的位置和方式。

`fromSource` 方法会在给定的源代码中查找最后一个 source map 注释，并返回一个 source map 转换器。这意味着它要求在源代码中有一个行内注释，其中包含 source map 的链接地址，例如：

```js
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ...
```

另一方面，`fromMapFileSource` 方法会在给定的源代码中查找所有指向外部 source map 文件的注释，并返回一个 source map 转换器。这意味着它要求在源代码中有一个或多个类似下面的注释：

```js
//# sourceMappingURL=example.map
```

`fromMapFileSource` 方法还要求提供一个用于读取外部 source map 文件的函数，该函数可以同步或异步读取文件内容并返回一个包含 source map 数据的字符串或缓冲区。

因此，两种方法适用于不同的场景，取决于 source map 注释的位置和读取 source map 数据的方式。

## toObject()

 返回底层源代码映射的副本。

## toJSON([space])

 将源代码映射转换为 JSON 字符串。如果指定了 `space`（可选），则在生成 JSON 字符串时会将其传递给 `JSON.stringify`。

## toURI()

 将源代码映射转换为 URI 编码的 JSON 字符串。

## toBase64() 

将源代码映射转换为 Base64 编码的 JSON 字符串。

## toComment([options])

将源代码映射转换为可以附加到源文件中的内联注释。

默认情况下，注释格式为：`//# sourceMappingURL=...`，在 JS 源文件中通常会看到。

当 `options.encoding == 'uri'` 时，数据将被 URI 编码，否则它们将被 Base64 编码。

当 `options.multiline == true` 时，注释格式为：`/*# sourceMappingURL=... */`，在 CSS 源文件中通常会看到。

## addProperty(key, value) 

向源代码映射中添加指定的属性。如果该属性已存在，则抛出错误。

## setProperty(key, value) 

将指定的属性设置为源代码映射。如果该属性不存在，则添加它，否则更新其值。

## getProperty(key)

 获取源代码映射的指定属性。

## removeComments(src) 

返回已删除所有源代码映射注释的 `src`。

## removeMapFileComments(src) 

返回已删除所有指向映射文件的源代码映射注释的 `src`。

## commentRegex 

每次访问时提供一个新的 RegExp。可用于查找源代码映射注释。

将源代码映射注释拆分为组：组 1：媒体类型，组 2：MIME 类型，组 3：字符集，组 4：编码，组 5：数据。

## mapFileCommentRegex 

每次访问时提供一个新的 RegExp。可用于查找指向映射文件的源代码映射注释。

## generateMapFileComment(file, [options]) 

返回通过文件链接到外部源代码映射的注释。

默认情况下，注释格式为：`//# sourceMappingURL=...`，在 JS 源文件中通常会看到。

当 `options.multiline == true` 时，注释格式为：`/*# sourceMappingURL=... */`，在 CSS 源文件中通常会看到。

