# `packages/vite/bin/vite.js`

## 完整代码

```ts
#!/usr/bin/env node
import { performance } from 'node:perf_hooks'

if (!import.meta.url.includes('node_modules')) {
  try {
    // only available as dev dependency
    await import('source-map-support').then((r) => r.default.install())
  } catch (e) {}
}

global.__vite_start_time = performance.now()

// check debug mode first before requiring the CLI.
const debugIndex = process.argv.findIndex((arg) => /^(?:-d|--debug)$/.test(arg))
const filterIndex = process.argv.findIndex((arg) =>
  /^(?:-f|--filter)$/.test(arg),
)
const profileIndex = process.argv.indexOf('--profile')

if (debugIndex > 0) {
  let value = process.argv[debugIndex + 1]
  if (!value || value.startsWith('-')) {
    value = 'vite:*'
  } else {
    // support debugging multiple flags with comma-separated list
    value = value
      .split(',')
      .map((v) => `vite:${v}`)
      .join(',')
  }
  process.env.DEBUG = `${
    process.env.DEBUG ? process.env.DEBUG + ',' : ''
  }${value}`

  if (filterIndex > 0) {
    const filter = process.argv[filterIndex + 1]
    if (filter && !filter.startsWith('-')) {
      process.env.VITE_DEBUG_FILTER = filter
    }
  }
}

function start() {
  return import('../dist/node/cli.js')
}

if (profileIndex > 0) {
  process.argv.splice(profileIndex, 1)
  const next = process.argv[profileIndex]
  if (next && !next.startsWith('-')) {
    process.argv.splice(profileIndex, 1)
  }
  const inspector = await import('node:inspector').then((r) => r.default)
  const session = (global.__vite_profile_session = new inspector.Session())
  session.connect()
  session.post('Profiler.enable', () => {
    session.post('Profiler.start', start)
  })
} else {
  start()
}
```

## node:perf_hooks

```ts
import { performance } from 'node:perf_hooks'
...
global.__vite_start_time = performance.now()
```

在 Node.js 环境中使用 `perf_hooks` 模块，提供了一组用于测量性能的工具，其中 `performance` 对象是其中一个重要的对象，用于获取高精度的时间戳和测量性能的指标。

通过 `performance.now()` 方法获取当前的高精度时间戳，返回从性能计时器的起点（通常是脚本开始执行的时间）到当前时间的毫秒数，并将其保存在全局变量 `__vite_start_time` 中，以便后续在代码中使用这个起始时间点进行性能分析和计算时间差等操作。

## 使用动态导入的方式加载`source-map-support`库

```js
if (!import.meta.url.includes('node_modules')) {
  try {
    // only available as dev dependency
    await import('source-map-support').then((r) => r.default.install())
  } catch (e) {}
}
```

这段代码的意图是在非`node_modules`模块中尝试使用动态导入的方式加载`source-map-support`库，并调用其 `install()` 方法，以提供源映射支持。

用于开发环境中方便调试和定位错误。如果加载或调用过程中发生错误，将会被捕获并忽略。

1. `import.meta.url` 是一个元数据对象，提供了有关当前模块的信息。`import.meta.url` 返回当前模块的 URL 地址。
2. `import.meta.url.includes('node_modules')` 表达式判断当前模块的 URL 是否包含字符串`'node_modules'`。如果返回值为 `false`，表示当前模块不是来自于 `node_modules` 目录，即非第三方模块。
3. `await import('source-map-support').then((r) => r.default.install())` 使用动态导入的方式加载名为 `source-map-support`的模块，当 `source-map-support` 模块加载完成后，`.then()` 方法会被调用，并接收加载的模块作为参数。在这里，使用箭头函数 `(r) => r.default.install()`，其中 `r` 是加载的模块对象。`r.default` 是模块的默认导出对象，而 `.install()` 是 `source-map-support` 模块的一个方法。

## 启用性能分析器（Profiler）

