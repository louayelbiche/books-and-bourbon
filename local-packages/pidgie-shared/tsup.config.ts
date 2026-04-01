import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'api/index': 'src/api/index.ts',
    'api/ssrf': 'src/api/ssrf.ts',
    'api/scrape': 'src/api/scrape.ts',
    'agent/index': 'src/agent/index.ts',
    'chat-widget/index': 'src/chat-widget/index.ts',
    'preview/index': 'src/preview/index.ts',
    'session/index': 'src/session/index.ts',
    'config/index': 'src/config/index.ts',
    'mobile/index': 'src/mobile/index.ts',
    'env/index': 'src/env/index.ts',
    'logging/index': 'src/logging/index.ts',
    'prompt/index': 'src/prompt/index.ts',
    'sync/index': 'src/sync/index.ts',
    'escalation/index': 'src/escalation/index.ts',
    'channel/index': 'src/channel/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'react-markdown',
    'lucide-react',
    'next',
    'next/server',
    'playwright',
    '@runwell/card-system',
    '@runwell/card-system/types',
    '@runwell/card-system/components',
    '@runwell/card-system/utils',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
