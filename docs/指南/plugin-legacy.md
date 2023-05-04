# @vitejs/plugin-legacy

## src/index.ts完整代码

vite-plugin-legacy核心代码其实也就八百多行

```ts
/* eslint-disable n/no-extraneous-import */
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build, normalizePath } from 'vite'
import MagicString from 'magic-string'
import type {
  BuildOptions,
  HtmlTagDescriptor,
  Plugin,
  ResolvedConfig,
} from 'vite'
import type {
  NormalizedOutputOptions,
  OutputBundle,
  OutputOptions,
  PreRenderedChunk,
  RenderedChunk,
} from 'rollup'
import type {
  PluginItem as BabelPlugin,
  types as BabelTypes,
} from '@babel/core'
import colors from 'picocolors'
import browserslist from 'browserslist'
import type { Options } from './types'
import {
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
  legacyEntryId,
  legacyPolyfillId,
  modernChunkLegacyGuard,
  safari10NoModuleFix,
  systemJSInlineCode,
} from './snippets'

// lazy load babel since it's not used during dev
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let babel: typeof import('@babel/core') | undefined
async function loadBabel() {
  if (!babel) {
    babel = await import('@babel/core')
  }
  return babel
}

// The requested module 'browserslist' is a CommonJS module
// which may not support all module.exports as named exports
const { loadConfig: browserslistLoadConfig } = browserslist

// Duplicated from build.ts in Vite Core, at least while the feature is experimental
// We should later expose this helper for other plugins to use
function toOutputFilePathInHtml(
  filename: string,
  type: 'asset' | 'public',
  hostId: string,
  hostType: 'js' | 'css' | 'html',
  config: ResolvedConfig,
  toRelative: (filename: string, importer: string) => string,
): string {
  const { renderBuiltUrl } = config.experimental
  let relative = config.base === '' || config.base === './'
  if (renderBuiltUrl) {
    const result = renderBuiltUrl(filename, {
      hostId,
      hostType,
      type,
      ssr: !!config.build.ssr,
    })
    if (typeof result === 'object') {
      if (result.runtime) {
        throw new Error(
          `{ runtime: "${result.runtime}" } is not supported for assets in ${hostType} files: ${filename}`,
        )
      }
      if (typeof result.relative === 'boolean') {
        relative = result.relative
      }
    } else if (result) {
      return result
    }
  }
  if (relative && !config.build.ssr) {
    return toRelative(filename, hostId)
  } else {
    return config.base + filename
  }
}
function getBaseInHTML(urlRelativePath: string, config: ResolvedConfig) {
  // Prefer explicit URL if defined for linking to assets and public files from HTML,
  // even when base relative is specified
  return config.base === './' || config.base === ''
    ? path.posix.join(
        path.posix.relative(urlRelativePath, '').slice(0, -2),
        './',
      )
    : config.base
}

function toAssetPathFromHtml(
  filename: string,
  htmlPath: string,
  config: ResolvedConfig,
): string {
  const relativeUrlPath = normalizePath(path.relative(config.root, htmlPath))
  const toRelative = (filename: string, hostId: string) =>
    getBaseInHTML(relativeUrlPath, config) + filename
  return toOutputFilePathInHtml(
    filename,
    'asset',
    htmlPath,
    'html',
    config,
    toRelative,
  )
}

const legacyEnvVarMarker = `__VITE_IS_LEGACY__`

const _require = createRequire(import.meta.url)

function viteLegacyPlugin(options: Options = {}): Plugin[] {
  let config: ResolvedConfig
  let targets: Options['targets']

  const genLegacy = options.renderLegacyChunks !== false

  const debugFlags = (process.env.DEBUG || '').split(',')
  const isDebug =
    debugFlags.includes('vite:*') || debugFlags.includes('vite:legacy')

  const facadeToLegacyChunkMap = new Map()
  const facadeToLegacyPolyfillMap = new Map()
  const facadeToModernPolyfillMap = new Map()
  const modernPolyfills = new Set<string>()
  const legacyPolyfills = new Set<string>()

  if (Array.isArray(options.modernPolyfills)) {
    options.modernPolyfills.forEach((i) => {
      modernPolyfills.add(
        i.includes('/') ? `core-js/${i}` : `core-js/modules/${i}.js`,
      )
    })
  }
  if (Array.isArray(options.polyfills)) {
    options.polyfills.forEach((i) => {
      if (i.startsWith(`regenerator`)) {
        legacyPolyfills.add(`regenerator-runtime/runtime.js`)
      } else {
        legacyPolyfills.add(
          i.includes('/') ? `core-js/${i}` : `core-js/modules/${i}.js`,
        )
      }
    })
  }
  if (Array.isArray(options.additionalLegacyPolyfills)) {
    options.additionalLegacyPolyfills.forEach((i) => {
      legacyPolyfills.add(i)
    })
  }

  let overriddenBuildTarget = false
  const legacyConfigPlugin: Plugin = {
    name: 'vite:legacy-config',

    config(config, env) {
      if (env.command === 'build' && !config.build?.ssr) {
        if (!config.build) {
          config.build = {}
        }

        if (!config.build.cssTarget) {
          // Hint for esbuild that we are targeting legacy browsers when minifying CSS.
          // Full CSS compat table available at https://github.com/evanw/esbuild/blob/78e04680228cf989bdd7d471e02bbc2c8d345dc9/internal/compat/css_table.go
          // But note that only the `HexRGBA` feature affects the minify outcome.
          // HSL & rebeccapurple values will be minified away regardless the target.
          // So targeting `chrome61` suffices to fix the compatibility issue.
          config.build.cssTarget = 'chrome61'
        }

        if (genLegacy) {
          // Vite's default target browsers are **not** the same.
          // See https://github.com/vitejs/vite/pull/10052#issuecomment-1242076461
          overriddenBuildTarget = config.build.target !== undefined
          // browsers supporting ESM + dynamic import + import.meta + async generator
          config.build.target = [
            'es2020',
            'edge79',
            'firefox67',
            'chrome64',
            'safari12',
          ]
        }
      }

      return {
        define: {
          'import.meta.env.LEGACY':
            env.command === 'serve' || config.build?.ssr
              ? false
              : legacyEnvVarMarker,
        },
      }
    },
    configResolved(config) {
      if (overriddenBuildTarget) {
        config.logger.warn(
          colors.yellow(
            `plugin-legacy overrode 'build.target'. You should pass 'targets' as an option to this plugin with the list of legacy browsers to support instead.`,
          ),
        )
      }
    },
  }

  const legacyGenerateBundlePlugin: Plugin = {
    name: 'vite:legacy-generate-polyfill-chunk',
    apply: 'build',

    async generateBundle(opts, bundle) {
      if (config.build.ssr) {
        return
      }

      if (!isLegacyBundle(bundle, opts)) {
        if (!modernPolyfills.size) {
          return
        }
        isDebug &&
          console.log(
            `[@vitejs/plugin-legacy] modern polyfills:`,
            modernPolyfills,
          )
        await buildPolyfillChunk(
          config.mode,
          modernPolyfills,
          bundle,
          facadeToModernPolyfillMap,
          config.build,
          'es',
          opts,
          true,
        )
        return
      }

      if (!genLegacy) {
        return
      }

      // legacy bundle
      if (legacyPolyfills.size) {
        // check if the target needs Promise polyfill because SystemJS relies on it
        // https://github.com/systemjs/systemjs#ie11-support
        await detectPolyfills(
          `Promise.resolve(); Promise.all();`,
          targets,
          legacyPolyfills,
        )

        isDebug &&
          console.log(
            `[@vitejs/plugin-legacy] legacy polyfills:`,
            legacyPolyfills,
          )

        await buildPolyfillChunk(
          config.mode,
          legacyPolyfills,
          bundle,
          facadeToLegacyPolyfillMap,
          // force using terser for legacy polyfill minification, since esbuild
          // isn't legacy-safe
          config.build,
          'iife',
          opts,
          options.externalSystemJS,
        )
      }
    },
  }

  const legacyPostPlugin: Plugin = {
    name: 'vite:legacy-post-process',
    enforce: 'post',
    apply: 'build',

    configResolved(_config) {
      if (_config.build.lib) {
        throw new Error('@vitejs/plugin-legacy does not support library mode.')
      }
      config = _config

      if (!genLegacy || config.build.ssr) {
        return
      }

      targets =
        options.targets ||
        browserslistLoadConfig({ path: config.root }) ||
        'last 2 versions and not dead, > 0.3%, Firefox ESR'
      isDebug && console.log(`[@vitejs/plugin-legacy] targets:`, targets)

      const getLegacyOutputFileName = (
        fileNames:
          | string
          | ((chunkInfo: PreRenderedChunk) => string)
          | undefined,
        defaultFileName = '[name]-legacy-[hash].js',
      ): string | ((chunkInfo: PreRenderedChunk) => string) => {
        if (!fileNames) {
          return path.posix.join(config.build.assetsDir, defaultFileName)
        }

        return (chunkInfo) => {
          let fileName =
            typeof fileNames === 'function' ? fileNames(chunkInfo) : fileNames

          if (fileName.includes('[name]')) {
            // [name]-[hash].[format] -> [name]-legacy-[hash].[format]
            fileName = fileName.replace('[name]', '[name]-legacy')
          } else {
            // entry.js -> entry-legacy.js
            fileName = fileName.replace(/(.+)\.(.+)/, '$1-legacy.$2')
          }

          return fileName
        }
      }

      const createLegacyOutput = (
        options: OutputOptions = {},
      ): OutputOptions => {
        return {
          ...options,
          format: 'system',
          entryFileNames: getLegacyOutputFileName(options.entryFileNames),
          chunkFileNames: getLegacyOutputFileName(options.chunkFileNames),
        }
      }

      const { rollupOptions } = config.build
      const { output } = rollupOptions
      if (Array.isArray(output)) {
        rollupOptions.output = [...output.map(createLegacyOutput), ...output]
      } else {
        rollupOptions.output = [createLegacyOutput(output), output || {}]
      }
    },

    async renderChunk(raw, chunk, opts) {
      if (config.build.ssr) {
        return null
      }

      if (!isLegacyChunk(chunk, opts)) {
        if (
          options.modernPolyfills &&
          !Array.isArray(options.modernPolyfills)
        ) {
          // analyze and record modern polyfills
          await detectPolyfills(raw, { esmodules: true }, modernPolyfills)
        }

        const ms = new MagicString(raw)

        if (genLegacy && chunk.isEntry) {
          // append this code to avoid modern chunks running on legacy targeted browsers
          ms.prepend(modernChunkLegacyGuard)
        }

        if (raw.includes(legacyEnvVarMarker)) {
          const re = new RegExp(legacyEnvVarMarker, 'g')
          let match
          while ((match = re.exec(raw))) {
            ms.overwrite(
              match.index,
              match.index + legacyEnvVarMarker.length,
              `false`,
            )
          }
        }

        if (config.build.sourcemap) {
          return {
            code: ms.toString(),
            map: ms.generateMap({ hires: true }),
          }
        }
        return {
          code: ms.toString(),
        }
      }

      if (!genLegacy) {
        return null
      }

      // @ts-expect-error avoid esbuild transform on legacy chunks since it produces
      // legacy-unsafe code - e.g. rewriting object properties into shorthands
      opts.__vite_skip_esbuild__ = true

      // @ts-expect-error force terser for legacy chunks. This only takes effect if
      // minification isn't disabled, because that leaves out the terser plugin
      // entirely.
      opts.__vite_force_terser__ = true

      // @ts-expect-error In the `generateBundle` hook,
      // we'll delete the assets from the legacy bundle to avoid emitting duplicate assets.
      // But that's still a waste of computing resource.
      // So we add this flag to avoid emitting the asset in the first place whenever possible.
      opts.__vite_skip_asset_emit__ = true

      // avoid emitting assets for legacy bundle
      const needPolyfills =
        options.polyfills !== false && !Array.isArray(options.polyfills)

      // transform the legacy chunk with @babel/preset-env
      const sourceMaps = !!config.build.sourcemap
      const babel = await loadBabel()
      const result = babel.transform(raw, {
        babelrc: false,
        configFile: false,
        compact: !!config.build.minify,
        sourceMaps,
        inputSourceMap: undefined, // sourceMaps ? chunk.map : undefined, `.map` TODO: moved to OutputChunk?
        presets: [
          // forcing our plugin to run before preset-env by wrapping it in a
          // preset so we can catch the injected import statements...
          [
            () => ({
              plugins: [
                recordAndRemovePolyfillBabelPlugin(legacyPolyfills),
                replaceLegacyEnvBabelPlugin(),
                wrapIIFEBabelPlugin(),
              ],
            }),
          ],
          [
            (await import('@babel/preset-env')).default,
            createBabelPresetEnvOptions(targets, {
              needPolyfills,
              ignoreBrowserslistConfig: options.ignoreBrowserslistConfig,
            }),
          ],
        ],
      })

      if (result) return { code: result.code!, map: result.map }
      return null
    },

    transformIndexHtml(html, { chunk }) {
      if (config.build.ssr) return
      if (!chunk) return
      if (chunk.fileName.includes('-legacy')) {
        // The legacy bundle is built first, and its index.html isn't actually
        // emitted. Here we simply record its corresponding legacy chunk.
        facadeToLegacyChunkMap.set(chunk.facadeModuleId, chunk.fileName)
        return
      }

      const tags: HtmlTagDescriptor[] = []
      const htmlFilename = chunk.facadeModuleId?.replace(/\?.*$/, '')

      // 1. inject modern polyfills
      const modernPolyfillFilename = facadeToModernPolyfillMap.get(
        chunk.facadeModuleId,
      )

      if (modernPolyfillFilename) {
        tags.push({
          tag: 'script',
          attrs: {
            type: 'module',
            crossorigin: true,
            src: toAssetPathFromHtml(
              modernPolyfillFilename,
              chunk.facadeModuleId!,
              config,
            ),
          },
        })
      } else if (modernPolyfills.size) {
        throw new Error(
          `No corresponding modern polyfill chunk found for ${htmlFilename}`,
        )
      }

      if (!genLegacy) {
        return { html, tags }
      }

      // 2. inject Safari 10 nomodule fix
      tags.push({
        tag: 'script',
        attrs: { nomodule: true },
        children: safari10NoModuleFix,
        injectTo: 'body',
      })

      // 3. inject legacy polyfills
      const legacyPolyfillFilename = facadeToLegacyPolyfillMap.get(
        chunk.facadeModuleId,
      )
      if (legacyPolyfillFilename) {
        tags.push({
          tag: 'script',
          attrs: {
            nomodule: true,
            crossorigin: true,
            id: legacyPolyfillId,
            src: toAssetPathFromHtml(
              legacyPolyfillFilename,
              chunk.facadeModuleId!,
              config,
            ),
          },
          injectTo: 'body',
        })
      } else if (legacyPolyfills.size) {
        throw new Error(
          `No corresponding legacy polyfill chunk found for ${htmlFilename}`,
        )
      }

      // 4. inject legacy entry
      const legacyEntryFilename = facadeToLegacyChunkMap.get(
        chunk.facadeModuleId,
      )
      if (legacyEntryFilename) {
        // `assets/foo.js` means importing "named register" in SystemJS
        tags.push({
          tag: 'script',
          attrs: {
            nomodule: true,
            crossorigin: true,
            // we set the entry path on the element as an attribute so that the
            // script content will stay consistent - which allows using a constant
            // hash value for CSP.
            id: legacyEntryId,
            'data-src': toAssetPathFromHtml(
              legacyEntryFilename,
              chunk.facadeModuleId!,
              config,
            ),
          },
          children: systemJSInlineCode,
          injectTo: 'body',
        })
      } else {
        throw new Error(
          `No corresponding legacy entry chunk found for ${htmlFilename}`,
        )
      }

      // 5. inject dynamic import fallback entry
      if (genLegacy && legacyPolyfillFilename && legacyEntryFilename) {
        tags.push({
          tag: 'script',
          attrs: { type: 'module' },
          children: detectModernBrowserCode,
          injectTo: 'head',
        })
        tags.push({
          tag: 'script',
          attrs: { type: 'module' },
          children: dynamicFallbackInlineCode,
          injectTo: 'head',
        })
      }

      return {
        html,
        tags,
      }
    },

    generateBundle(opts, bundle) {
      if (config.build.ssr) {
        return
      }

      if (isLegacyBundle(bundle, opts)) {
        // avoid emitting duplicate assets
        for (const name in bundle) {
          if (bundle[name].type === 'asset' && !/.+\.map$/.test(name)) {
            delete bundle[name]
          }
        }
      }
    },
  }

  return [legacyConfigPlugin, legacyGenerateBundlePlugin, legacyPostPlugin]
}

export async function detectPolyfills(
  code: string,
  targets: any,
  list: Set<string>,
): Promise<void> {
  const babel = await loadBabel()
  const result = babel.transform(code, {
    ast: true,
    babelrc: false,
    configFile: false,
    presets: [
      [
        (await import('@babel/preset-env')).default,
        createBabelPresetEnvOptions(targets, {
          ignoreBrowserslistConfig: true,
        }),
      ],
    ],
  })
  for (const node of result!.ast!.program.body) {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value
      if (
        source.startsWith('core-js/') ||
        source.startsWith('regenerator-runtime/')
      ) {
        list.add(source)
      }
    }
  }
}

function createBabelPresetEnvOptions(
  targets: any,
  {
    needPolyfills = true,
    ignoreBrowserslistConfig,
  }: { needPolyfills?: boolean; ignoreBrowserslistConfig?: boolean },
) {
  return {
    targets,
    bugfixes: true,
    loose: false,
    modules: false,
    useBuiltIns: needPolyfills ? 'usage' : false,
    corejs: needPolyfills
      ? {
          version: _require('core-js/package.json').version,
          proposals: false,
        }
      : undefined,
    shippedProposals: true,
    ignoreBrowserslistConfig,
  }
}

async function buildPolyfillChunk(
  mode: string,
  imports: Set<string>,
  bundle: OutputBundle,
  facadeToChunkMap: Map<string, string>,
  buildOptions: BuildOptions,
  format: 'iife' | 'es',
  rollupOutputOptions: NormalizedOutputOptions,
  excludeSystemJS?: boolean,
) {
  let { minify, assetsDir } = buildOptions
  minify = minify ? 'terser' : false
  const res = await build({
    mode,
    // so that everything is resolved from here
    root: path.dirname(fileURLToPath(import.meta.url)),
    configFile: false,
    logLevel: 'error',
    plugins: [polyfillsPlugin(imports, excludeSystemJS)],
    build: {
      write: false,
      minify,
      assetsDir,
      rollupOptions: {
        input: {
          polyfills: polyfillId,
        },
        output: {
          format,
          entryFileNames: rollupOutputOptions.entryFileNames,
        },
      },
    },
    // Don't run esbuild for transpilation or minification
    // because we don't want to transpile code.
    esbuild: false,
    optimizeDeps: {
      esbuildOptions: {
        // If a value above 'es5' is set, esbuild injects helper functions which uses es2015 features.
        // This limits the input code not to include es2015+ codes.
        // But core-js is the only dependency which includes commonjs code
        // and core-js doesn't include es2015+ codes.
        target: 'es5',
      },
    },
  })
  const _polyfillChunk = Array.isArray(res) ? res[0] : res
  if (!('output' in _polyfillChunk)) return
  const polyfillChunk = _polyfillChunk.output[0]

  // associate the polyfill chunk to every entry chunk so that we can retrieve
  // the polyfill filename in index html transform
  for (const key in bundle) {
    const chunk = bundle[key]
    if (chunk.type === 'chunk' && chunk.facadeModuleId) {
      facadeToChunkMap.set(chunk.facadeModuleId, polyfillChunk.fileName)
    }
  }

  // add the chunk to the bundle
  bundle[polyfillChunk.fileName] = polyfillChunk
}

const polyfillId = '\0vite/legacy-polyfills'

function polyfillsPlugin(
  imports: Set<string>,
  excludeSystemJS?: boolean,
): Plugin {
  return {
    name: 'vite:legacy-polyfills',
    resolveId(id) {
      if (id === polyfillId) {
        return id
      }
    },
    load(id) {
      if (id === polyfillId) {
        return (
          [...imports].map((i) => `import ${JSON.stringify(i)};`).join('') +
          (excludeSystemJS ? '' : `import "systemjs/dist/s.min.js";`)
        )
      }
    },
  }
}

function isLegacyChunk(chunk: RenderedChunk, options: NormalizedOutputOptions) {
  return options.format === 'system' && chunk.fileName.includes('-legacy')
}

function isLegacyBundle(
  bundle: OutputBundle,
  options: NormalizedOutputOptions,
) {
  if (options.format === 'system') {
    const entryChunk = Object.values(bundle).find(
      (output) => output.type === 'chunk' && output.isEntry,
    )

    return !!entryChunk && entryChunk.fileName.includes('-legacy')
  }

  return false
}

function recordAndRemovePolyfillBabelPlugin(
  polyfills: Set<string>,
): BabelPlugin {
  return ({ types: t }: { types: typeof BabelTypes }): BabelPlugin => ({
    name: 'vite-remove-polyfill-import',
    post({ path }) {
      path.get('body').forEach((p) => {
        if (t.isImportDeclaration(p.node)) {
          polyfills.add(p.node.source.value)
          p.remove()
        }
      })
    },
  })
}

function replaceLegacyEnvBabelPlugin(): BabelPlugin {
  return ({ types: t }): BabelPlugin => ({
    name: 'vite-replace-env-legacy',
    visitor: {
      Identifier(path) {
        if (path.node.name === legacyEnvVarMarker) {
          path.replaceWith(t.booleanLiteral(true))
        }
      },
    },
  })
}

function wrapIIFEBabelPlugin(): BabelPlugin {
  return ({ types: t, template }): BabelPlugin => {
    const buildIIFE = template(';(function(){%%body%%})();')

    return {
      name: 'vite-wrap-iife',
      post({ path }) {
        if (!this.isWrapped) {
          this.isWrapped = true
          path.replaceWith(t.program(buildIIFE({ body: path.node.body })))
        }
      },
    }
  }
}

export const cspHashes = [
  safari10NoModuleFix,
  systemJSInlineCode,
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
].map((i) => createHash('sha256').update(i).digest('base64'))

export default viteLegacyPlugin
```

