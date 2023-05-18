#  `src/node/watch.ts`

## 完整代码

```ts
import glob from 'fast-glob'
import type { WatchOptions } from 'dep-types/chokidar'
import type { ResolvedConfig } from '.'

export function resolveChokidarOptions(
  config: ResolvedConfig,
  options: WatchOptions | undefined,
): WatchOptions {
  const { ignored = [], ...otherOptions } = options ?? {}

  const resolvedWatchOptions: WatchOptions = {
    ignored: [
      '**/.git/**',
      '**/node_modules/**',
      '**/test-results/**', // Playwright
      glob.escapePath(config.cacheDir) + '/**',
      ...(Array.isArray(ignored) ? ignored : [ignored]),
    ],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...otherOptions,
  }

  return resolvedWatchOptions
}
```

从这里看，vite是使用`chokidar`这个库做文件监听的，这里是编写了一个`resolvedWatchOptions`函数解析和合并`chokidar`的配置选项

## 解析和合并`chokidar`的选项对象

```ts
export function resolveChokidarOptions(
  config: ResolvedConfig,
  options: WatchOptions | undefined,
): WatchOptions {
  ...
}
```

该函数接受两个参数：`config`和`options`。函数的目的是解析和合并`chokidar`的选项对象，返回一个新的选项对象。

这个函数在`src/node/server/index.ts`中被调用，具体内容请查看`server/index.md`

## 导出配置项 `options` 中的 `ignored` 与其他属性

```ts
 const { ignored = [], ...otherOptions } = options ?? {}
```

这段代码使用 JavaScript 中的解构赋值语法。它的作用是从 `options` 对象中提取属性值并将其赋给新的变量

1. 使用空值合并运算符(`??`)来确保如果`options`为`undefined`或`null`，则`options ?? {}`的结果是一个空对象`{}`，以避免出现解构赋值的错误

   ```js
   let { ...z } = null; // 运行时错误
   let { ...z } = undefined; // 运行时错误
   ```

2. 在解构赋值过程中，如果被解构的对象的属性不存在或值为`undefined`，则对应的变量将被赋予默认值，因此`ignored = []`表达式将为`ignored`变量提供默认值。这意味着在缺少`ignored`属性或其值为`undefined`的情况下，`ignored`将被赋予一个空数组`[]`。

3. `...otherOptions`的语法是对象展开运算符的一种应用，它可以用于将一个对象中的所有属性展开到另一个对象中。具体来说，它的作用是将`options`对象中除了`ignored`属性之外的所有属性展开，并将它们合并到一个新的对象中。

   ```js
   let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
   x // 1
   y // 2
   z // { a: 3, b: 4 }
   ```
   
4. 解构赋值、对象展开运算符的学习可以查看[阮一峰es6教程](https://www.bookstack.cn/read/es6-3rd/spilt.6.docs-object.md)

## 生成一个完整的chokidar选项对象

```ts
  const resolvedWatchOptions: WatchOptions = {
    ignored: [
      '**/.git/**',
      '**/node_modules/**',
      '**/test-results/**', // Playwright
      glob.escapePath(config.cacheDir) + '/**',
      ...(Array.isArray(ignored) ? ignored : [ignored]),
    ],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    ...otherOptions,
  }
```

- `ignored`属性是一个数组，包含了要忽略的文件/目录的匹配模式。默认情况下，包括`.git`目录、`node_modules`目录、`test-results`目录、以及通过`glob.escapePath`函数对`config.cacheDir`进行转义后的路径，最后再根据`ignored`参数的类型进行合并。
- `ignoreInitial`属性被设置为`true`，表示初始扫描时忽略文件变化事件。
- `ignorePermissionErrors`属性被设置为`true`，表示忽略权限错误。

1. 使用对象展开运算符(`...`)将`otherOptions`中的属性合并到`resolvedWatchOptions`对象中。
2. 返回最终的`resolvedWatchOptions`对象作为函数的结果。

简而言之，这段代码用于根据传入的`options`参数和默认的忽略规则，生成一个完整的Chokidar选项对象，并将其返回。