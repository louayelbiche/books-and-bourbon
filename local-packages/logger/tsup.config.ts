import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    request: 'src/request.ts',
    prisma: 'src/prisma.ts',
    ai: 'src/ai.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
