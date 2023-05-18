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

## 使用动态导入的方式加载`source-map-support`库

```js
if (!import.meta.url.includes('node_modules')) {
  try {
    // only available as dev dependency
    await import('source-map-support').then((r) => r.default.install())
  } catch (e) {}
}
```

这段代码的意图是在非`node_modules`模块中尝试加载`source-map-support`库，并调用其 `install()` 方法，以提供源映射支持。用于开发环境中，方便调试和定位错误。如果加载或调用过程中发生错误，将会被捕获并忽略。

1. `import.meta.url` 是一个元数据对象，提供了有关当前模块的信息。`import.meta.url` 返回当前模块的 URL 地址。
2. `import.meta.url.includes('node_modules')` 表达式判断当前模块的 URL 是否包含字符串 'node_modules'。如果返回值为 `false`，表示当前模块不是来自于 `node_modules` 目录，即非第三方模块。
3. `await import('source-map-support').then((r) => r.default.install())` 使用动态导入的方式加载名为 'source-map-support' 的模块，并调用该模块的 `install()` 方法。这段代码用于开发环境中，安装源映射支持，以便在调试时能够查看源代码而不是压缩后的代码。

