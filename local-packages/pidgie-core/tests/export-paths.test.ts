/**
 * Export path verification for getProactiveToolGuidelines
 *
 * Ensures the function is accessible from all intended import paths
 * and that all paths resolve to the same implementation.
 */

import { describe, it, expect } from 'vitest';

// Path 1: Direct from prompt-builder source
import { getProactiveToolGuidelines as fromBuilder } from '../src/prompt/prompt-builder.js';

// Path 2: Re-export from prompt/index.ts
import { getProactiveToolGuidelines as fromPromptIndex } from '../src/prompt/index.js';

// Path 3: Barrel re-export from src/index.ts
import { getProactiveToolGuidelines as fromBarrel } from '../src/index.js';

// Also verify buildSystemPrompt still exports correctly
import { buildSystemPrompt } from '../src/prompt/index.js';

describe('getProactiveToolGuidelines export paths', () => {
  it('is importable from prompt-builder.ts', () => {
    expect(typeof fromBuilder).toBe('function');
  });

  it('is importable from prompt/index.ts', () => {
    expect(typeof fromPromptIndex).toBe('function');
  });

  it('is importable from barrel index.ts', () => {
    expect(typeof fromBarrel).toBe('function');
  });

  it('all paths resolve to the same function', () => {
    expect(fromBuilder).toBe(fromPromptIndex);
    expect(fromPromptIndex).toBe(fromBarrel);
  });

  it('all paths return identical output', () => {
    const r1 = fromBuilder();
    const r2 = fromPromptIndex();
    const r3 = fromBarrel();
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('buildSystemPrompt still exports correctly alongside new function', () => {
    expect(typeof buildSystemPrompt).toBe('function');
  });
});
