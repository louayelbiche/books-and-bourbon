/**
 * Tests for URL origin policy enforcement on cards and actions.
 *
 * enforceUrlPolicy — blocks foreign URLs in card url field (images are display-only, not filtered)
 * enforceActionUrlPolicy — blocks foreign URLs in navigate action payloads
 */

import { describe, it, expect } from 'vitest';
import { enforceUrlPolicy, enforceActionUrlPolicy } from '../src/parsers/card-parser.js';
import type { ChatCard, ChatAction } from '../src/types.js';

function makeCard(url: string, image?: string): ChatCard {
  return {
    id: 'c1',
    type: 'product',
    title: 'Test Card',
    description: 'A test card',
    url,
    image,
    generatedAt: Date.now(),
  };
}

function makeAction(type: 'navigate' | 'message' | 'api_call', payload: string): ChatAction {
  return {
    id: 'a1',
    label: 'Test Action',
    type,
    payload,
    style: 'primary',
  };
}

const ALLOWED = ['shop.com'];

describe('enforceUrlPolicy', () => {
  it('allows relative URL starting with /', () => {
    const cards = enforceUrlPolicy([makeCard('/products/123')], ALLOWED);
    expect(cards[0].url).toBe('/products/123');
  });

  it('allows relative URL without leading slash', () => {
    const cards = enforceUrlPolicy([makeCard('images/bar.jpg')], ALLOWED);
    expect(cards[0].url).toBe('images/bar.jpg');
  });

  it('allows empty URL string', () => {
    const cards = enforceUrlPolicy([makeCard('')], ALLOWED);
    expect(cards[0].url).toBe('');
  });

  it('allows same-origin absolute URL', () => {
    const cards = enforceUrlPolicy([makeCard('https://shop.com/product/1')], ALLOWED);
    expect(cards[0].url).toBe('https://shop.com/product/1');
  });

  it('allows subdomain of allowed origin', () => {
    const cards = enforceUrlPolicy([makeCard('https://cdn.shop.com/img.jpg')], ALLOWED);
    expect(cards[0].url).toBe('https://cdn.shop.com/img.jpg');
  });

  it('blocks foreign domain — clears url to empty, keeps title/description', () => {
    const cards = enforceUrlPolicy([makeCard('https://evil.com/phish', 'https://evil.com/logo.png')], ALLOWED);
    expect(cards[0].url).toBe('');
    expect(cards[0].title).toBe('Test Card');
    expect(cards[0].description).toBe('A test card');
  });

  it('preserves images regardless of origin (images are display-only, not navigation)', () => {
    const cards = enforceUrlPolicy([makeCard('/ok', 'https://cdn.external.com/logo.png')], ALLOWED);
    expect(cards[0].url).toBe('/ok');
    expect(cards[0].image).toBe('https://cdn.external.com/logo.png');
  });

  it('allows protocol-relative URL matching origin', () => {
    const cards = enforceUrlPolicy([makeCard('//cdn.shop.com/img.jpg')], ALLOWED);
    expect(cards[0].url).toBe('//cdn.shop.com/img.jpg');
  });

  it('allows protocol-relative URL (treated as relative since starts with /)', () => {
    // //evil.com/thing starts with '/' so isAllowedUrl treats it as relative
    const cards = enforceUrlPolicy([makeCard('//evil.com/thing')], ALLOWED);
    expect(cards[0].url).toBe('//evil.com/thing');
  });

  it('blocks malformed absolute URL', () => {
    const cards = enforceUrlPolicy([makeCard('https://:::bad')], ALLOWED);
    expect(cards[0].url).toBe('');
  });

  it('handles mix of allowed/blocked cards in array', () => {
    const cards = enforceUrlPolicy(
      [
        makeCard('https://shop.com/a'),
        makeCard('https://evil.com/b'),
        makeCard('/relative'),
      ],
      ALLOWED,
    );
    expect(cards[0].url).toBe('https://shop.com/a');
    expect(cards[1].url).toBe('');
    expect(cards[2].url).toBe('/relative');
  });
});

describe('enforceActionUrlPolicy', () => {
  it('allows navigate action with relative URL', () => {
    const actions = enforceActionUrlPolicy([makeAction('navigate', '/page')], ALLOWED);
    expect(actions[0].payload).toBe('/page');
  });

  it('allows navigate action with same-origin URL', () => {
    const actions = enforceActionUrlPolicy([makeAction('navigate', 'https://shop.com/go')], ALLOWED);
    expect(actions[0].payload).toBe('https://shop.com/go');
  });

  it('blocks navigate action with foreign URL — clears to empty', () => {
    const actions = enforceActionUrlPolicy([makeAction('navigate', 'https://evil.com/steal')], ALLOWED);
    expect(actions[0].payload).toBe('');
  });

  it('does NOT modify message type payloads', () => {
    const actions = enforceActionUrlPolicy([makeAction('message', 'https://evil.com/steal')], ALLOWED);
    expect(actions[0].payload).toBe('https://evil.com/steal');
  });

  it('does NOT modify api_call type payloads', () => {
    const actions = enforceActionUrlPolicy([makeAction('api_call', 'https://evil.com/api')], ALLOWED);
    expect(actions[0].payload).toBe('https://evil.com/api');
  });

  it('handles empty payload', () => {
    const actions = enforceActionUrlPolicy([makeAction('navigate', '')], ALLOWED);
    expect(actions[0].payload).toBe('');
  });
});
