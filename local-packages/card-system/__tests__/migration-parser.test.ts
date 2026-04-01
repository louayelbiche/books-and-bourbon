import { describe, test, expect, afterEach, vi } from 'vitest';
import { parseMigrationAwareResponse } from '../src/parsers/migration-parser.js';

describe('parseMigrationAwareResponse', () => {
  afterEach(() => {
    delete process.env.CARD_TOOL_MIGRATION;
  });

  describe('flag OFF (legacy behavior)', () => {
    test('extracts cards, actions, and suggestions like parseStructuredResponse', () => {
      const raw = `Here are some products.
[CARDS]
[{"id":"prod-1","type":"product","title":"Shoe","url":"/shoe"}]
[/CARDS]
[SUGGESTIONS: Size guide | Colors | Delivery]`;

      const result = parseMigrationAwareResponse(raw);
      expect(result.cards.length).toBe(1);
      expect(result.cards[0].title).toBe('Shoe');
      expect(result.suggestions).toEqual(['Size guide', 'Colors', 'Delivery']);
      expect(result.text).toBe('Here are some products.');
    });

    test('fires onFallback callback with flag_off reason', () => {
      const callback = vi.fn();
      parseMigrationAwareResponse('Hello!', 'pidgie', callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'EVT-07',
          agentType: 'pidgie',
          reason: 'flag_off',
        }),
      );
    });
  });

  describe('flag ON (migration active)', () => {
    test('strips [CARDS] tags but does not parse them', () => {
      process.env.CARD_TOOL_MIGRATION = 'true';
      const raw = `Here are some products.
[CARDS]
[{"id":"prod-1","type":"product","title":"Shoe","url":"/shoe"}]
[/CARDS]
[SUGGESTIONS: Size guide | Colors | Delivery]`;

      const result = parseMigrationAwareResponse(raw);
      expect(result.cards).toEqual([]);
      expect(result.actions).toEqual([]);
      expect(result.suggestions).toEqual(['Size guide', 'Colors', 'Delivery']);
      expect(result.text).toBe('Here are some products.');
    });

    test('strips [ACTIONS] tags without parsing', () => {
      process.env.CARD_TOOL_MIGRATION = 'true';
      const raw = `Check this out.
[ACTIONS]
[{"id":"a-1","label":"Buy Now","type":"navigate","payload":"/cart","style":"primary"}]
[/ACTIONS]
[SUGGESTIONS: More info | Pricing]`;

      const result = parseMigrationAwareResponse(raw);
      expect(result.actions).toEqual([]);
      expect(result.suggestions).toEqual(['More info', 'Pricing']);
      expect(result.text).toBe('Check this out.');
    });

    test('handles text-only response (no tags)', () => {
      process.env.CARD_TOOL_MIGRATION = 'true';
      const raw = 'Hello, how can I help you today?';

      const result = parseMigrationAwareResponse(raw);
      expect(result.text).toBe('Hello, how can I help you today?');
      expect(result.cards).toEqual([]);
      expect(result.actions).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    test('does NOT fire onFallback callback', () => {
      process.env.CARD_TOOL_MIGRATION = 'true';
      const callback = vi.fn();
      parseMigrationAwareResponse('Hello!', 'pidgie', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    test('handles suggestions-only response', () => {
      process.env.CARD_TOOL_MIGRATION = 'true';
      const raw = 'We have great services!\n[SUGGESTIONS: View services | Pricing | Book now]';

      const result = parseMigrationAwareResponse(raw);
      expect(result.text).toBe('We have great services!');
      expect(result.suggestions).toEqual(['View services', 'Pricing', 'Book now']);
    });
  });
});
