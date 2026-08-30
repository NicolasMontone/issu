import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  // Don't bundle deps; they're declared in package.json.
  external: ['gray-matter'],
})
