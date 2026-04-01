import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/simulations/**/*.test.ts'],
    testTimeout: 120_000, // 2 min per test — scraping + LLM calls
    hookTimeout: 60_000,
  },
});
