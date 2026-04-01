import { describe, it, expect } from 'vitest';
import { parseBrandProfile } from '../../src/brand-analysis/parse-profile.js';

describe('parseBrandProfile', () => {
  it('parses valid JSON into BrandProfile', () => {
    const json = JSON.stringify({
      companyName: 'Acme Corp',
      brandVoice: {
        tone: 'friendly',
        personality: ['innovative', 'bold'],
        dos: ['Use active voice'],
        donts: ['Avoid jargon'],
      },
      brandValues: ['quality', 'speed'],
      products: [{ name: 'Widget', description: 'A great widget' }],
      targetAudience: 'Small businesses',
      confidence: 0.85,
    });

    const result = parseBrandProfile(json);
    expect(result.companyName).toBe('Acme Corp');
    expect(result.brandVoice.tone).toBe('friendly');
    expect(result.brandVoice.personality).toEqual(['innovative', 'bold']);
    expect(result.confidence).toBe(0.85);
  });

  it('handles array-wrapped response', () => {
    const json = JSON.stringify([{
      companyName: 'Array Corp',
      brandVoice: { tone: 'casual' },
      confidence: 0.7,
    }]);

    const result = parseBrandProfile(json);
    expect(result.companyName).toBe('Array Corp');
    expect(result.brandVoice.tone).toBe('casual');
  });

  it('throws on empty array', () => {
    expect(() => parseBrandProfile('[]')).toThrow('Empty response array');
  });

  it('provides defaults for missing fields', () => {
    const json = JSON.stringify({});
    const result = parseBrandProfile(json);
    expect(result.companyName).toBe('Unknown');
    expect(result.brandVoice.tone).toBe('professional');
    expect(result.brandVoice.personality).toEqual([]);
    expect(result.brandVoice.dos).toEqual([]);
    expect(result.brandVoice.donts).toEqual([]);
    expect(result.brandValues).toEqual([]);
    expect(result.products).toEqual([]);
    expect(result.targetAudience).toBe('General audience');
    expect(result.confidence).toBe(0.5);
  });

  it('clamps confidence to [0, 1]', () => {
    const over = parseBrandProfile(JSON.stringify({ confidence: 1.5 }));
    expect(over.confidence).toBe(1);

    const under = parseBrandProfile(JSON.stringify({ confidence: -0.3 }));
    expect(under.confidence).toBe(0);
  });

  it('truncates personality/dos/donts to 5 items', () => {
    const json = JSON.stringify({
      brandVoice: {
        personality: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        dos: ['1', '2', '3', '4', '5', '6'],
        donts: ['x', 'y', 'z', 'w', 'v', 'u'],
      },
    });

    const result = parseBrandProfile(json);
    expect(result.brandVoice.personality).toHaveLength(5);
    expect(result.brandVoice.dos).toHaveLength(5);
    expect(result.brandVoice.donts).toHaveLength(5);
  });

  it('handles non-array products gracefully', () => {
    const json = JSON.stringify({ products: 'not an array' });
    const result = parseBrandProfile(json);
    expect(result.products).toEqual([]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBrandProfile('not json')).toThrow();
  });
});
