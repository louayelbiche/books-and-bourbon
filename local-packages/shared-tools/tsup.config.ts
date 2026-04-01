import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'detection/index': 'src/detection/index.ts',
    'brand-analysis/index': 'src/brand-analysis/index.ts',
    'llm-client/index': 'src/llm-client/index.ts',
    'storage/index': 'src/storage/index.ts',
    'derja/index': 'src/derja/index.ts',
    'security/index': 'src/security/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['better-sqlite3'],
});
