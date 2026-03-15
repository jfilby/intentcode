import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],         // Node ESM output
  platform: 'node',        // ensures Node APIs work
  dts: true,
  outDir: 'dist',
  clean: true,
})
