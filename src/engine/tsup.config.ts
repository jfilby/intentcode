import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],       // CJS output
  platform: 'node',
  dts: true,
  outDir: 'dist',
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