## 定义babel变量

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

## 加载browserslist模块

```ts
// The requested module 'browserslist' is a CommonJS module
// which may not support all module.exports as named exports
const { loadConfig: browserslistLoadConfig } = browserslist
```

这段代码中，首先声明了一个常量 `{ loadConfig: browserslistLoadConfig }`，它是从模块 `browserslist` 中加载的。注释提示，`browserslist` 模块是一个 CommonJS 模块，它可能不支持将所有的 `module.exports` 作为具名导出（即通过解构赋值方式导入）。最后一行代码中，将 `browserslist` 模块中的 `loadConfig` 方法导入到 `browserslistLoadConfig` 常量中。

需要注意的是，如果使用的是 ES6 模块系统，那么这段代码可能会出现错误，因为 `browserslist` 模块是一个 CommonJS 模块，需要使用 `require()` 来加载。如果想在 ES6 模块中使用该模块，需要使用工具如 `@rollup/plugin-commonjs` 来进行转换。

## 文件名 `filename` 转换成在 HTML 文件中可以访问到的路径

```ts
// Duplicated from build.ts in Vite Core, at least while the feature is experimental
// We should later expose this helper for other plugins to use
function toOutputFilePathInHtml(
  filename: string,
  type: 'asset' | 'public',
  hostId: string,
  hostType: 'js' | 'css' | 'html',
  config: ResolvedConfig,
  toRelative: (filename: string, importer: string) => string,
): string {
  const { renderBuiltUrl } = config.experimental
  let relative = config.base === '' || config.base === './'
  if (renderBuiltUrl) {
    const result = renderBuiltUrl(filename, {
      hostId,
      hostType,
      type,
      ssr: !!config.build.ssr,
    })
    if (typeof result === 'object') {
      if (result.runtime) {
        throw new Error(
          `{ runtime: "${result.runtime}" } is not supported for assets in ${hostType} files: ${filename}`,
        )
      }
      if (typeof result.relative === 'boolean') {
        relative = result.relative
      }
    } else if (result) {
      return result
    }
  }
  if (relative && !config.build.ssr) {
    return toRelative(filename, hostId)
  } else {
    return config.base + filename
  }
}
```

