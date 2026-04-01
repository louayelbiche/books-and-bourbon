import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'agent/index': 'src/agent/index.ts',
    'tools/index': 'src/tools/index.ts',
    'context/index': 'src/context/index.ts',
    'prompt/index': 'src/prompt/index.ts',
    'pipeline/index': 'src/pipeline/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    '@runwell/request-escalation',
    '@runwell/booking-adapter',
  ],
});
