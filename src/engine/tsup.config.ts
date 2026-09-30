import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  // ESM output, because the engine imports packages that only exist as ESM
  // (@oh-my-pi/pi-coding-agent ships TypeScript sources) and because a CJS
  // bundle cannot load them at all: `require` of an ESM-only package hands
  // back the module namespace, so `chalk.bold` comes back undefined.
  // Dependencies stay external: the runtime's ESM interop handles the
  // CommonJS ones (chalk, lodash, semver), which is where the crash started.
  format: ['esm'],
  outExtension: () => ({ js: '.js' }),
  platform: 'node',
  dts: true,
  outDir: 'dist',
  shims: true,
  esbuildOptions(options) {
    options.bundle = true
    options.platform = 'node'
    options.target = 'node22'
    options.jsxFactory = undefined
  },
  // Bun, not node: the Pi packages are written for it, and the session
  // storage the engine uses reaches for bun:sqlite.
  banner: { js: '#!/usr/bin/env bun' },
  esbuildPlugins: [],
})