这段代码是一个函数 `toOutputFilePathInHtml` 的实现，它接受多个参数并返回一个字符串类型的路径。

这个函数的目的是将给定的文件名 `filename` 转换成在 HTML 文件中可以访问到的路径。转换时需要考虑以下几个因素：

- 文件类型 `type`，可以是 `asset` 或 `public`，分别表示静态资源和公共资源。
- 宿主 ID `hostId`，用于确定文件将被插入到哪个 HTML 文件中。
- 宿主类型 `hostType`，可以是 `js`、`css` 或 `html`，分别表示 JavaScript、CSS 和 HTML 文件。
- 配置项 `config`，包含一些 Vite 的配置信息，例如基本路径 `base`、SSR 配置等。
- 路径转换函数 `toRelative`，用于将文件路径转换成相对路径。

如果配置项中启用了 `renderBuiltUrl`，则会使用它来渲染文件路径。`renderBuiltUrl` 是一个实验性功能，可以让用户自定义如何渲染输出路径。如果没有启用 `renderBuiltUrl`，则默认使用 `config.base` 来作为基本路径。

最后，根据 `relative` 和 `config.build.ssr` 的值来决定返回相对路径或者带有基本路径的绝对路径。如果 `config.build.ssr` 为 `true`，则返回带有基本路径的绝对路径，否则返回相对路径。