```ts
const profileIndex = process.argv.indexOf('--profile')
...
function start() {
  return import('../dist/node/cli.js')
}

if (profileIndex > 0) {
  process.argv.splice(profileIndex, 1)
  const next = process.argv[profileIndex]
  if (next && !next.startsWith('-')) {
    process.argv.splice(profileIndex, 1)
  }
  const inspector = await import('node:inspector').then((r) => r.default)
  const session = (global.__vite_profile_session = new inspector.Session())
  session.connect()
  session.post('Profiler.enable', () => {
    session.post('Profiler.start', start)
  })
} else {
  start()
}
```

1. `process.argv`是一个包含命令行参数的数组。数组的第一个元素是 Node.js 的可执行文件路径，后续元素是命令行传递的参数。`.splice(profileIndex, 1)`是一个数组方法，用于修改数组，`profileIndex` 是要移除的元素的起始索引，而 `1` 表示从该索引开始，要移除的元素数量。因此，`process.argv.splice(profileIndex, 1)` 表示从 `process.argv` 数组中移除位于 `profileIndex` 索引处的一个元素，即删除命令行参数中的 `--profile` 参数。

2. 因为上一步移除位于 `profileIndex` 索引处的一个元素，所以`const next = process.argv[profileIndex]`的元素是之前元素的下一个元素，即 `--profile` 参数的下一个参数

3. `if (next && !next.startsWith('-')) { ... }`：这行代码检查变量 `next` 是否存在且不以 `-` 开头。如果 `next` 存在且不以 `-` 开头，表示它是一个非选项参数，可能是与 `--profile` 相关的值。在这种情况下，需要将它从命令行参数中移除，以避免影响后续的命令行处理。

4. `await import('node:inspector').then((r) => r.default)`表示使用动态导入加载 `node:inspector` 模块，并调用其 `default` 属性得到模块的默认导出对象。

5. `session = (global.__vite_profile_session = new inspector.Session())`这行代码使用了链式赋值语法，这种链式赋值语法可以在一行代码中同时进行多个赋值操作，提供了简洁的语法形式：将 `new inspector.Session()` 的返回值赋给了变量 `session`，也赋给了全局变量 `global.__vite_profile_session`。

   通过这段代码，实现了两个操作：

   - 创建了一个新的 `inspector.Session` 实例。
   - 将该实例赋值给变量 `session`，同时也将其赋值给全局变量 `global.__vite_profile_session`。

   `node:inspector` 模块是一个内置的调试工具，用于在Node.js应用程序中进行调试和分析。它提供了一个交互式的调试环境，允许开发人员检查代码的执行过程、变量的值以及执行上下文中的任何其他细节。
   
   `node:inspector` 模块通过启用调试协议与Chrome开发者工具通信。它允许开发人员使用Chrome浏览器作为调试客户端，以可视化方式查看和控制Node.js应用程序的执行。
   
   `node:inspector` 模块具有以下功能：
   
   1. 断点调试：开发人员可以在代码中设置断点，以便在特定位置停止执行，并检查程序的状态。可以设置条件断点，只有在满足特定条件时才会触发断点。
   2. 单步执行：开发人员可以逐行执行代码，并观察每一步的结果。这对于理解代码的执行流程以及调试特定问题非常有用。
   3. 变量查看：在调试过程中，可以查看当前执行上下文中的变量的值。这使开发人员能够了解代码在执行时变量的状态，并识别潜在的问题。
   4. 代码评估：可以在调试环境中执行任意的JavaScript代码片段，以便观察其结果。这对于验证假设或调试特定表达式非常有用。
   5. 异步调试：Node.js Inspector支持异步代码的调试，包括异步函数和Promise。开发人员可以在异步调用之间设置断点，并检查它们的执行顺序和结果。
   
   使用`node:inspector` 进行调试时，开发人员可以使用Chrome开发者工具的界面来查看调试信息，并与调试器进行交互。这提供了一个强大的工具来诊断和解决Node.js应用程序中的问题。
   
6. 通过调用`session.connect()`方法，连接到调试器，与Chrome开发者工具建立通信通道。然后，使用`session.post()`方法发送命令给调试器。首先发送`'Profiler.enable'`命令以启用性能分析器。一旦性能分析器被启用，通过再次调用`session.post()`方法，发送`'Profiler.start'`命令，并传递一个名为`start`的回调函数作为参数。这个回调函数将在性能分析器开始记录之后执行。

















