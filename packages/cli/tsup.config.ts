import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  target: 'node18',
  // Fully self-contained binary: inline the workspace core package and its
  // deps so `npm i -g issu` has zero runtime dependencies and runs on any Node.
  noExternal: ['@issu/core', 'gray-matter'],
  banner: {
    // 1. Node shebang so the published bin is directly executable.
    // 2. A real `require` (via createRequire) — bundled CJS deps like
    //    gray-matter call `require('fs')`, which bare ESM output lacks.
    js: [
      '#!/usr/bin/env node',
      "import { createRequire as __issuCreateRequire } from 'module';",
      'const require = __issuCreateRequire(import.meta.url);',
    ].join('\n'),
  },
})
