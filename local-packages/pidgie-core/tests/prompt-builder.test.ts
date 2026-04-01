/**
 * Tests for buildSystemPrompt: Sales DNA, B2B Visitor Discovery, and section structure
 */

import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildSystemPromptLegacy } from '../src/prompt/index.js';
import { createDefaultSignals } from '../src/detection/index.js';
import type { BusinessType, Tone } from '../src/detection/index.js';
import type { ScrapedWebsite } from '../src/scraper/index.js';
import type { SystemPromptContext } from '../src/prompt/index.js';

// ── Helpers ──────────────────────────────────────────────────────────

function createMockWebsite(overrides: Partial<ScrapedWebsite> & { businessType?: BusinessType } = {}): ScrapedWebsite {
  const { businessType, ...rest } = overrides;
  const signals = createDefaultSignals();
  if (businessType) {
    signals.businessType = businessType;
  }
  return {
    url: 'https://example.com',
    pages: [],
    combinedContent: 'Sample website content.',
    businessName: 'Acme Corp',
    signals,
    ...rest,
  };
}

function buildPromptForType(businessType: BusinessType, businessName = 'Acme Corp', tone: Tone = 'friendly'): string {
  const website = createMockWebsite({ businessType, businessName });
  const context: SystemPromptContext = { website, config: { tone } };
  return buildSystemPrompt(context);
}

const B2B_HEADING = '## Visitor Business Discovery';
const B2B_TYPES: BusinessType[] = ['b2b', 'services', 'saas'];
const NON_B2B_TYPES: BusinessType[] = ['ecommerce', 'local', 'portfolio', 'other'];

// ── Activation by business type ──────────────────────────────────────

