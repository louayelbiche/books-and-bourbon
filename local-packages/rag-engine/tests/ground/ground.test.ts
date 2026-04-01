import { describe, it, expect } from 'vitest';
import { applyConfidenceGate } from '../../src/ground/confidence-gate.js';
import { verifyCitations } from '../../src/ground/citation-checker.js';
import type { RetrievalResult, GroundedContext } from '../../src/types/engine.js';

function makeResult(overrides: Partial<RetrievalResult> = {}): RetrievalResult {
  return {
    chunkId: 1,
    content: 'Section 162(a). Trade or business expenses are deductible.',
    similarity: 0.85,
    source: 'irc',
    section: '162(a)',
    title: 'Business expenses',
    fullPath: 'Subtitle A / Chapter 1',
    isLiveData: false,
    ...overrides,
  };
}

function makeLiveResult(): RetrievalResult {
  return {
    chunkId: null,
    content: 'Tables available: 5',
    similarity: null,
    source: 'live',
    section: null,
    title: 'availability',
    fullPath: null,
    isLiveData: true,
    liveData: {
      source: 'availability',
      data: { tables: 5 },
      summary: 'Tables available: 5',
      fetchedAt: new Date(),
    },
  };
}

describe('applyConfidenceGate', () => {
  it('passes chunks above the threshold', () => {
    const results = [
      makeResult({ similarity: 0.90, section: '162(a)' }),
      makeResult({ similarity: 0.80, section: '163', chunkId: 2 }),
      makeResult({ similarity: 0.60, section: '164', chunkId: 3 }),
    ];

    const ctx = applyConfidenceGate(results, { threshold: 0.75 });
    expect(ctx.confident).toBe(true);
    expect(ctx.chunks).toHaveLength(2);
    expect(ctx.availableSections).toContain('162(a)');
    expect(ctx.availableSections).toContain('163');
  });

  it('returns not confident when no chunks pass threshold', () => {
    const results = [
      makeResult({ similarity: 0.50 }),
      makeResult({ similarity: 0.40, chunkId: 2 }),
    ];

    const ctx = applyConfidenceGate(results, { threshold: 0.75 });
    expect(ctx.confident).toBe(false);
    expect(ctx.chunks).toHaveLength(0);
    expect(ctx.contextText).toBe('');
  });

  it('returns confident with only live data', () => {
    const results = [makeLiveResult()];
    const ctx = applyConfidenceGate(results);
    expect(ctx.confident).toBe(true);
    expect(ctx.liveData).toHaveLength(1);
  });

  it('builds formatted context text', () => {
    const results = [
      makeResult({ similarity: 0.90, section: '162(a)', title: 'Business expenses' }),
    ];
    const ctx = applyConfidenceGate(results);
    expect(ctx.contextText).toContain('[Section 162(a): Business expenses]');
    expect(ctx.contextText).toContain('deductible');
  });

  it('deduplicates available sections', () => {
    const results = [
      makeResult({ similarity: 0.90, section: '162(a)', chunkId: 1 }),
      makeResult({ similarity: 0.85, section: '162(a)', chunkId: 2 }),
    ];
    const ctx = applyConfidenceGate(results);
    expect(ctx.availableSections).toEqual(['162(a)']);
  });

  it('uses default threshold of 0.75', () => {
    const results = [
      makeResult({ similarity: 0.76 }),
      makeResult({ similarity: 0.74, chunkId: 2 }),
    ];
    const ctx = applyConfidenceGate(results);
    expect(ctx.confident).toBe(true);
    expect(ctx.chunks).toHaveLength(1);
  });
});

describe('verifyCitations', () => {
  function makeContext(sections: string[]): GroundedContext {
    return {
      confident: true,
      chunks: sections.map((s, i) => makeResult({ section: s, chunkId: i + 1 })),
      availableSections: sections,
      contextText: '',
      liveData: [],
    };
  }

  it('validates correct citations', () => {
    const ctx = makeContext(['162(a)', '163', '501(c)(3)']);
    const response = 'Per IRC Section 162(a), business expenses are deductible. See also Section 163.';
    const result = verifyCitations(response, ctx);
    expect(result.allValid).toBe(true);
    expect(result.valid).toContain('162(a)');
    expect(result.valid).toContain('163');
    expect(result.hallucinated).toHaveLength(0);
  });

  it('detects hallucinated citations', () => {
    const ctx = makeContext(['162(a)']);
    const response = 'Under Section 162(a) and Section 999(z), expenses are deductible.';
    const result = verifyCitations(response, ctx);
    expect(result.allValid).toBe(false);
    expect(result.valid).toContain('162(a)');
    expect(result.hallucinated).toContain('999(z)');
  });

  it('handles partial section matches', () => {
    const ctx = makeContext(['162(a)']);
    // Citing parent section "162" should match child "162(a)"
    const response = 'According to Section 162, expenses are allowed.';
    const result = verifyCitations(response, ctx);
    expect(result.allValid).toBe(true);
    expect(result.valid).toContain('162');
  });

  it('handles child section citations', () => {
    const ctx = makeContext(['162(a)']);
    // Citing "162(a)(1)" should match parent "162(a)"
    const response = 'Per Section 162(a)(1), specific expenses are listed.';
    const result = verifyCitations(response, ctx);
    expect(result.allValid).toBe(true);
  });

  it('returns allValid true when no citations found', () => {
    const ctx = makeContext(['162(a)']);
    const response = 'Business expenses are generally deductible.';
    const result = verifyCitations(response, ctx);
    expect(result.allValid).toBe(true);
    expect(result.valid).toHaveLength(0);
  });

  it('marks as unverifiable when context has no sections', () => {
    const ctx: GroundedContext = {
      confident: true,
      chunks: [],
      availableSections: [],
      contextText: '',
      liveData: [],
    };
    const response = 'Per Section 162(a), expenses are deductible.';
    const result = verifyCitations(response, ctx);
    expect(result.unverifiable).toContain('162(a)');
    expect(result.allValid).toBe(true); // no hallucinations, just unverifiable
  });

  it('handles the section symbol', () => {
    const ctx = makeContext(['162(a)']);
    const response = 'Under \u00A7 162(a), deductions are allowed.';
    const result = verifyCitations(response, ctx);
    expect(result.valid).toContain('162(a)');
  });

  it('handles "Sec." abbreviation', () => {
    const ctx = makeContext(['501(c)(3)']);
    const response = 'As described in Sec. 501(c)(3), tax-exempt organizations must comply.';
    const result = verifyCitations(response, ctx);
    expect(result.valid).toContain('501(c)(3)');
  });

  it('handles mixed valid and hallucinated citations', () => {
    const ctx = makeContext(['162(a)', '163']);
    const response = 'Under Section 162(a), Section 163, and Section 404(k), various deductions apply.';
    const result = verifyCitations(response, ctx);
    expect(result.valid).toHaveLength(2);
    expect(result.hallucinated).toContain('404(k)');
    expect(result.allValid).toBe(false);
  });
});
