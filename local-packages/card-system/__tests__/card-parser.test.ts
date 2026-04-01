import { describe, it, expect } from 'vitest';
import { parseStructuredResponse } from '../src/parsers/card-parser.js';

describe('parseStructuredResponse', () => {
  it('returns original text with empty arrays when no tags present', () => {
    const raw = 'Here are some great products for you!';
    const result = parseStructuredResponse(raw);
    expect(result.text).toBe(raw);
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('extracts valid cards + actions + suggestions', () => {
    const raw = `Check out this product!
[CARDS]
[{"id":"p1","type":"product","title":"Blue Shirt","url":"https://shop.com/p1","generatedAt":1700000000}]
[/CARDS]
[ACTIONS]
[{"id":"checkout","label":"Checkout","type":"navigate","payload":"https://shop.com/checkout","style":"primary"}]
[/ACTIONS]
[SUGGESTIONS: What sizes? | Any discounts? | Show me more]`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('Check out this product!');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].id).toBe('p1');
    expect(result.cards[0].title).toBe('Blue Shirt');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].id).toBe('checkout');
    expect(result.suggestions).toEqual(['What sizes?', 'Any discounts?', 'Show me more']);
  });

  it('extracts cards only (no actions, no suggestions)', () => {
    const raw = `Great choice!
[CARDS]
[{"id":"p2","type":"product","title":"Red Dress","url":"https://shop.com/p2","generatedAt":1700000000}]
[/CARDS]`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('Great choice!');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].title).toBe('Red Dress');
    expect(result.actions).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('handles malformed JSON in [CARDS] gracefully', () => {
    const raw = `Here you go!
[CARDS]
{invalid json here}
[/CARDS]`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('Here you go!');
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('handles malformed JSON in [ACTIONS] gracefully', () => {
    const raw = `Some text
[ACTIONS]
not json at all
[/ACTIONS]`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('Some text');
    expect(result.actions).toEqual([]);
  });

  it('extracts cards when [CARDS] appears in middle of text', () => {
    const raw = `Here is the first product:
[CARDS]
[{"id":"p3","type":"product","title":"Green Hat","url":"https://shop.com/p3","generatedAt":1700000000}]
[/CARDS]
Would you like to see more?`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('Here is the first product:\n\nWould you like to see more?');
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].title).toBe('Green Hat');
  });

  it('handles non-array JSON in cards tag (returns empty)', () => {
    const raw = `Text
[CARDS]
{"single":"object"}
[/CARDS]`;

    const result = parseStructuredResponse(raw);
    expect(result.cards).toEqual([]);
  });

  it('extracts suggestions only (no cards, no actions)', () => {
    const raw = `I can help with that!
[SUGGESTIONS: How much? | Where to buy? | Return policy]`;

    const result = parseStructuredResponse(raw);
    expect(result.text).toBe('I can help with that!');
    expect(result.suggestions).toEqual(['How much?', 'Where to buy?', 'Return policy']);
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it('limits suggestions to 3 even if more are provided', () => {
    const raw = `Text
[SUGGESTIONS: One | Two | Three | Four | Five]`;

    const result = parseStructuredResponse(raw);
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions).toEqual(['One', 'Two', 'Three']);
  });

  it('handles [SUGGESTION:] singular form', () => {
    const raw = `Text
[SUGGESTION: Option A | Option B | Option C]`;

    const result = parseStructuredResponse(raw);
    expect(result.suggestions).toEqual(['Option A', 'Option B', 'Option C']);
  });

  it('handles empty input string', () => {
    const result = parseStructuredResponse('');
    expect(result.text).toBe('');
    expect(result.cards).toEqual([]);
    expect(result.actions).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('handles multiple cards in array', () => {
    const raw = `Found 2 products!
[CARDS]
[{"id":"a","type":"product","title":"A","url":"https://a.com","generatedAt":1},{"id":"b","type":"product","title":"B","url":"https://b.com","generatedAt":2}]
[/CARDS]`;

    const result = parseStructuredResponse(raw);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].id).toBe('a');
    expect(result.cards[1].id).toBe('b');
  });
});
