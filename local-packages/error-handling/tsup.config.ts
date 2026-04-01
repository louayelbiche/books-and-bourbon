import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    response: 'src/response.ts',
    'circuit-breaker': 'src/circuit-breaker.ts',
    correlation: 'src/correlation.ts',
    retry: 'src/retry.ts',
    react: 'src/react.tsx',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'next'],
});