describe('buildSystemPrompt — B2B Visitor Discovery section', () => {
  describe('activation by business type', () => {
    it.each(B2B_TYPES)('includes section when businessType is "%s"', (type) => {
      const prompt = buildPromptForType(type);
      expect(prompt).toContain(B2B_HEADING);
    });

    it.each(NON_B2B_TYPES)('does NOT include section when businessType is "%s"', (type) => {
      const prompt = buildPromptForType(type);
      expect(prompt).not.toContain(B2B_HEADING);
    });

    it('covers all 7 BusinessType values', () => {
      const allTypes: BusinessType[] = [...B2B_TYPES, ...NON_B2B_TYPES];
      expect(allTypes).toHaveLength(7);
      // Ensure no duplicates
      expect(new Set(allTypes).size).toBe(7);
    });
  });

  // ── Section content ──────────────────────────────────────────────

  describe('section content', () => {
    const prompt = buildPromptForType('b2b');

    it('contains "Visitor Business Discovery" heading', () => {
      expect(prompt).toContain('## Visitor Business Discovery');
    });

    it('contains "fetch_website tool" instruction', () => {
      expect(prompt).toContain('fetch_website tool');
    });

    it('contains rapport-building instruction (do NOT ask on first message)', () => {
      expect(prompt).toContain('Do NOT ask for their URL on the first message');
    });

    it('contains "Build rapport first" instruction', () => {
      expect(prompt).toContain('Build rapport first');
    });

    it('contains URL request framing language', () => {
      expect(prompt).toContain('I\'d love to take a quick look at your website');
    });

    it('contains consulting-style response example', () => {
      expect(prompt).toContain('Based on what I see on your site');
    });

    it('references the business name dynamically', () => {
      expect(prompt).toContain('Acme Corp\'s specific services/solutions');
    });

    it('contains all 5 numbered steps', () => {
      expect(prompt).toContain('1. Ask what their company does');
      expect(prompt).toContain('2. Ask for their website URL');
      expect(prompt).toContain('3. When they provide a URL, use the fetch_website tool');
      expect(prompt).toContain('4. Once you have their business context');
      expect(prompt).toContain('5. Reference their industry, offerings, and challenges');
    });

    it('instructs to "make it personal"', () => {
      expect(prompt).toContain('Make it personal');
    });

    it('contains the "Instead of" example pattern', () => {
      expect(prompt).toContain('Instead of "We offer web development services"');
      expect(prompt).toContain('{specific service}');
      expect(prompt).toContain('{their specific use case}');
    });

    it('mentions "After 2-3 exchanges" timing guidance', () => {
      expect(prompt).toContain('After 2-3 exchanges');
    });
  });

  // ── Content consistency across B2B types ───────────────────────────

  describe('content consistency across B2B types', () => {
    it('produces identical B2B section content for b2b, services, and saas (same business name)', () => {
      const extractSection = (prompt: string): string => {
        const start = prompt.indexOf(B2B_HEADING);
        const afterSection = prompt.indexOf('\n## ', start + B2B_HEADING.length);
        return prompt.slice(start, afterSection > -1 ? afterSection : undefined);
      };

      const b2bSection = extractSection(buildPromptForType('b2b', 'TestCo'));
      const servicesSection = extractSection(buildPromptForType('services', 'TestCo'));
      const saasSection = extractSection(buildPromptForType('saas', 'TestCo'));

      expect(b2bSection).toBe(servicesSection);
      expect(b2bSection).toBe(saasSection);
    });
  });

  // ── Business name interpolation ────────────────────────────────────

  describe('business name interpolation', () => {
    it('includes exact business name for b2b site', () => {
      const prompt = buildPromptForType('b2b', 'CloudSync Solutions');
      expect(prompt).toContain('CloudSync Solutions\'s specific services/solutions');
    });

    it('includes exact business name for services site', () => {
      const prompt = buildPromptForType('services', 'McKinsey & Co');
      expect(prompt).toContain('McKinsey & Co\'s specific services/solutions');
    });

    it('includes exact business name for saas site', () => {
      const prompt = buildPromptForType('saas', 'DataPipe.io');
      expect(prompt).toContain('DataPipe.io\'s specific services/solutions');
    });

    it('handles business name with ampersand', () => {
      const prompt = buildPromptForType('b2b', 'Johnson & Johnson');
      expect(prompt).toContain('Johnson & Johnson\'s specific services/solutions');
    });

    it('handles business name with quotes', () => {
      const prompt = buildPromptForType('b2b', 'The "Best" Agency');
      expect(prompt).toContain('The "Best" Agency\'s specific services/solutions');
    });

    it('handles business name with angle brackets', () => {
      const prompt = buildPromptForType('b2b', 'Corp <Enterprise>');
      expect(prompt).toContain('Corp <Enterprise>\'s specific services/solutions');
    });

    it('handles business name with unicode characters', () => {
      const prompt = buildPromptForType('b2b', 'Über Solutions GmbH');
      expect(prompt).toContain('Über Solutions GmbH\'s specific services/solutions');
    });

    it('handles very long business name', () => {
      const longName = 'International Business Machines Corporation and Associated Global Partners';
      const prompt = buildPromptForType('b2b', longName);
      expect(prompt).toContain(`${longName}'s specific services/solutions`);
    });

    it('handles business name with newline characters (no injection)', () => {
      const prompt = buildPromptForType('b2b', 'Line1\nLine2');
      expect(prompt).toContain('Line1\nLine2\'s specific services/solutions');
    });

    it('handles empty business name gracefully', () => {
      const prompt = buildPromptForType('b2b', '');
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).toContain('\'s specific services/solutions');
    });
  });

  // ── Section ordering ───────────────────────────────────────────────

  describe('section ordering', () => {
    it('B2B section appears after Response Guidelines and before Intent Examples', () => {
      const prompt = buildPromptForType('b2b');
      const guidelinesIdx = prompt.indexOf('## Response Guidelines');
      const b2bIdx = prompt.indexOf(B2B_HEADING);
      const intentIdx = prompt.indexOf('## How to Handle Different Questions');

      expect(guidelinesIdx).toBeGreaterThan(-1);
      expect(b2bIdx).toBeGreaterThan(-1);
      expect(intentIdx).toBeGreaterThan(-1);

      expect(b2bIdx).toBeGreaterThan(guidelinesIdx);
      expect(b2bIdx).toBeLessThan(intentIdx);
    });

    it('B2B section appears before Security Rules', () => {
      const prompt = buildPromptForType('b2b');
      const b2bIdx = prompt.indexOf(B2B_HEADING);
      const securityIdx = prompt.indexOf('## Security Rules');

      expect(b2bIdx).toBeGreaterThan(-1);
      expect(securityIdx).toBeGreaterThan(-1);
      expect(b2bIdx).toBeLessThan(securityIdx);
    });

    it('B2B section appears after Communication Style', () => {
      const prompt = buildPromptForType('b2b');
      const styleIdx = prompt.indexOf('## Communication Style');
      const b2bIdx = prompt.indexOf(B2B_HEADING);

      expect(styleIdx).toBeGreaterThan(-1);
      expect(b2bIdx).toBeGreaterThan(styleIdx);
    });

    it('B2B section appears exactly once (no duplication)', () => {
      const prompt = buildPromptForType('b2b');
      const firstIdx = prompt.indexOf(B2B_HEADING);
      const secondIdx = prompt.indexOf(B2B_HEADING, firstIdx + 1);
      expect(firstIdx).toBeGreaterThan(-1);
      expect(secondIdx).toBe(-1);
    });

    it('non-B2B prompts have one fewer section than B2B prompts', () => {
      const b2bPrompt = buildPromptForType('b2b');
      const ecommercePrompt = buildPromptForType('ecommerce');

      const countSections = (text: string) => (text.match(/^## /gm) || []).length;
      expect(countSections(b2bPrompt)).toBe(countSections(ecommercePrompt) + 1);
    });
  });

  // ── Interaction with options ───────────────────────────────────────

  describe('interaction with options', () => {
    const website = createMockWebsite({ businessType: 'b2b' });
    const context: SystemPromptContext = { website, config: { tone: 'friendly' } };

    it('B2B section present when includeContent is false', () => {
      const prompt = buildSystemPrompt(context, { includeContent: false });
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).not.toContain('## Website Content');
    });

    it('B2B section present when includeSecurity is false', () => {
      const prompt = buildSystemPrompt(context, { includeSecurity: false });
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).not.toContain('## Security Rules');
    });

    it('B2B section present when includeIntentExamples is false', () => {
      const prompt = buildSystemPrompt(context, { includeIntentExamples: false });
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).not.toContain('## How to Handle Different Questions');
    });

    it('B2B section present when all options are false', () => {
      const prompt = buildSystemPrompt(context, {
        includeContent: false,
        includeSecurity: false,
        includeIntentExamples: false,
      });
      expect(prompt).toContain(B2B_HEADING);
    });

    it('B2B section not affected by maxContentLength', () => {
      const prompt = buildSystemPrompt(context, { maxContentLength: 10 });
      expect(prompt).toContain(B2B_HEADING);
      // Should still have full B2B content despite content truncation
      expect(prompt).toContain('fetch_website tool');
      expect(prompt).toContain('Build rapport first');
    });
  });

  // ── Tone variations ────────────────────────────────────────────────

  describe('tone variations', () => {
    const tones: Tone[] = ['friendly', 'professional', 'casual'];

    it.each(tones)('B2B section is included with "%s" tone', (tone) => {
      const prompt = buildPromptForType('b2b', 'Acme Corp', tone);
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).toContain('fetch_website tool');
    });

    it('B2B section content is identical regardless of tone', () => {
      const extractSection = (prompt: string): string => {
        const start = prompt.indexOf(B2B_HEADING);
        const afterSection = prompt.indexOf('\n## ', start + B2B_HEADING.length);
        return prompt.slice(start, afterSection > -1 ? afterSection : undefined);
      };

      const friendly = extractSection(buildPromptForType('b2b', 'Acme Corp', 'friendly'));
      const professional = extractSection(buildPromptForType('b2b', 'Acme Corp', 'professional'));
      const casual = extractSection(buildPromptForType('b2b', 'Acme Corp', 'casual'));

      expect(friendly).toBe(professional);
      expect(friendly).toBe(casual);
    });
  });

  // ── Custom instructions interaction ────────────────────────────────

  describe('custom instructions interaction', () => {
    it('B2B section coexists with custom instructions', () => {
      const website = createMockWebsite({ businessType: 'b2b' });
      const context: SystemPromptContext = {
        website,
        config: { tone: 'friendly', customInstructions: 'Always greet in French.' },
      };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain(B2B_HEADING);
      expect(prompt).toContain('Always greet in French.');
    });

    it('custom instructions section appears after B2B section', () => {
      const website = createMockWebsite({ businessType: 'b2b' });
      const context: SystemPromptContext = {
        website,
        config: { tone: 'friendly', customInstructions: 'Custom rule here.' },
      };
      const prompt = buildSystemPrompt(context);
      const b2bIdx = prompt.indexOf(B2B_HEADING);
      const customIdx = prompt.indexOf('## Additional Instructions');

      expect(b2bIdx).toBeGreaterThan(-1);
      expect(customIdx).toBeGreaterThan(-1);
      expect(customIdx).toBeGreaterThan(b2bIdx);
    });
  });

  // ── Legacy function ────────────────────────────────────────────────

  describe('buildSystemPromptLegacy', () => {
    it('includes B2B section for b2b business type', () => {
      const website = createMockWebsite({ businessType: 'b2b' });
      const prompt = buildSystemPromptLegacy(website);
      expect(prompt).toContain(B2B_HEADING);
    });

    it('includes B2B section for services business type', () => {
      const website = createMockWebsite({ businessType: 'services' });
      const prompt = buildSystemPromptLegacy(website);
      expect(prompt).toContain(B2B_HEADING);
    });

    it('includes B2B section for saas business type', () => {
      const website = createMockWebsite({ businessType: 'saas' });
      const prompt = buildSystemPromptLegacy(website);
      expect(prompt).toContain(B2B_HEADING);
    });

    it('does NOT include B2B section for ecommerce', () => {
      const website = createMockWebsite({ businessType: 'ecommerce' });
      const prompt = buildSystemPromptLegacy(website);
      expect(prompt).not.toContain(B2B_HEADING);
    });
  });

  // ── Signals interaction ────────────────────────────────────────────

  describe('signals interaction', () => {
    it('B2B section present even with empty signals (only businessType set)', () => {
      const prompt = buildPromptForType('b2b');
      expect(prompt).toContain(B2B_HEADING);
    });

    it('B2B section present with rich signals (products, services, pricing)', () => {
      const website = createMockWebsite({ businessType: 'b2b' });
      website.signals.hasProducts = true;
      website.signals.hasServices = true;
      website.signals.hasPricing = true;
      website.signals.hasCaseStudies = true;
      website.signals.hasTeamPage = true;
      website.signals.contactMethods.email = 'info@acme.com';
      website.signals.contactMethods.phone = '+1-555-0100';

      const context: SystemPromptContext = { website, config: { tone: 'professional' } };
      const prompt = buildSystemPrompt(context);

      expect(prompt).toContain(B2B_HEADING);
      // Other sections should also be enriched
      expect(prompt).toContain('products/catalog');
      expect(prompt).toContain('professional services');
      expect(prompt).toContain('info@acme.com');
    });

    it('non-B2B type with rich B2B-like signals still does NOT get B2B section', () => {
      const website = createMockWebsite({ businessType: 'ecommerce' });
      website.signals.hasServices = true;
      website.signals.hasCaseStudies = true;
      website.signals.hasTeamPage = true;

      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).not.toContain(B2B_HEADING);
    });
  });

  // ── Full prompt structure ──────────────────────────────────────────

  describe('full prompt structure', () => {
    it('B2B prompt contains all expected sections in order', () => {
      const prompt = buildPromptForType('b2b');
      const sections = [
        'assistant for Acme Corp',    // Role
        '## Business Information',
        '## Communication Style',
        '## Response Guidelines',
        '## Sales Guidelines',
        '## Lead Capture Guidelines',
        '## Visitor Business Discovery',
        '## How to Handle Different Questions',
        '## Starting the Conversation',
        '## Security Rules',
        '## Request Escalation',
        '## Website Content',
      ];

      let lastIdx = -1;
      for (const section of sections) {
        const idx = prompt.indexOf(section);
        expect(idx).toBeGreaterThan(-1);
        expect(idx).toBeGreaterThan(lastIdx);
        lastIdx = idx;
      }
    });

    it('non-B2B prompt has all sections except Visitor Business Discovery', () => {
      const prompt = buildPromptForType('ecommerce');
      expect(prompt).toContain('## Business Information');
      expect(prompt).toContain('## Communication Style');
      expect(prompt).toContain('## Response Guidelines');
      expect(prompt).toContain('## Sales Guidelines');
      expect(prompt).toContain('## Lead Capture Guidelines');
      expect(prompt).not.toContain('## Visitor Business Discovery');
      expect(prompt).toContain('## How to Handle Different Questions');
      expect(prompt).toContain('## Starting the Conversation');
      expect(prompt).toContain('## Security Rules');
      expect(prompt).toContain('## Website Content');
    });
  });
});

