import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'llm/index': 'src/llm/index.ts',
    'base/index': 'src/base/index.ts',
    'memory/index': 'src/memory/index.ts',
    'security/index': 'src/security/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@google/generative-ai'],
});