## 获取在 HTML 文件中正确链接资源文件的基本路径

```ts
function getBaseInHTML(urlRelativePath: string, config: ResolvedConfig) {
  // Prefer explicit URL if defined for linking to assets and public files from HTML,
  // even when base relative is specified
  return config.base === './' || config.base === ''
    ? path.posix.join(
        path.posix.relative(urlRelativePath, '').slice(0, -2),
        './',
      )
    : config.base
}
```

这段代码实现了一个函数 `getBaseInHTML`，用于获取在 HTML 文件中正确链接资源文件的基本路径。

函数接受两个参数，分别为资源文件相对路径 `urlRelativePath` 和 Vite 配置项 `config`。函数首先判断 `config.base` 是否为 `./` 或者空字符串，如果是，则说明用户没有显式指定基本路径，这时函数会根据 `urlRelativePath` 来推断基本路径。

具体来说，函数使用 `path.posix.relative(urlRelativePath, '')` 来获取资源文件相对于项目根目录的相对路径，然后去掉路径中的文件名部分（即最后两个字符 `./`），最终得到的是相对于项目根目录的目录路径。接下来函数使用 `path.posix.join` 方法将相对路径和 `./` 进行拼接，得到正确的基本路径。

如果 `config.base` 不是 `./` 或者空字符串，函数直接返回 `config.base`。