// =====================================================================
// Sales DNA tests (PRD-053)
// =====================================================================

describe('buildSystemPrompt: Sales DNA (PRD-053)', () => {
  describe('role section', () => {
    it('contains "salesperson" in role description', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('salesperson');
    });

    it('does NOT contain "Never be pushy"', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).not.toContain('Never be pushy');
    });

    it('contains buying signals instruction', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('buying signals');
    });

    it('contains cross-reference instruction', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('cross-reference');
    });

    it('prohibits aggressive or manipulative tactics', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('Never be aggressive');
      expect(prompt).toContain('manipulative');
    });
  });

  describe('sales guidelines section', () => {
    it('is present in all prompts', () => {
      const prompt = buildPromptForType('ecommerce');
      expect(prompt).toContain('## Sales Guidelines');
    });

    it('contains interest signal detection (HIGH INTENT, DISCOVERY, EVALUATION)', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('HIGH INTENT');
      expect(prompt).toContain('DISCOVERY');
      expect(prompt).toContain('EVALUATION');
    });

    it('includes booking CTA when business has booking', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasBooking = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('booking a consultation');
    });

    it('does NOT include booking CTA when business lacks booking', () => {
      const website = createMockWebsite({ businessType: 'ecommerce' });
      website.signals.hasBooking = false;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).not.toContain('Suggest booking a consultation');
    });

    it('includes cross-referencing when 2+ capability types', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasProducts = true;
      website.signals.hasServices = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('Natural Cross-Referencing');
    });

    it('omits cross-referencing when only 1 capability type', () => {
      const website = createMockWebsite({ businessType: 'other' });
      // Only hasProducts, nothing else
      website.signals.hasProducts = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).not.toContain('Natural Cross-Referencing');
    });

    it('contains End With Momentum section', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('End With Momentum');
    });

    it('includes email contact in action options', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.contactMethods.email = 'hello@test.com';
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('hello@test.com');
    });
  });

  describe('lead capture guidelines', () => {
    it('is present in all prompts', () => {
      const prompt = buildPromptForType('ecommerce');
      expect(prompt).toContain('## Lead Capture Guidelines');
    });

    it('references businessName', () => {
      const prompt = buildPromptForType('services', 'TestBiz');
      expect(prompt).toContain('someone from TestBiz');
    });

    it('mentions 3+ exchanges rule', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('3+ exchanges');
    });

    it('mentions submit_request tool', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('submit_request');
    });

    it('prohibits first-message lead capture', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('NEVER offer lead capture on the first message');
    });
  });

  describe('escalation guidelines with opportunity triggers', () => {
    it('contains original failure triggers', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('cannot find a confident answer');
      expect(prompt).toContain('asks for a human');
    });

    it('contains opportunity-based triggers', () => {
      const prompt = buildPromptForType('services');
      expect(prompt).toContain('buying intent');
      expect(prompt).toContain('custom consultation');
      expect(prompt).toContain('Enterprise or custom pricing');
      expect(prompt).toContain('Timeline or deadline');
    });
  });

  describe('intent examples with CTAs', () => {
    it('pricing intent suggests reaching out for a quote', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasPricing = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('suggest reaching out for a quote or booking');
    });

    it('discovery intent invites next step', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasServices = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('Invite them to experience it or take the next step');
    });

    it('comparison intent includes action question', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasServices = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('Would you like to see how it works for your situation?');
    });
  });

  describe('conversation starter with explore invitation', () => {
    it('includes exploration invitation when capabilities exist', () => {
      const website = createMockWebsite({ businessType: 'services' });
      website.signals.hasServices = true;
      website.signals.hasPricing = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      expect(prompt).toContain('Feel free to ask about any of these, or tell me what you\'re looking for');
    });
  });

  describe('section ordering with new sections', () => {
    it('Sales Guidelines appears after Response Guidelines', () => {
      const prompt = buildPromptForType('services');
      const responseIdx = prompt.indexOf('## Response Guidelines');
      const salesIdx = prompt.indexOf('## Sales Guidelines');
      expect(responseIdx).toBeGreaterThan(-1);
      expect(salesIdx).toBeGreaterThan(-1);
      expect(salesIdx).toBeGreaterThan(responseIdx);
    });

    it('Lead Capture appears after Sales Guidelines', () => {
      const prompt = buildPromptForType('services');
      const salesIdx = prompt.indexOf('## Sales Guidelines');
      const leadIdx = prompt.indexOf('## Lead Capture Guidelines');
      expect(salesIdx).toBeGreaterThan(-1);
      expect(leadIdx).toBeGreaterThan(-1);
      expect(leadIdx).toBeGreaterThan(salesIdx);
    });

    it('Sales and Lead Capture appear before Tool Guidelines for b2b', () => {
      const website = createMockWebsite({ businessType: 'b2b' });
      website.signals.hasProducts = true;
      const context: SystemPromptContext = { website, config: { tone: 'friendly' } };
      const prompt = buildSystemPrompt(context);
      const leadIdx = prompt.indexOf('## Lead Capture Guidelines');
      const toolIdx = prompt.indexOf('## Proactive Tool Usage');
      expect(leadIdx).toBeGreaterThan(-1);
      expect(toolIdx).toBeGreaterThan(-1);
      expect(leadIdx).toBeLessThan(toolIdx);
    });
  });
});
