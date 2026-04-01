/**
 * Tests that key functions are correctly re-exported from @runwell/pidgie-shared/api
 */

import { describe, it, expect } from 'vitest';
import { parseSuggestions, stripTextUrls } from '../src/api/index.js';

describe('stripTextUrls re-export from pidgie-shared/api', () => {
  it('is a function', () => {
    expect(typeof stripTextUrls).toBe('function');
  });

  it('strips URLs from text', () => {
    const result = stripTextUrls('Visit https://example.com today.');
    expect(result).not.toContain('https://example.com');
    expect(result).toContain('Visit');
  });
});

describe('parseSuggestions re-export from pidgie-shared/api', () => {
  it('is a function', () => {
    expect(typeof parseSuggestions).toBe('function');
  });

  it('parses [SUGGESTIONS:] format correctly', () => {
    const input = 'Hello!\n[SUGGESTIONS: Ask about pricing | Try the demo | Learn more]';
    const result = parseSuggestions(input);
    expect(result.cleanText).toBe('Hello!');
    expect(result.suggestions).toEqual(['Ask about pricing', 'Try the demo', 'Learn more']);
  });

  it('returns empty suggestions when no tag', () => {
    const result = parseSuggestions('Just a regular message.');
    expect(result.cleanText).toBe('Just a regular message.');
    expect(result.suggestions).toEqual([]);
  });
});
