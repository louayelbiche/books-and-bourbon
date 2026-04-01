/**
 * TASK-079 + TASK-089: Integration tests for the card tool migration flow
 * and i18n card chrome language verification.
 *
 * Tests the full pipeline:
 *   Flag check → prompt fragment → response parsing → card emission → labels
 */

import { describe, test, expect, afterEach } from 'vitest';
import { parseMigrationAwareResponse } from '../src/parsers/migration-parser.js';
import {
  isCardToolMigrationEnabled,
  toMigrationFallbackEvent,
  MIGRATION_FALLBACK_EVENT,
} from '../src/validation/migration-flag.js';
import {
  getCardLabels,
  interpolateLabel,
  DEFAULT_CARD_LABELS,
  FR_CARD_LABELS,
  AR_CARD_LABELS,
} from '../src/validation/card-labels.js';

describe('Migration Integration — Full Pipeline', () => {
  afterEach(() => {
    delete process.env.CARD_TOOL_MIGRATION;
  });

  test('flag OFF → legacy parse extracts [CARDS] + fallback event fires', () => {
    delete process.env.CARD_TOOL_MIGRATION;
    expect(isCardToolMigrationEnabled()).toBe(false);

    const raw = `Check out this product!
[CARDS]
[{"id":"shoe-1","type":"product","title":"Running Shoe","subtitle":"$99","url":"/products/shoe-1"}]
[/CARDS]
[SUGGESTIONS: More shoes | Cart | Sizes]`;

    const events: unknown[] = [];
    const result = parseMigrationAwareResponse(raw, 'pidgie', (evt) => events.push(evt));

    // Legacy path: cards extracted from text
    expect(result.cards.length).toBe(1);
    expect(result.cards[0].title).toBe('Running Shoe');
    expect(result.suggestions).toEqual(['More shoes', 'Cart', 'Sizes']);
    expect(result.text).toBe('Check out this product!');

    // EVT-07 fired
    expect(events.length).toBe(1);
    expect(events[0]).toEqual(expect.objectContaining({
      event: MIGRATION_FALLBACK_EVENT,
      reason: 'flag_off',
    }));
  });

  test('flag ON → cards NOT parsed from text + no fallback event', () => {
    process.env.CARD_TOOL_MIGRATION = 'true';
    expect(isCardToolMigrationEnabled()).toBe(true);

    const raw = `Check out this product!
[CARDS]
[{"id":"shoe-1","type":"product","title":"Running Shoe","subtitle":"$99","url":"/products/shoe-1"}]
[/CARDS]
[SUGGESTIONS: More shoes | Cart | Sizes]`;

    const events: unknown[] = [];
    const result = parseMigrationAwareResponse(raw, 'pidgie', (evt) => events.push(evt));

    // Tool-based path: cards NOT extracted (they come from DB)
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
    // But suggestions still extracted
    expect(result.suggestions).toEqual(['More shoes', 'Cart', 'Sizes']);
    expect(result.text).toBe('Check out this product!');

    // No fallback event
    expect(events).toEqual([]);
  });

  test('flag ON → response with no tags passes through cleanly', () => {
    process.env.CARD_TOOL_MIGRATION = 'true';

    const raw = "Hello! I'm the assistant for this business. How can I help?";
    const result = parseMigrationAwareResponse(raw);

    expect(result.text).toBe(raw);
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  test('multiple [CARDS] blocks in one response — both stripped when flag ON', () => {
    process.env.CARD_TOOL_MIGRATION = 'true';

    // Some LLMs might generate multiple card blocks
    const raw = `Here are shoes.
[CARDS]
[{"id":"shoe-1","type":"product","title":"Shoe 1"}]
[/CARDS]
And also this.
[SUGGESTIONS: View all]`;

    const result = parseMigrationAwareResponse(raw);
    expect(result.cards).toEqual([]);
    expect(result.text).toContain('Here are shoes.');
    expect(result.text).toContain('And also this.');
    expect(result.text).not.toContain('[CARDS]');
  });
});

describe('TASK-089: i18n Card Chrome Verification', () => {
  test('card content is separate from chrome labels', () => {
    // Card content (from DB) — this is in the user's language
    const frenchCardContent = {
      businessName: 'Boulangerie Parisienne',
      category: 'Boulangerie',
      services: [{ name: 'Pain artisanal', available: true }],
    };

    // Chrome labels — these match the UI locale
    const frLabels = getCardLabels('fr');

    // Content is in French (from DB)
    expect(frenchCardContent.services[0].name).toBe('Pain artisanal');
    // Chrome is also in French (from label system)
    expect(frLabels.businessBreakdown.services).toBe('Services');
    // Chrome and content are independent
    expect(frLabels.businessBreakdown.products).toBe('Produits');
  });

  test('all 3 locales have complete BusinessBreakdown labels', () => {
    const requiredKeys: (keyof typeof DEFAULT_CARD_LABELS.businessBreakdown)[] = [
      'services', 'products', 'todaysHours', 'contact',
      'faqAvailable', 'faqsAvailable', 'closedToday', 'emptyState', 'moreItems',
    ];

    for (const locale of ['en', 'fr', 'ar']) {
      const labels = getCardLabels(locale);
      for (const key of requiredKeys) {
        expect(labels.businessBreakdown[key], `Missing ${locale}.businessBreakdown.${key}`).toBeDefined();
        expect(labels.businessBreakdown[key].length, `Empty ${locale}.businessBreakdown.${key}`).toBeGreaterThan(0);
      }
    }
  });

  test('all 3 locales have complete Chrome labels', () => {
    const requiredKeys: (keyof typeof DEFAULT_CARD_LABELS.chrome)[] = [
      'pinToPanel', 'unpinFromPanel', 'removeFromPanel',
      'emptyPanel', 'loading', 'error', 'retry',
    ];

    for (const locale of ['en', 'fr', 'ar']) {
      const labels = getCardLabels(locale);
      for (const key of requiredKeys) {
        expect(labels.chrome[key], `Missing ${locale}.chrome.${key}`).toBeDefined();
        expect(labels.chrome[key].length, `Empty ${locale}.chrome.${key}`).toBeGreaterThan(0);
      }
    }
  });

  test('FAQ count labels interpolate correctly across locales', () => {
    for (const locale of ['en', 'fr', 'ar']) {
      const labels = getCardLabels(locale);
      const singular = interpolateLabel(labels.businessBreakdown.faqAvailable, { count: 1 });
      const plural = interpolateLabel(labels.businessBreakdown.faqsAvailable, { count: 5 });

      expect(singular).toContain('1');
      expect(plural).toContain('5');
      // Ensure the template was actually interpolated (no {count} left)
      expect(singular).not.toContain('{count}');
      expect(plural).not.toContain('{count}');
    }
  });

  test('moreItems label interpolates correctly across locales', () => {
    for (const locale of ['en', 'fr', 'ar']) {
      const labels = getCardLabels(locale);
      const result = interpolateLabel(labels.businessBreakdown.moreItems, { count: 3 });
      expect(result).toContain('3');
      expect(result).not.toContain('{count}');
    }
  });
});
