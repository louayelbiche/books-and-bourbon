import { describe, test, expect } from 'vitest';
import {
  DEFAULT_CARD_LABELS,
  FR_CARD_LABELS,
  AR_CARD_LABELS,
  getCardLabels,
  interpolateLabel,
} from '../src/validation/card-labels.js';

describe('getCardLabels', () => {
  test('returns English labels for "en"', () => {
    const labels = getCardLabels('en');
    expect(labels).toBe(DEFAULT_CARD_LABELS);
    expect(labels.businessBreakdown.services).toBe('Services');
  });

  test('returns French labels for "fr"', () => {
    const labels = getCardLabels('fr');
    expect(labels).toBe(FR_CARD_LABELS);
    expect(labels.businessBreakdown.products).toBe('Produits');
  });

  test('returns Arabic labels for "ar"', () => {
    const labels = getCardLabels('ar');
    expect(labels).toBe(AR_CARD_LABELS);
    expect(labels.businessBreakdown.services).toBe('الخدمات');
  });

  test('falls back to English for unknown locale', () => {
    const labels = getCardLabels('zh');
    expect(labels).toBe(DEFAULT_CARD_LABELS);
  });

  test('all locales have same keys', () => {
    const enKeys = Object.keys(DEFAULT_CARD_LABELS.businessBreakdown);
    const frKeys = Object.keys(FR_CARD_LABELS.businessBreakdown);
    const arKeys = Object.keys(AR_CARD_LABELS.businessBreakdown);
    expect(frKeys).toEqual(enKeys);
    expect(arKeys).toEqual(enKeys);

    const enChromeKeys = Object.keys(DEFAULT_CARD_LABELS.chrome);
    const frChromeKeys = Object.keys(FR_CARD_LABELS.chrome);
    const arChromeKeys = Object.keys(AR_CARD_LABELS.chrome);
    expect(frChromeKeys).toEqual(enChromeKeys);
    expect(arChromeKeys).toEqual(enChromeKeys);
  });
});

describe('interpolateLabel', () => {
  test('replaces single placeholder', () => {
    expect(interpolateLabel('{count} FAQs available', { count: 5 }))
      .toBe('5 FAQs available');
  });

  test('replaces multiple placeholders', () => {
    expect(interpolateLabel('+{count} more from {source}', { count: 3, source: 'DB' }))
      .toBe('+3 more from DB');
  });

  test('keeps unmatched placeholders', () => {
    expect(interpolateLabel('{count} items from {source}', { count: 5 }))
      .toBe('5 items from {source}');
  });

  test('handles numeric values', () => {
    expect(interpolateLabel('{count} FAQ available', { count: 1 }))
      .toBe('1 FAQ available');
  });

  test('handles string with no placeholders', () => {
    expect(interpolateLabel('No placeholders here', { count: 1 }))
      .toBe('No placeholders here');
  });
});
