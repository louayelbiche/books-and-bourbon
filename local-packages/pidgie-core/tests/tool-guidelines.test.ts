/**
 * Tests for Proactive Tool Guidelines (prompt-builder.ts changes)
 *
 * Covers:
 * - buildToolGuidelines() conditional inclusion based on signals
 * - getProactiveToolGuidelines() standalone export
 * - Section ordering in buildSystemPrompt()
 * - Regression: existing sections unaffected
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  getProactiveToolGuidelines,
} from '../src/prompt/index.js';
import { createDefaultSignals } from '../src/detection/index.js';
import type { BusinessType } from '../src/detection/index.js';
import type { ScrapedWebsite } from '../src/scraper/index.js';
import type { SystemPromptContext } from '../src/prompt/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

function createMockWebsite(
  overrides: Partial<ScrapedWebsite> & {
    businessType?: BusinessType;
    hasProducts?: boolean;
    hasServices?: boolean;
    hasBooking?: boolean;
  } = {}
): ScrapedWebsite {
  const { businessType, hasProducts, hasServices, hasBooking, ...rest } = overrides;
  const signals = createDefaultSignals();
  if (businessType) signals.businessType = businessType;
  if (hasProducts !== undefined) signals.hasProducts = hasProducts;
  if (hasServices !== undefined) signals.hasServices = hasServices;
  if (hasBooking !== undefined) signals.hasBooking = hasBooking;
  return {
    url: 'https://example.com',
    pages: [],
    combinedContent: 'Sample website content.',
    businessName: 'Acme Corp',
    signals,
    ...rest,
  };
}

function buildPrompt(opts: {
  hasProducts?: boolean;
  hasServices?: boolean;
  hasBooking?: boolean;
  businessType?: BusinessType;
} = {}): string {
  const website = createMockWebsite(opts);
  const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
  return buildSystemPrompt(context);
}

const TOOL_HEADING = '## Proactive Tool Usage';

// ── Activation by signal flags ──────────────────────────────────────

describe('buildSystemPrompt — Proactive Tool Guidelines section', () => {
  describe('activation by signal flags', () => {
    it('includes section when hasProducts is true', () => {
      const prompt = buildPrompt({ hasProducts: true });
      expect(prompt).toContain(TOOL_HEADING);
    });

    it('includes section when hasServices is true', () => {
      const prompt = buildPrompt({ hasServices: true });
      expect(prompt).toContain(TOOL_HEADING);
    });

    it('includes section when hasBooking is true', () => {
      const prompt = buildPrompt({ hasBooking: true });
      expect(prompt).toContain(TOOL_HEADING);
    });

    it('includes section when multiple flags are true', () => {
      const prompt = buildPrompt({ hasProducts: true, hasServices: true, hasBooking: true });
      expect(prompt).toContain(TOOL_HEADING);
    });

    it('does NOT include section when none of the three flags are true', () => {
      const prompt = buildPrompt({});
      expect(prompt).not.toContain(TOOL_HEADING);
    });

    it('does NOT include section for default signals', () => {
      const prompt = buildPrompt({});
      expect(prompt).not.toContain(TOOL_HEADING);
    });

    it('section appears exactly once when included', () => {
      const prompt = buildPrompt({ hasProducts: true, hasServices: true });
      const firstIdx = prompt.indexOf(TOOL_HEADING);
      const secondIdx = prompt.indexOf(TOOL_HEADING, firstIdx + 1);
      expect(firstIdx).toBeGreaterThan(-1);
      expect(secondIdx).toBe(-1);
    });
  });

  // ── Section content ──────────────────────────────────────────────

  describe('section content', () => {
    const prompt = buildPrompt({ hasProducts: true });

    it('contains "Use tools immediately" instruction', () => {
      expect(prompt).toContain('Use tools immediately');
    });

    it('contains "Search first to get IDs" instruction', () => {
      expect(prompt).toContain('Search first to get IDs');
    });

    it('contains "Don\'t ask for budget" instruction', () => {
      expect(prompt).toContain("Don't ask for budget");
    });

    it('contains "Remember conversation context" instruction', () => {
      expect(prompt).toContain('Remember conversation context');
    });

    it('contains "Verify before confirming" instruction', () => {
      expect(prompt).toContain('Verify before confirming');
    });

    it('contains "Search before recommending" instruction', () => {
      expect(prompt).toContain('Search before recommending');
    });

    it('contains "When to call tools" subsection', () => {
      expect(prompt).toContain('### When to call tools');
    });

    it('contains "Context and memory" subsection', () => {
      expect(prompt).toContain('### Context and memory');
    });

    it('contains "Accuracy" subsection', () => {
      expect(prompt).toContain('### Accuracy');
    });
  });

  // ── Section ordering ──────────────────────────────────────────────

  describe('section ordering', () => {
    it('tool guidelines appear after Response Guidelines', () => {
      const prompt = buildPrompt({ hasProducts: true });
      const guidelinesIdx = prompt.indexOf('## Response Guidelines');
      const toolIdx = prompt.indexOf(TOOL_HEADING);

      expect(guidelinesIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeGreaterThan(guidelinesIdx);
    });

    it('tool guidelines appear before Security Rules', () => {
      const prompt = buildPrompt({ hasProducts: true });
      const toolIdx = prompt.indexOf(TOOL_HEADING);
      const securityIdx = prompt.indexOf('## Security Rules');

      expect(toolIdx).toBeGreaterThan(-1);
      expect(securityIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeLessThan(securityIdx);
    });

    it('tool guidelines appear before B2B section (for B2B sites)', () => {
      const prompt = buildPrompt({ hasProducts: true, businessType: 'b2b' });
      const toolIdx = prompt.indexOf(TOOL_HEADING);
      const b2bIdx = prompt.indexOf('## Visitor Business Discovery');

      expect(toolIdx).toBeGreaterThan(-1);
      expect(b2bIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeLessThan(b2bIdx);
    });

    it('tool guidelines appear before Intent Examples', () => {
      const prompt = buildPrompt({ hasProducts: true });
      const toolIdx = prompt.indexOf(TOOL_HEADING);
      const intentIdx = prompt.indexOf('## How to Handle Different Questions');

      expect(toolIdx).toBeGreaterThan(-1);
      expect(intentIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeLessThan(intentIdx);
    });
  });

  // ── Regression: existing sections unaffected ──────────────────────

  describe('regression: existing sections unaffected', () => {
    it('non-tool prompts (default signals) still contain all standard sections', () => {
      const prompt = buildPrompt({});
      expect(prompt).toContain('## Communication Style');
      expect(prompt).toContain('## Business Information');
      expect(prompt).toContain('## Response Guidelines');
      expect(prompt).toContain('## How to Handle Different Questions');
      expect(prompt).toContain('## Starting the Conversation');
      expect(prompt).toContain('## Security Rules');
      expect(prompt).toContain('## Website Content');
    });

    it('B2B section still works when tool guidelines are also present', () => {
      const prompt = buildPrompt({ hasProducts: true, businessType: 'b2b' });
      expect(prompt).toContain(TOOL_HEADING);
      expect(prompt).toContain('## Visitor Business Discovery');
    });

    it('B2B section still present for b2b without tool-capable signals', () => {
      const prompt = buildPrompt({ businessType: 'b2b' });
      expect(prompt).not.toContain(TOOL_HEADING);
      expect(prompt).toContain('## Visitor Business Discovery');
    });

    it('options still work: includeContent=false omits content', () => {
      const website = createMockWebsite({ hasProducts: true });
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context, { includeContent: false });
      expect(prompt).toContain(TOOL_HEADING);
      expect(prompt).not.toContain('## Website Content');
    });

    it('options still work: includeSecurity=false omits security', () => {
      const website = createMockWebsite({ hasProducts: true });
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context, { includeSecurity: false });
      expect(prompt).toContain(TOOL_HEADING);
      expect(prompt).not.toContain('## Security Rules');
    });
  });
});

// ── getProactiveToolGuidelines() standalone ──────────────────────────

describe('getProactiveToolGuidelines()', () => {
  it('returns a non-empty string', () => {
    const result = getProactiveToolGuidelines();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('contains all key guideline phrases', () => {
    const result = getProactiveToolGuidelines();
    expect(result).toContain('Use tools immediately');
    expect(result).toContain('Search first to get IDs');
    expect(result).toContain("Don't ask for budget");
    expect(result).toContain('Remember conversation context');
    expect(result).toContain('Verify before confirming');
    expect(result).toContain('Search before recommending');
  });

  it('does NOT contain top-level ## heading (caller wraps it)', () => {
    const result = getProactiveToolGuidelines();
    // Should not start with or contain "## " at the beginning of a line
    // (### subheadings are fine — they're part of the content)
    expect(result).not.toMatch(/^## /m);
  });

  it('contains ### subheadings for structure', () => {
    const result = getProactiveToolGuidelines();
    expect(result).toContain('### When to call tools');
    expect(result).toContain('### Context and memory');
    expect(result).toContain('### Accuracy');
  });

  it('is deterministic (same output on repeated calls)', () => {
    const first = getProactiveToolGuidelines();
    const second = getProactiveToolGuidelines();
    expect(first).toBe(second);
  });

  it('content matches what buildToolGuidelines() uses internally', () => {
    // When buildSystemPrompt includes tool guidelines, the content should
    // match what getProactiveToolGuidelines() returns
    const prompt = buildPrompt({ hasProducts: true });
    const standalone = getProactiveToolGuidelines();
    expect(prompt).toContain(standalone);
  });
});
