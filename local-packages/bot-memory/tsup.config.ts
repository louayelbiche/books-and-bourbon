import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'visitor/index': 'src/visitor/index.ts',
    'conversation/index': 'src/conversation/index.ts',
    'profile/index': 'src/profile/index.ts',
    'migration/index': 'src/migration/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['pg'],
});
