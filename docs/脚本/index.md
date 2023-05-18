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

在 Node.js 环境中使用 `perf_hooks` 模块，通过 `performance.now()` 方法获取当前时间戳，并将其保存在全局变量 `__vite_start_time` 中，以便后续在代码中使用这个起始时间点进行性能分析和计算时间差等操作。

1. `import { performance } from 'node:perf_hooks'` 用于从 Node.js 的内置模块 `perf_hooks` 中导入 `performance` 对象。`perf_hooks` 模块提供了一组用于测量性能的工具，其中 `performance` 对象是其中一个重要的对象，用于获取高精度的时间戳和测量性能的指标。
2. `global.__vite_start_time = performance.now()` 使用 `performance.now()` 方法获取当前的高精度时间戳，并将其赋值给全局变量 `__vite_start_time`。`performance.now()` 返回从性能计时器的起点（通常是脚本开始执行的时间）到当前时间的毫秒数。

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

## profile

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

1. `process.argv`是一个包含命令行参数的数组。数组的第一个元素是 Node.js 的可执行文件路径，后续元素是命令行传递的参数。`.splice(profileIndex, 1)`是一个数组方法，用于修改数组。`profileIndex` 是要移除的元素的起始索引，而 `1` 表示从该索引开始，要移除的元素数量。因此，`process.argv.splice(profileIndex, 1)` 表示从 `process.argv` 数组中移除位于 `profileIndex` 索引处的一个元素，即删除命令行参数中的 `--profile` 参数。





通过执行 `process.argv.splice(profileIndex, 1)`，将会移除 `process.argv` 数组中的指定元素，即删除命令行参数中的 `--profile` 参数。该操作会修改原始数组 `process.argv`。