总之，函数的作用是根据资源文件的相对路径和 Vite 配置项来获取正确的基本路径，以便在 HTML 文件中正确地链接资源文件。

## 文件名 `filename` 转换为在 HTML 文件中引用该文件的相对路径

```ts
function toAssetPathFromHtml(
  filename: string,
  htmlPath: string,
  config: ResolvedConfig,
): string {
  const relativeUrlPath = normalizePath(path.relative(config.root, htmlPath))
  const toRelative = (filename: string, hostId: string) =>
    getBaseInHTML(relativeUrlPath, config) + filename
  return toOutputFilePathInHtml(
    filename,
    'asset',
    htmlPath,
    'html',
    config,
    toRelative,
  )
}
```

作用是将文件名 `filename` 转换为在 HTML 文件中引用该文件的相对路径。

具体来说，`toAssetPathFromHtml` 函数的输入参数为 `filename` 和 `htmlPath`，分别表示文件名和引用该文件的 HTML 文件路径。

该函数首先使用 `normalizePath` 函数将 `htmlPath` 标准化为一个统一格式的路径字符串。然后，它通过调用 `getBaseInHTML` 函数获取 HTML 文件的基本路径，基本路径是相对于该文件的引用路径的起始部分。这个基本路径将与 `filename` 结合使用，生成最终的文件路径。为此，该函数使用 `toOutputFilePathInHtml` 函数将 `filename` 转换为输出路径。

在 `toOutputFilePathInHtml` 函数中，通过 `type` 参数和其他信息确定了输出文件的类型和生成方式，然后使用 `toRelative` 函数将 `filename` 转换为相对路径。最后，将相对路径与基本路径组合起来，形成最终的文件路径。

## 判断chunk是否是Legacy格式

```ts
function isLegacyChunk(chunk: RenderedChunk, options: NormalizedOutputOptions) {
  return options.format === 'system' && chunk.fileName.includes('-legacy')
}
```

这段代码是一个用于判断是否为 legacy chunk 的函数。函数接收两个参数：一个 RenderedChunk 对象和一个经过规范化后的输出选项对象 options。

函数返回值为一个布尔值，如果 options.format 为 'system' 并且 chunk.fileName 包含 '-legacy' 字符串，则返回 true，否则返回 false。

因此，可以根据该函数判断当前 chunk 是否为 legacy chunk。

## 判断Bundle入口是否是Legacy格式

```ts
function isLegacyBundle(
  bundle: OutputBundle,
  options: NormalizedOutputOptions,
) {
  if (options.format === 'system') {
    const entryChunk = Object.values(bundle).find(
      (output) => output.type === 'chunk' && output.isEntry,
    )
    return !!entryChunk && entryChunk.fileName.includes('-legacy')
  }
  return false
}
```


这个函数的作用是判断Bundle入口是否是Legacy格式

在 Vite 构建系统中，当我们需要为较老的浏览器（比如 IE 11）打包时，需要使用Legacy格式的打包文件，以便在运行时自动加载 polyfill 而不需要手动引入。

### 具体代码逻辑

在该函数中，首先判断输出的文件格式是否为 `system`。

