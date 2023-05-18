# 起步

> src/node/server/hmr.ts

处理热更新

## `node:fs/promises`前面的`node:`是什么意思

```js
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Server } from 'node:http'
```

### 为什么所有nodejs内置模块前面都加了`node:`

在 Node.js 中，模块名可以使用 "模块解析算法"（Module Resolution Algorithm）进行解析。这个算法包括几个步骤，其中一个是从内置模块中查找模块。内置模块是 Node.js 内置的模块，可以直接使用，而不需要安装。
在 Node.js 12 之前，fs/promises 模块还没有被纳入 Node.js 内置模块中。如果直接使用如 import fsp from 'fs/promises' 这样的语法，Node.js 12 及以下版本中的模块解析算法会将它解析为一个外部模块，而不是内置模块。因此，在 Node.js 12 及以下版本中，这个语法会导致模块解析失败，进而导致运行时错误。
为了兼容 Node.js 12 及以下版本，可以使用如 node:fs/promises 这种语法来指定模块名。这样，模块解析算法就会将其解析为一个内置模块，即使在 Node.js 12 及以下版本中也能正常使用。

## readModifiedFile函数

这是一个异步函数 readModifiedFile，其作用是读取指定文件的内容并返回一个 Promise。

函数首先使用 Node.js 的 fsp.readFile 方法读取文件内容，如果文件内容为空，则表示可能在读取时太早了，因此需要等待一段时间，以便文件在磁盘上真正地修改完毕。为了达到这个目的，该函数会启动一个简单的轮询机制，定期检查文件的修改时间，直到文件的修改时间发生变化或者超过了 10 次检查，就会停止轮询并返回一个空字符串。

如果文件内容不为空，则表示文件已经完全更新，直接返回文件内容。

```js
// vitejs/vite#610 when hot-reloading Vue files, we read immediately on file
// change event and sometimes this can be too early and get an empty buffer.
// Poll until the file's modified time has changed before reading again.
// 在 hot-reloading Vue 文件时，我们会立即读取文件变化事件，有时这可能太早了，导致读取到空缓冲区。因此，我们需要在再次读取之前轮询文件的修改时间是否已更改。
async function readModifiedFile(file: string): Promise<string> {
  const content = await fsp.readFile(file, 'utf-8')
  if (!content) {
    const mtime = (await fsp.stat(file)).mtimeMs
    await new Promise((r) => {
      let n = 0
      const poll = async () => {
        n++
        const newMtime = (await fsp.stat(file)).mtimeMs
        if (newMtime !== mtime || n > 10) {
          r(0)
        } else {
          setTimeout(poll, 10)
        }
      }
      setTimeout(poll, 10)
    })
    return await fsp.readFile(file, 'utf-8')
  } else {
    return content
  }
}
```

## 获取指定文件的修改时间

```js
const mtime = (await fsp.stat(file)).mtimeMs
```

使用了 fs/promises 模块中的 stat() 方法来获取文件的 stats 对象，然后从中取出 mtimeMs 属性，即文件的修改时间（以毫秒为单位），供后续轮询检查文件的修改时间发生变化

## 这段代码轮询十次也就是100毫秒，为什么这样设计？

```js
await new Promise((r) => {
      let n = 0
      const poll = async () => {
        n++
        const newMtime = (await fsp.stat(file)).mtimeMs
        if (newMtime !== mtime || n > 10) {
          r(0)
        } else {
          setTimeout(poll, 10)
        }
      }
      setTimeout(poll, 10)
    })
```

这种设计可以避免过于频繁的文件读取，同时又可以在文件更新后立即读取最新的文件内容。如果没有这个轮询的等待，可能会导致读取到旧的、缓存的文件内容，因为文件系统的更新可能会有一定的延迟。同时，如果轮询时间过长，会导致文件更新后无法立即获取最新内容，影响程序的正确性。因此，轮询时间需要在保证及时获取最新内容的同时，尽量减少不必要的文件读取操作。在这段代码中，轮询间隔是10毫秒，轮询10次即总共等待100毫秒，这个时间可以根据具体应用场景的需要进行调整。

###  这里的r(0)有啥用?

 将 Promise 的状态从等待中变为已完成（fulfilled），同时将结果值设置为 0。

### 直接r()不行吗?

可以的，r()和r(undefined)的效果是一样的。在这个函数中，r(0)只是为了返回一个假值，以便后续代码可以判断是否需要重新读取文件内容。如果r()或r(undefined)会更清晰明了，也可以这么写。

## error

```ts
function error(pos: number) {
  const err = new Error(
    `import.meta.hot.accept() can only accept string literals or an ` +
      `Array of string literals.`,
  ) as RollupError
  err.pos = pos
  throw err
}
```

`error`函数，它接受一个类型为`number`的`pos`参数。该函数抛出一个错误，具体是一个`RollupError`，并附带一个自定义的错误消息。

错误消息指出`import.meta.hot.accept()`函数只能接受字符串字面量或字符串字面量的数组。这段代码似乎是用于Rollup.js打包工具，它在`import.meta`对象上提供了一个`hot`对象，用于启用热模块替换。

`pos`参数用于存储错误发生的位置。
