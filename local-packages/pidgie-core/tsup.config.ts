import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    agent: 'src/agent.ts',
    'tools/index': 'src/tools/index.ts',
    'widget/index': 'src/widget/index.ts',
    'types/index': 'src/types/index.ts',
    'config/index': 'src/config/index.ts',
    'security/index': 'src/security/index.ts',
    'session/index': 'src/session/index.ts',
    'streaming/index': 'src/streaming/index.ts',
    'cache/index': 'src/cache/index.ts',
    'datasource/index': 'src/datasource/index.ts',
    'voice/index': 'src/voice/index.ts',
    'detection/index': 'src/detection/index.ts',
    'scraper/index': 'src/scraper/index.ts',
    'screenshot/index': 'src/screenshot/index.ts',
    'prompt/index': 'src/prompt/index.ts',
    'suggestions/index': 'src/suggestions/index.ts',
    'demo/index': 'src/demo/index.ts',
    'demo-stores/index': 'src/demo-stores/index.ts',
    'knowledge/index': 'src/knowledge/index.ts',
    'rag-session/index': 'src/rag-session/index.ts',
    'scrape-cache/index': 'src/scrape-cache/index.ts',
    'voice-prompt/index': 'src/voice-prompt/index.ts',
  },
  format: ['esm'],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react', 'react-dom', 'playwright',
    '@runwell/card-system', '@runwell/card-system/parsers', '@runwell/card-system/validation',
    '@runwell/booking-adapter', '@runwell/request-escalation', '@runwell/rag-engine',
    'impit', 'better-sqlite3', '@google/generative-ai',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
