import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],       // CJS output
  platform: 'node',
  dts: true,
  outDir: 'dist',
  // The prisma-client generator emits `fileURLToPath(import.meta.url)`, which
  // has no meaning in the CJS bundle this package ships as its bin. Without
  // this shim the CLI dies at import time with
  // "The path argument must be of type string or an instance of URL".
  shims: true,
  esbuildOptions(options) {
    options.bundle = true
    options.platform = 'node'
    options.target = 'node22'
    options.external = ['chalk']
    options.jsxFactory = undefined
  },
  banner: { js: '#!/usr/bin/env node' },
  esbuildPlugins: [],
})
