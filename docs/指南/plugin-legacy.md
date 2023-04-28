## loadBabel

```ts
// lazy load babel since it's not used during dev
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let babel: typeof import('@babel/core') | undefined
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core')
  }
  return babel
}
```

1. 定义了一个变量 `babel`，类型为 `typeof import('@babel/core') | undefined`。
2. 类型注释 `typeof import('@babel/core')` 表示变量 `babel` 的类型与 `@babel/core` 模块的类型相同。它告诉 TypeScript 编译器，`babel` 变量在加载 `@babel/core` 模块之后将包含该模块的类型信息。这个类型注释通常称为“导入类型”。
3. `| undefined` 表示 `babel` 变量可能是 `undefined`。这意味着在 `babel` 变量被赋值之前，它将始终为 `undefined`。因为在加载 `@babel/core` 模块之前，我们不知道 `babel` 变量的类型，因此需要将其初始化为 `undefined`。这个类型注释通常称为“可选类型”。
4. 开发期间不需要使用 `babel`，因此可以进行懒加载。由于 `babel` 在此期间未使用，因此可以延迟加载以提高性能。需要时再异步加载 `@babel/core` 模块并将其赋值给变量 `babel`。
5. 函数 `loadBabel()`，用于加载 `babel` 模块。如果 `babel` 变量尚未定义，则调用 `import('@babel/core')` 异步加载 `@babel/core` 模块并将其赋值给 `babel`。该函数返回 `babel` 变量。
6. 函数返回值是一个 `Promise` 对象，因为 `import()` 返回一个 `Promise` 对象，可以使用 `await` 等待模块加载完成。如果模块已经加载完成，则不需要等待，函数立即返回缓存的 `babel` 变量。