如果是，再判断入口 chunk 文件是否包含 `-legacy` 字符串。如果存在，就说明该 chunk 是Legacy格式的，返回 `true`，否则返回 `false`。

1. 找到输出文件中的入口文件对应的 `chunk` 对象，使用了 `Object.values()` 方法来取出 `bundle` 对象中所有的值（即输出文件对象），然后使用 `Array.prototype.find()` 方法来找到满足条件的 `chunk` 对象。条件为 `output.type === 'chunk' && output.isEntry`，即 `output` 是一个 `chunk` 对象且是入口文件。其中 `output.type` 表示输出类型，可以是 `chunk` 或者 `asset`，而 `output.isEntry` 表示该输出文件是否是入口文件。如果找到了符合条件的 `chunk` 对象，则返回该对象，否则返回 `undefined`。
2. 如果entryChunk存在且它的文件名包含'-legacy'，则返回true；否则返回false。!!是将其强制转换为布尔类型。

## babel插件：记录和移除导入 polyfill 的 import 声明

```ts
function recordAndRemovePolyfillBabelPlugin(
  polyfills: Set<string>,
): BabelPlugin {
  return ({ types: t }: { types: typeof BabelTypes }): BabelPlugin => ({
    name: 'vite-remove-polyfill-import',
    post({ path }) {
      path.get('body').forEach((p) => {
        if (t.isImportDeclaration(p.node)) {
          polyfills.add(p.node.source.value)
          p.remove()
        }
      })
    },
  })
}
```

这是一个Babel插件，名为 `vite-remove-polyfill-import`。该插件的作用是记录和移除导入了 polyfill 的 import 声明。

函数接收一个 polyfills 集合作为参数。当遍历到 import 声明时，插件会将导入的模块字符串加入 polyfills 集合中，并移除该 import 声明。最终，polyfills 集合会记录下所有导入了 polyfill 的模块。

## babel插件：将代码中的特定标记替换为布尔字面量 `true`

```ts
const legacyEnvVarMarker = `__VITE_IS_LEGACY__`
```

```ts
function replaceLegacyEnvBabelPlugin(): BabelPlugin {
  return ({ types: t }): BabelPlugin => ({
    name: 'vite-replace-env-legacy',
    visitor: {
      Identifier(path) {
        if (path.node.name === legacyEnvVarMarker) {
          path.replaceWith(t.booleanLiteral(true))
        }
      },
    },
  })
}
```


这是一个返回 Babel 插件的函数，用于将代码中的特定标记替换为布尔字面量 `true`。该函数返回的插件名为 `vite-replace-env-legacy`，它的功能是针对 AST 树中的 `Identifier` 节点，如果其名称为指定的 `legacyEnvVarMarker` 标记，则将其替换为布尔字面量 `true`。

该插件的实现是一个对象，包含一个名为 `visitor` 的属性。该属性的值是一个包含了一个 `Identifier` 方法的对象，该方法用于遍历 AST 树的 Identifier 节点，并在遍历到标记节点时进行替换。在这个方法中，如果遍历到了一个名称为 `legacyEnvVarMarker` 的节点，则通过 `path.replaceWith` 方法将其替换为一个布尔字面量节点。

### ({ types: t })

这行代码使用了对象解构赋值，它将传入的对象中的 `types` 属性提取出来，赋值给变量 `t`，以便后续的代码可以使用 `t` 来访问 `types` 属性。这样写的好处是可以让代码更加简洁易懂，同时可以减少不必要的代码量

在 Babel 插件中，插件作者需要通过 Babel 的 API 来创建新的 AST 节点，这些节点可以通过访问 `@babel/types` 模块来创建。当插件被 Babel 调用时，Babel 会将一个包含 Babel API 的对象传递给插件函数，这个对象通常被命名为 `babel`，而 `types` 就是其中的一个属性。通过 `{ types: t }` 的写法，插件可以将 `t` 作为 Babel API 对象的一部分进行引用。

因此，在插件函数中使用 `{ types: t }`，就可以通过 `t` 来创建新的 AST 节点，例如在 `replaceLegacyEnvBabelPlugin` 函数中，通过 `{ types: t }` 就可以使用 `t.booleanLiteral` 方法创建一个布尔字面量节点，用于替换指定的节点。

### path.replaceWith

`path.replaceWith` 是 Babel 的 API 之一，用于替换 AST 树上的节点。它接受一个新节点作为参数，并将其替换当前节点。

在 Babel 插件中，`path` 代表当前遍历到的节点，可以通过调用 `path.replaceWith` 来替换这个节点。例如，在上面提到的 `replaceLegacyEnvBabelPlugin` 函数中，当遍历到 `Identifier` 节点，并且该节点名称为指定的 `legacyEnvVarMarker` 标记时，就会调用 `path.replaceWith` 方法将其替换为一个布尔字面量节点。

需要注意的是，Babel 插件中对 AST 树的修改都是基于浅拷贝的，即在原有的节点上进行修改并返回新节点，而不是直接在原有节点上修改。这是因为在遍历 AST 树时，Babel 会缓存节点信息以便后续访问，如果直接修改原有节点可能会影响到后续访问的正确性。因此，使用 `path.replaceWith` 方法来替换节点是一种比较安全的方式。

### 插件用处

这个插件的作用是在 Babel 转译代码的过程中，替换掉 Vite 早期版本中用于环境变量标识的特殊变量，使其能够在新版本的 Vite 中正常工作。

在 Vite 1.x 版本中，开发者可以在 `.env` 文件中定义环境变量，然后在代码中通过 `$VITE_XXX` 这种形式的特殊变量来访问这些环境变量。而在 Vite 2.x 版本中，这种访问方式被废弃了，取而代之的是在代码中使用 `import.meta.env.XXX` 来访问环境变量。

为了让老的项目能够平滑地升级到 Vite 2.x，Vite 提供了一个 `replaceLegacyEnvBabelPlugin` 插件，它会在 Babel 转译代码的过程中，将所有出现 `$VITE_XXX` 的地方替换为 `true`，以避免代码中使用废弃的特殊变量而导致运行时错误。

## babel插件：将代码块包裹在 IIFE（立即调用的函数表达式）中

