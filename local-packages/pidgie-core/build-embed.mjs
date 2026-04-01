/**
 * Build the standalone widget embed script.
 * Produces: dist/embed/chatbot.js (IIFE bundle, ~8KB)
 * Also copies to apps/chatbot-backoffice/public/widget/chatbot.js
 *
 * Run: node packages/pidgie-core/build-embed.mjs
 */

import { execSync } from 'child_process';
import { copyFileSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, 'src/embed/embed.ts');
const out = resolve(__dirname, 'dist/embed/chatbot.js');
const publicOut = resolve(__dirname, '../../apps/chatbot-backoffice/public/widget/chatbot.js');

// Find esbuild binary in pnpm store
const esbuild = resolve(__dirname, '../../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/bin/esbuild');

execSync(`${esbuild} ${src} --bundle --minify --format=iife --target=es2020 --platform=browser --outfile=${out}`, {
  stdio: 'inherit',
});

copyFileSync(out, publicOut);

const kb = (statSync(out).size / 1024).toFixed(1);
console.log(`\nBuilt: chatbot.js (${kb} KB)`);
console.log(`Copied to: apps/chatbot-backoffice/public/widget/chatbot.js`);
