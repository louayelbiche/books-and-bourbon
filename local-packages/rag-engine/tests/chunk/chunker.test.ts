import { describe, it, expect } from 'vitest';
import { chunk, estimateTokens } from '../../src/chunk/chunker.js';

describe('estimateTokens', () => {
  it('estimates roughly 1 token per 4 characters', () => {
    expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('chunk', () => {
  describe('paragraph strategy', () => {
    it('splits on double newlines', () => {
      const text = 'First paragraph about taxes.\n\nSecond paragraph about deductions.\n\nThird paragraph about credits.';
      const chunks = chunk(text, { strategy: 'paragraph', minTokens: 1 });
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0].content).toContain('taxes');
    });

    it('returns a single chunk for short text', () => {
      const text = 'This is a short document about Section 162(a).';
      const chunks = chunk(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].index).toBe(0);
    });

    it('merges paragraphs that are too small', () => {
      const text = 'A.\n\nB.\n\nC.';
      const chunks = chunk(text, { minTokens: 10 });
      // All three are tiny, should be merged into one
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toContain('A.');
      expect(chunks[0].content).toContain('C.');
    });
  });

  describe('section strategy', () => {
    it('splits on markdown headings', () => {
      const sections = Array.from({ length: 3 }, (_, i) =>
        `## Section ${160 + i}. Topic ${i}\n${'Detailed content about this specific tax section and its various requirements and provisions for taxpayers. '.repeat(20)}`
      );
      const text = sections.join('\n\n');
      const chunks = chunk(text, { strategy: 'section', minTokens: 1, targetTokens: 200 });
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('splits on "Section" keyword lines', () => {
      const sections = Array.from({ length: 3 }, (_, i) =>
        `Section ${160 + i}(a). Topic ${i}\n${'This section covers important tax provisions and requirements that must be followed by all taxpayers filing returns. '.repeat(20)}`
      );
      const text = sections.join('\n\n');
      const chunks = chunk(text, { strategy: 'section', minTokens: 1, targetTokens: 200 });
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('fixed strategy', () => {
    it('splits long text at sentence boundaries', () => {
      const sentences = Array.from({ length: 50 }, (_, i) =>
        `This is sentence number ${i + 1} about various tax regulations and requirements.`
      );
      const text = sentences.join(' ');
      const chunks = chunk(text, { strategy: 'fixed', targetTokens: 100 });
      expect(chunks.length).toBeGreaterThan(1);
      for (const c of chunks) {
        expect(c.tokenCount).toBeLessThanOrEqual(800); // with some tolerance
      }
    });
  });

  describe('breadcrumb prefix', () => {
    it('prepends breadcrumb to each chunk', () => {
      const text = 'Deductions for trade or business expenses.';
      const chunks = chunk(text, {
        breadcrumb: 'IRC Section 162(a), Trade or business expenses',
      });
      expect(chunks[0].content.startsWith('IRC Section 162(a)')).toBe(true);
      expect(chunks[0].content).toContain('Deductions for trade');
      expect(chunks[0].fullPath).toBe('IRC Section 162(a), Trade or business expenses');
    });
  });

  describe('section extraction', () => {
    it('extracts section number and title from "Section NNN" pattern', () => {
      const text = 'Section 162(a). Trade or business expenses\nThere shall be allowed as a deduction all ordinary and necessary expenses.';
      const chunks = chunk(text);
      expect(chunks[0].section).toBe('162(a)');
      expect(chunks[0].title).toBe('Trade or business expenses');
    });

    it('extracts from "IRC Section" pattern', () => {
      const text = 'IRC Section 501(c)(3). Tax-exempt organizations\nOrganizations described in this section are exempt.';
      const chunks = chunk(text);
      expect(chunks[0].section).toBe('501(c)(3)');
    });

    it('returns null when no section is found', () => {
      const text = 'This is plain text without any section references.';
      const chunks = chunk(text);
      expect(chunks[0].section).toBeNull();
      expect(chunks[0].title).toBeNull();
    });
  });

  describe('chunk metadata', () => {
    it('assigns sequential indices', () => {
      const text = 'Section 162. Expenses\nFirst section.\n\nSection 163. Interest\nSecond section.\n\nSection 164. Taxes\nThird section.';
      const chunks = chunk(text, { strategy: 'section', minTokens: 1 });
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].index).toBe(i);
      }
    });

    it('estimates token count for each chunk', () => {
      const text = 'This is a test chunk with some content about tax law.';
      const chunks = chunk(text);
      expect(chunks[0].tokenCount).toBeGreaterThan(0);
      expect(chunks[0].tokenCount).toBe(estimateTokens(text));
    });
  });
});
