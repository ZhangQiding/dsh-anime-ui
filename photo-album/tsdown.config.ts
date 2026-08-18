import { defineConfig } from 'tsdown'

/** npm package identity shared by the cordis.patch.yml row and the client module id. */
const PACKAGE_NAME = 'dsh-photo-album'

/**
 * The client bundle must register itself with the web shell's module host:
 * `window.__ModuleLoader__.load({ id, factory })`. Inside `factory`, every
 * external dependency is `require`d from the shell-provided module graph
 * (react, react-dom, and the injected `@deepseek-ai/dsh-client-*` packages).
 *
 * tsdown's CJS format already emits `require(...)` + `exports.x = ...` for
 * externals, so this renderChunk hook wraps that body in the module-host
 * envelope. The final file is a single top-level expression statement (valid
 * ESM under the package's `"type": "module"`) and is never loaded by Node.
 */
function clientModuleHostPlugin() {
  return {
    name: 'dsh-client-module-host',
    renderChunk(code: string, chunk: { fileName: string }) {
      if (chunk.fileName !== 'client.js') return null
      const body = code
        .replace(/^['"]use strict['"];\s*\n?/, '')
        .replace(/^Object\.defineProperty\(exports, Symbol\.toStringTag[^;]*;\s*\n?/, '')
        .replace(/\n?\/\/# sourceMappingURL=.*$/, '')
      return [
        `window.__ModuleLoader__.load({`,
        `  id: ${JSON.stringify(PACKAGE_NAME)},`,
        `  factory: (require) => {`,
        `    var module = { exports: {} };`,
        `    var exports = module.exports;`,
        `    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });`,
        body,
        `    return module.exports;`,
        `  }`,
        `});`,
        ``,
      ].join('\n')
    },
  }
}

export default defineConfig([
  // Host half: Node-side plugin (settings section + /api/photo-album/* routes).
  {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'node',
    outDir: 'lib',
    clean: false,
    sourcemap: false,
    dts: true,
    outExtensions: () => ({ js: '.js' }),
    deps: { neverBundle: [/^@deepseek-ai\//, 'schemastery'] },
  },
  // Browser half: the web GUI client (sidebar entry + gallery + settings card).
  {
    entry: { client: 'src/client/index.ts' },
    format: 'cjs',
    platform: 'browser',
    outDir: 'lib',
    clean: false,
    sourcemap: false,
    dts: true,
    target: 'es2022',
    outExtensions: () => ({ js: '.js' }),
    deps: {
      neverBundle: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', /^@deepseek-ai\//],
    },
    plugins: [clientModuleHostPlugin()],
  },
])