```js
function wrapIIFEBabelPlugin(): BabelPlugin {
  return ({ types: t, template }): BabelPlugin => {
    const buildIIFE = template(';(function(){%%body%%})();')

    return {
      name: 'vite-wrap-iife',
      post({ path }) {
        if (!this.isWrapped) {
          this.isWrapped = true
          path.replaceWith(t.program(buildIIFE({ body: path.node.body })))
        }
      },
    }
  }
}
```

这是一个 Babel 插件，用于将代码块包裹在 IIFE（立即调用的函数表达式）中。

这个插件会在 `post` 阶段被调用，对 AST 进行修改。具体地，它检查 AST 是否已被包裹在 IIFE 中，如果没有，则使用 Babel 的模板语法，生成一个 IIFE，并将当前 AST 的 body 作为参数传入。

这个插件的主要作用是帮助确保模块中的变量作用域不会泄露到全局作用域，从而提高代码的可维护性和安全性。

###  `template(';(function(){%%body%%})();')`

`template` 是 Babel 提供的一个函数，它可以将字符串模板编译成可执行的函数，函数返回一个 `AST` 节点。

`;(function(){%%body%%})();` 就是一个 IIFE 的字符串模板，其中 `%%body%%` 是一个占位符，它将被实际的 `AST` 代码块所替代。这个模板会被编译成一个函数，这个函数会返回一个 `AST` 节点，表示一个 IIFE，其中 `%%body%%` 部分会被替换成传入的 `AST` 代码块。最终，这个 IIFE 的代码会被插入到目标代码中，从而将代码块包裹在一个函数作用域中。

### this.isWrapped

这里的 `this.isWrapped` 是一个标记，用于标记当前的代码是否已经被包裹在 IIFE 中了。这个标记是通过 `post` 钩子函数上下文对象来实现的，因为在 `post` 钩子函数中，上下文对象 `this` 会被持久化，这样就可以实现跨多次调用时共享状态。

具体来说，当第一次调用 `post` 钩子函数时，`this.isWrapped` 还不存在，所以会将代码块包裹在 IIFE 中，并将 `this.isWrapped` 标记为 `true`。当下一次调用 `post` 钩子函数时，由于 `this.isWrapped` 已经被标记为 `true`，所以不会再次将代码块包裹在 IIFE 中。这样就保证了代码只会被包裹一次。

## 代码片段进行哈希计算并生成CSP哈希列表

```ts
export const cspHashes = [
  safari10NoModuleFix,
  systemJSInlineCode,
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
].map((i) => createHash('sha256').update(i).digest('base64'))
```

将一些代码片段进行哈希计算并生成CSP哈希列表。

CSP（Content Security Policy）是一种Web应用程序的安全策略，允许站点管理员通过白名单机制告诉浏览器哪些内容是可以被允许执行或加载的。在CSP策略中，可以指定脚本、样式表、图像、音频等类型的白名单，而浏览器将只执行或加载这些白名单中的内容，可以有效地减少Web应用程序遭受XSS、数据注入等攻击的风险。

在这个代码片段中，safari10NoModuleFix、systemJSInlineCode、detectModernBrowserCode、dynamicFallbackInlineCode这四个字符串常量分别是一些JavaScript代码片段，这些代码片段被认为是需要允许执行的。createHash('sha256')是Node.js内置的哈希计算方法，使用sha256算法对每个代码片段进行哈希计算，并使用base64编码生成哈希值。最终，所有哈希值被放到cspHashes数组中，以便后续在CSP策略中使用。

## unbuild打包配置

build.config.ts

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
  },
})
```

这段代码使用了 `unbuild` 库，该库提供了一个快速构建的配置生成器 `defineBuildConfig`，其接受一个配置对象作为参数，其中包括以下选项：

- `entries`: 入口文件数组。
- `clean`: 是否清除输出目录。
- `declaration`: 是否生成 `.d.ts` 声明文件。
- Rollup 打包选项，其中包括以下选项：
  - `emitCJS`: 是否同时输出 CommonJS 格式。
  - `inlineDependencies`: 是否内联依赖。

通过使用该库，可以快速生成符合规范的构建配置，并且避免手动编写复杂的构建配置文件。

## package.json

### 完整内容

```json
{
  "name": "@vitejs/plugin-legacy",
  "version": "4.0.3",
  "license": "MIT",
  "author": "Evan You",
  "files": [
    "dist"
  ],
  "keywords": [
    "frontend",
    "vite",
    "vite-plugin",
    "@vitejs/plugin-legacy"
  ],
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "dev": "unbuild --stub",
    "build": "unbuild && pnpm run patch-cjs",
    "patch-cjs": "tsx ../../scripts/patchCJS.ts",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": "^14.18.0 || >=16.0.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vitejs/vite.git",
    "directory": "packages/plugin-legacy"
  },
  "bugs": {
    "url": "https://github.com/vitejs/vite/issues"
  },
  "homepage": "https://github.com/vitejs/vite/tree/main/packages/plugin-legacy#readme",
  "dependencies": {
    "@babel/core": "^7.21.4",
    "@babel/preset-env": "^7.21.4",
    "browserslist": "^4.21.5",
    "core-js": "^3.30.1",
    "magic-string": "^0.30.0",
    "regenerator-runtime": "^0.13.11",
    "systemjs": "^6.14.1"
  },
  "peerDependencies": {
    "terser": "^5.4.0",
    "vite": "^4.0.0"
  },
  "devDependencies": {
    "acorn": "^8.8.2",
    "picocolors": "^1.0.0",
    "vite": "workspace:*"
  }
}
```

### files字段

`files`字段用于指定npm包发布时需要包含哪些文件。如果你不在`files`字段中列出某些文件，那么当你发布包时，这些文件将不会被包含在内。该字段是一个数组，其中的每个元素是一个文件或文件夹的路径。当你运行`npm publish`时，npm会检查你的包目录中是否有列出的每个文件和文件夹，并将它们都打包并发布到npm仓库中。默认情况下，`files`字段中包含了一些常见的文件和文件夹，比如`README`，`LICENSE`等。如果你想要发布的内容更丰富，可以将需要发布的文件和文件夹添加到该字段中。

### `main`, `module` 和 `types`

```json
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
```

这里是`package.json`中的`main`, `module` 和 `types`字段，分别用来指定 CommonJS 模块的入口文件、ES Module 模块的入口文件以及 TypeScript 类型定义文件的位置。

通常，在 Node.js 环境下，使用 CommonJS 规范加载模块，而在浏览器环境下，使用 ES Module 规范加载模块。`types` 字段用于提供库的类型定义文件，便于 TypeScript 编译器对该库的类型进行推断。

### exports

```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
```

这是一个 package.json 中的 exports 字段，它是 Node.js 模块规范的一部分，用于指定模块的导入导出行为。在这个例子中，指定了模块的三种不同格式的导出方式：

- types: 导出 TypeScript 类型定义文件，以供 TypeScript 或其他支持导入类型定义的工具使用。
- import: 导出 ES Module 格式的代码，以供现代浏览器或 Node.js 13+ 版本使用。
- require: 导出 CommonJS 格式的代码，以供旧版浏览器或 Node.js 12 及以下版本使用。

在使用这个 package 作为依赖时，Node.js 会根据当前运行环境的版本和模块引入方式，自动选择对应的导出方式，从而保证模块在不同的环境中都能正确地导入和使用。

在 `package.json` 中的 `"exports"` 字段中，`"."` 表示默认导出，也就是当一个模块被导入时，如果没有指定导入模块中的某个具体项，就会默认导入该模块中的 `"."`。例如，在一个 JavaScript 模块中，如果有一个默认导出，它就可以被导入：

```js
// myModule.js
export default function myFunction() {}

