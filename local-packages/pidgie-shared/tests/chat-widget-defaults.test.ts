/**
 * Tests for ChatWidget defaults: bell icon, pulse animation, voice config.
 *
 * Since ChatWidget is a React component ('use client'), we test via:
 * - Module export verification (no broken imports)
 * - Source-level content assertions (keyframes, SVG, defaults)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetSource = readFileSync(
  resolve(__dirname, '../src/chat-widget/ChatWidget.tsx'),
  'utf-8'
);

// ── Module exports ────────────────────────────────────────────────────
describe('ChatWidget exports', () => {
  it('export barrel re-exports ChatWidget', () => {
    // Verify the index.ts barrel exports ChatWidget (source-level check)
    const indexSource = readFileSync(
      resolve(__dirname, '../src/chat-widget/index.ts'),
      'utf-8'
    );
    expect(indexSource).toContain("export { ChatWidget }");
    expect(indexSource).toContain("export type { ChatWidgetProps");
  });

  it('does not import Bot from lucide-react', () => {
    // Bot was removed when bell icon became the default
    const lucideImportLine = widgetSource
      .split('\n')
      .find((line) => line.includes('lucide-react'));
    expect(lucideImportLine).toBeDefined();
    expect(lucideImportLine).not.toContain('Bot');
  });
});

// ── Bell icon default ─────────────────────────────────────────────────
describe('Default bell icon', () => {
  it('contains linearGradient with id="cbell"', () => {
    expect(widgetSource).toContain('id="cbell"');
  });

  it('contains gold gradient stops', () => {
    expect(widgetSource).toContain('stopColor="#C9A66B"');
    expect(widgetSource).toContain('stopColor="#A8864A"');
  });

  it('contains bell-shaped path with fill="url(#cbell)"', () => {
    expect(widgetSource).toContain('fill="url(#cbell)"');
  });

  it('contains chat bubble overlay (white rect)', () => {
    // The chat bubble is a rounded rect with white fill
    expect(widgetSource).toMatch(/rect.*fill="white".*opacity="0\.9"/);
  });

  it('uses defaultIcon when assistantIcon prop is not provided', () => {
    expect(widgetSource).toContain('const assistantIconEl = assistantIcon ?? defaultIcon');
  });
});

// ── FAB pulse animation ───────────────────────────────────────────────
describe('FAB pulse animation (chat-fab-glow)', () => {
  // Extract keyframe blocks — match @keyframes chat-fab-glow { ...nested braces... }
  // Use a greedy match that captures everything between the outer braces
  const keyframeBlocks: string[] = [];
  const keyframePattern = /@keyframes chat-fab-glow\s*\{/g;
  let match;
  while ((match = keyframePattern.exec(widgetSource)) !== null) {
    // Find the matching closing brace (handling nested braces)
    let depth = 1;
    let i = match.index + match[0].length;
    while (i < widgetSource.length && depth > 0) {
      if (widgetSource[i] === '{') depth++;
      else if (widgetSource[i] === '}') depth--;
      i++;
    }
    keyframeBlocks.push(widgetSource.slice(match.index, i));
  }

  it('defines chat-fab-glow keyframes (2 instances: collapsed + expanded)', () => {
    expect(keyframeBlocks.length).toBe(2);
  });

  it('includes scale(1) at 0%/100% and scale(1.08) at 50%', () => {
    for (const block of keyframeBlocks) {
      expect(block).toContain('transform: scale(1)');
      expect(block).toContain('transform: scale(1.08)');
    }
  });

  it('includes box-shadow glow effect at 50%', () => {
    for (const block of keyframeBlocks) {
      expect(block).toContain('box-shadow');
    }
  });

  it('applies animation only when hasInteracted is false', () => {
    expect(widgetSource).toContain(
      "animation: !hasInteracted ? 'chat-fab-glow 2s ease-in-out infinite' : undefined"
    );
  });
});

// ── Voice transcription defaults ──────────────────────────────────────
describe('Voice transcription defaults', () => {
  it('voiceApiPath defaults to /api/chat/voice', () => {
    expect(widgetSource).toContain("voiceApiPath = '/api/chat/voice'");
  });

  it('enableVoice defaults to true', () => {
    expect(widgetSource).toContain('enableVoice = true');
  });

  it('transcribeAudio POSTs to voiceApiPath', () => {
    expect(widgetSource).toContain('fetch(voiceApiPath, { method:');
  });

  it('handles transcription errors with try/catch', () => {
    // The transcribeAudio function wraps fetch in try/catch
    const transcribeFn = widgetSource.match(
      /async function transcribeAudio[\s\S]*?finally\s*\{[\s\S]*?\}/
    );
    expect(transcribeFn).not.toBeNull();
    expect(transcribeFn![0]).toContain('catch (error)');
    expect(transcribeFn![0]).toContain('setIsTranscribing(false)');
  });
});

// ── CSS keyframe namespace ────────────────────────────────────────────
describe('CSS keyframe namespacing', () => {
  it('all keyframes are prefixed with "chat-" to avoid Tailwind collisions', () => {
    const keyframeNames = [...widgetSource.matchAll(/@keyframes\s+([\w-]+)/g)].map(
      (m) => m[1]
    );
    expect(keyframeNames.length).toBeGreaterThan(0);
    for (const name of keyframeNames) {
      expect(name).toMatch(/^chat-/);
    }
  });
});
