import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    'parsers/index': 'src/parsers/index.ts',
    'components/index': 'src/components/index.ts',
    'hooks/index': 'src/hooks/index.ts',
    'utils/index': 'src/utils/index.ts',
    'validation/index': 'src/validation/index.ts',
  },
  format: ['esm'],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