// app.js
import myFunction from './myModule.js';
```

在上面的例子中，`import myFunction from './myModule.js';` 语句默认导入了 `./myModule.js` 中的默认导出项，即 `function myFunction() {}`。由于 `exports` 字段中定义了默认导出项的路径和格式，`import` 语句就可以正确地找到并加载该项。

### `exports` 字段和 `main`, `module`, `types` 字段区别

`exports` 字段和 `main`, `module`, `types` 字段都是用来告诉其他模块系统（如 CommonJS、ESM、TypeScript）如何导入当前 package 的入口文件以及类型定义等。

但是，`exports` 比 `main`, `module`, `types` 更加灵活。`exports` 的值是一个对象，可以定义多个入口文件，每个入口文件都可以指定不同的导入方式、路径、文件名等等，这种灵活性可以更好地适应不同的模块系统和打包工具的要求。

同时，`exports` 字段还支持一些特殊的键，例如 `import` 和 `require`，这些键可以让你定义不同的导入方式，比如支持 ESM 和 CommonJS 的导入方式。

而 `main`, `module`, `types` 字段则比较固定，它们只能定义单个入口文件或类型定义文件，不能定义多个入口文件以及其他导入方式。通常情况下，这些字段仍然会被大多数工具和模块系统所支持，而 `exports` 则是一个比较新的标准，可能还不是所有工具和模块系统都能完全支持。

### peerDependencies

```json
 "peerDependencies": {
    "terser": "^5.4.0",
    "vite": "^4.0.0"
  },
```

`peerDependencies` 是一种在 `npm` 包中声明依赖关系的方式，它用于声明当前包所依赖的其他包的最低版本，同时也表明当前包与所依赖包的版本是兼容的。与普通的 `dependencies` 不同，`peerDependencies` 并不会被安装到当前包的 `node_modules` 目录中。相反，它会被安装在使用该包的其他包的 `node_modules` 目录中，以确保依赖关系正确地解析。在使用 `npm` 作为包管理器时，`peerDependencies` 可以用于进行依赖冲突的解决，它可以告诉 `npm` 将依赖的解析交给使用该包的其他包处理。

## readme

Vite的默认浏览器支持基线是本地ESM，本地ESM动态导入和import.meta。当为生产环境构建时，此插件提供了对不支持这些特性的旧版浏览器的支持。

默认情况下，此插件将执行以下操作：

为最终打包中的每个块生成相应的遗留版块，使用@babel/preset-env进行转换，并作为SystemJS模块发出（仍支持代码拆分！）。

生成一个包括SystemJS运行时和根据指定的浏览器目标和实际使用情况确定的任何必要的polyfills的polyfill块。

向生成的HTML中注入`<script nomodule>`标签，以在不支持广泛特性的浏览器中有条件地加载polyfills和遗留版块。

注入import.meta.env.LEGACY环境变量，它仅在遗留版生产构建中为true，在所有其他情况下为false。

### additionalLegacyPolyfills

additionalLegacyPolyfills是一个字符串数组，用于添加自定义导入到legacy代码(polyfills)中。由于基于使用情况的polyfill检测只涵盖了ES语言特性，因此可能需要使用该选项手动指定其他DOM API的polyfills。

注意：如果需要为现代和legacy代码(polyfills)都添加额外的polyfills，可以直接在应用程序源代码中导入它们。

### 内容安全策略（Content Security Policy，CSP）

Legacy插件需要使用内联脚本来修复Safari 10.1的非模块化支持、SystemJS初始化以及动态导入回退。如果您有严格的CSP策略要求，则需要将相应的哈希添加到您的script-src列表中：

- `sha256-MS6/3FCg4WjP9gwgaBGwLpRCY6fZBgwmhVCdrPrNf3E=`
- `sha256-tQjf8gvb2ROOMapIxFvFAYBeUJ0v1HCbOcSmDNXGtDo=`
- `sha256-p7PoC97FO+Lu90RNjGWxhbm13yALSR4xzV8vaDhaQBo=`
- `sha256-+5XkZFazzJo8n0iOP4ti/cLCMUudTf//Mzkb7xNPXIc=`

这些值（不包括sha256-前缀）也可以通过以下方式获取：

import { cspHashes } from '@vitejs/plugin-legacy'

在使用regenerator-runtime polyfill时，它会尝试使用globalThis对象来注册自身。如果globalThis不可用（它是相当新的功能，包括IE 11在内并不广泛支持），它会尝试执行动态Function(...)调用，这会违反CSP。为了避免在缺少globalThis的情况下执行动态eval，请考虑将core-js/proposals/global-this添加到additionalLegacyPolyfills来定义它。

