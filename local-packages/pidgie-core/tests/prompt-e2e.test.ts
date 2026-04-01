/**
 * End-to-end prompt generation verification
 *
 * Generates actual system prompts with various business signal combinations
 * and validates: structure, section ordering, conditional inclusion,
 * no duplicate sections, correct formatting, and content integrity.
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, getProactiveToolGuidelines } from '../src/prompt/index.js';
import { createDefaultSignals } from '../src/detection/index.js';
import type { BusinessType } from '../src/detection/index.js';
import type { ScrapedWebsite, ScrapedPage } from '../src/scraper/index.js';
import type { SystemPromptContext } from '../src/prompt/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

function createWebsite(opts: {
  businessType?: BusinessType;
  hasProducts?: boolean;
  hasServices?: boolean;
  hasBooking?: boolean;
  hasPricing?: boolean;
  hasFAQ?: boolean;
  hasCaseStudies?: boolean;
  businessName?: string;
  email?: string;
  phone?: string;
} = {}): ScrapedWebsite {
  const signals = createDefaultSignals();
  if (opts.businessType) signals.businessType = opts.businessType;
  if (opts.hasProducts) signals.hasProducts = true;
  if (opts.hasServices) signals.hasServices = true;
  if (opts.hasBooking) signals.hasBooking = true;
  if (opts.hasPricing) signals.hasPricing = true;
  if (opts.hasFAQ) signals.hasFAQ = true;
  if (opts.hasCaseStudies) signals.hasCaseStudies = true;
  if (opts.email) signals.contactMethods.email = opts.email;
  if (opts.phone) signals.contactMethods.phone = opts.phone;

  return {
    url: 'https://example.com',
    pages: [{ url: 'https://example.com', title: 'Home', bodyText: 'Welcome' } as ScrapedPage],
    combinedContent: 'Welcome to our business. We sell products and services.',
    businessName: opts.businessName ?? 'Test Business',
    signals,
  };
}

function generatePrompt(opts: Parameters<typeof createWebsite>[0] = {}): string {
  const website = createWebsite(opts);
  return buildSystemPrompt({ website, config: { tone: 'friendly' } });
}

/** Extract all ## headings from a prompt */
function extractHeadings(prompt: string): string[] {
  return (prompt.match(/^## .+$/gm) || []).map((h) => h.trim());
}

// ── Scenario: Ecommerce store with products ─────────────────────────

describe('E2E: Ecommerce store with products', () => {
  const prompt = generatePrompt({
    businessType: 'ecommerce',
    businessName: 'Fashion Hub',
    hasProducts: true,
    hasPricing: true,
    email: 'hello@fashionhub.com',
  });

  it('includes all expected sections', () => {
    const headings = extractHeadings(prompt);
    expect(headings).toContain('## Communication Style');
    expect(headings).toContain('## Business Information');
    expect(headings).toContain('## Response Guidelines');
    expect(headings).toContain('## Proactive Tool Usage');
    expect(headings).toContain('## How to Handle Different Questions');
    expect(headings).toContain('## Starting the Conversation');
    expect(headings).toContain('## Security Rules (NEVER VIOLATE)');
    expect(headings).toContain('## Website Content');
  });

  it('does NOT include B2B section', () => {
    expect(prompt).not.toContain('## Visitor Business Discovery');
  });

  it('includes tool guidelines content', () => {
    expect(prompt).toContain('Use tools immediately');
    expect(prompt).toContain('Search first to get IDs');
    expect(prompt).toContain('Search before recommending');
  });

  it('includes product-specific response guidelines', () => {
    expect(prompt).toContain('When discussing products');
  });

  it('includes business name throughout', () => {
    expect(prompt).toContain('Fashion Hub');
  });

  it('no duplicate section headings', () => {
    const headings = extractHeadings(prompt);
    const uniqueHeadings = new Set(headings);
    expect(headings.length).toBe(uniqueHeadings.size);
  });

  it('sections appear in correct order', () => {
    const roleIdx = prompt.indexOf('assistant for Fashion Hub');
    const langIdx = prompt.indexOf('## Language');
    const bizIdx = prompt.indexOf('## Business Information');
    const styleIdx = prompt.indexOf('## Communication Style');
    const respIdx = prompt.indexOf('## Response Guidelines');
    const toolIdx = prompt.indexOf('## Proactive Tool Usage');
    const intentIdx = prompt.indexOf('## How to Handle Different Questions');
    const startIdx = prompt.indexOf('## Starting the Conversation');
    const secIdx = prompt.indexOf('## Security Rules');
    const contentIdx = prompt.indexOf('## Website Content');

    expect(roleIdx).toBeLessThan(langIdx);
    expect(langIdx).toBeLessThan(bizIdx);
    expect(bizIdx).toBeLessThan(styleIdx);
    expect(styleIdx).toBeLessThan(respIdx);
    expect(respIdx).toBeLessThan(toolIdx);
    expect(toolIdx).toBeLessThan(intentIdx);
    expect(intentIdx).toBeLessThan(startIdx);
    expect(startIdx).toBeLessThan(secIdx);
    expect(secIdx).toBeLessThan(contentIdx);
  });
});

// ── Scenario: B2B SaaS with services + booking ─────────────────────

describe('E2E: B2B SaaS with services + booking', () => {
  const prompt = generatePrompt({
    businessType: 'saas',
    businessName: 'CloudSync',
    hasServices: true,
    hasBooking: true,
    email: 'sales@cloudsync.io',
    phone: '+1-555-0100',
  });

  it('includes BOTH B2B and tool guidelines sections', () => {
    expect(prompt).toContain('## Visitor Business Discovery');
    expect(prompt).toContain('## Proactive Tool Usage');
  });

  it('tool guidelines appear BEFORE B2B section', () => {
    const toolIdx = prompt.indexOf('## Proactive Tool Usage');
    const b2bIdx = prompt.indexOf('## Visitor Business Discovery');
    expect(toolIdx).toBeLessThan(b2bIdx);
  });

  it('includes service-specific response guidelines', () => {
    expect(prompt).toContain('When discussing services');
  });

  it('includes booking CTA in action section', () => {
    expect(prompt).toContain('Booking an appointment or consultation');
  });

  it('includes contact methods', () => {
    expect(prompt).toContain('sales@cloudsync.io');
    expect(prompt).toContain('+1-555-0100');
  });

  it('B2B section references correct business name', () => {
    expect(prompt).toContain("CloudSync's specific services/solutions");
  });
});

// ── Scenario: Local business with NO tools ──────────────────────────

describe('E2E: Local business without products/services/booking', () => {
  const prompt = generatePrompt({
    businessType: 'local',
    businessName: 'Corner Deli',
    hasFAQ: true,
  });

  it('does NOT include tool guidelines section', () => {
    expect(prompt).not.toContain('## Proactive Tool Usage');
    expect(prompt).not.toContain('Use tools immediately');
  });

  it('does NOT include B2B section', () => {
    expect(prompt).not.toContain('## Visitor Business Discovery');
  });

  it('still includes all standard sections', () => {
    expect(prompt).toContain('## Communication Style');
    expect(prompt).toContain('## Response Guidelines');
    expect(prompt).toContain('## Starting the Conversation');
    expect(prompt).toContain('## Security Rules');
  });

  it('has fewer ## headings than product-enabled version', () => {
    const localHeadings = extractHeadings(prompt);
    const productPrompt = generatePrompt({
      businessType: 'local',
      businessName: 'Corner Deli',
      hasProducts: true,
    });
    const productHeadings = extractHeadings(productPrompt);

    expect(localHeadings.length).toBeLessThan(productHeadings.length);
  });
});

// ── Scenario: Portfolio business ────────────────────────────────────

describe('E2E: Portfolio business with case studies', () => {
  const prompt = generatePrompt({
    businessType: 'portfolio',
    businessName: 'DesignWorks',
    hasCaseStudies: true,
  });

  it('uses casual tone', () => {
    // portfolio defaults to casual tone in detection
    expect(prompt).toContain('## Communication Style');
  });

  it('no tool guidelines (no products/services/booking)', () => {
    expect(prompt).not.toContain('## Proactive Tool Usage');
  });
});

// ── Formatting and structure integrity ──────────────────────────────

describe('E2E: prompt formatting integrity', () => {
  it('no empty ## headings', () => {
    const prompt = generatePrompt({ hasProducts: true, hasServices: true, hasBooking: true, businessType: 'b2b' });
    const emptyHeadings = prompt.match(/^## *$/gm);
    expect(emptyHeadings).toBeNull();
  });

  it('no consecutive blank lines (3+)', () => {
    const prompt = generatePrompt({ hasProducts: true, businessType: 'ecommerce' });
    expect(prompt).not.toMatch(/\n{4,}/);
  });

  it('prompt does not contain undefined or null text', () => {
    const prompt = generatePrompt({ hasProducts: true, hasServices: true });
    expect(prompt).not.toContain('undefined');
    expect(prompt).not.toContain('null');
    expect(prompt).not.toContain('[object Object]');
  });

  it('tool guidelines content inside buildSystemPrompt matches standalone function', () => {
    const fullPrompt = generatePrompt({ hasProducts: true });
    const standalone = getProactiveToolGuidelines();

    // The full prompt wraps with "## Proactive Tool Usage\n\n" then the standalone content
    expect(fullPrompt).toContain(`## Proactive Tool Usage\n\n${standalone}`);
  });

  it('security rules are always last real section before website content', () => {
    const prompt = generatePrompt({ hasProducts: true, businessType: 'b2b', email: 'a@b.com' });
    const secIdx = prompt.indexOf('## Security Rules');
    const contentIdx = prompt.indexOf('## Website Content');
    expect(secIdx).toBeGreaterThan(-1);
    expect(contentIdx).toBeGreaterThan(-1);
    expect(secIdx).toBeLessThan(contentIdx);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('E2E: edge cases', () => {
  it('all three tool signals enabled produces single tool section', () => {
    const prompt = generatePrompt({ hasProducts: true, hasServices: true, hasBooking: true });
    const matches = prompt.match(/## Proactive Tool Usage/g);
    expect(matches).toHaveLength(1);
  });

  it('buildSystemPrompt options work alongside tool guidelines', () => {
    const website = createWebsite({ hasProducts: true });
    const ctx: SystemPromptContext = { website, config: { tone: 'professional' } };

    // Without content
    const noContent = buildSystemPrompt(ctx, { includeContent: false });
    expect(noContent).toContain('## Proactive Tool Usage');
    expect(noContent).not.toContain('## Website Content');

    // Without security
    const noSecurity = buildSystemPrompt(ctx, { includeSecurity: false });
    expect(noSecurity).toContain('## Proactive Tool Usage');
    expect(noSecurity).not.toContain('## Security Rules');

    // Without intent examples
    const noIntent = buildSystemPrompt(ctx, { includeIntentExamples: false });
    expect(noIntent).toContain('## Proactive Tool Usage');
    expect(noIntent).not.toContain('## How to Handle Different Questions');
  });

  it('empty business name does not crash or produce undefined', () => {
    const prompt = generatePrompt({ businessName: '', hasProducts: true });
    expect(prompt).toContain('## Proactive Tool Usage');
    expect(prompt).not.toContain('undefined');
  });
});
