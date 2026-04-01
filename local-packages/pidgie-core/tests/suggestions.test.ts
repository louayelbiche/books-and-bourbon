/**
 * Tests for unified suggestion system:
 * - parseSuggestions (parser)
 * - buildSuggestionPromptFragment (prompt fragment with perspective)
 * - New types (SuggestionPerspective, SuggestionConfig)
 */

import { describe, it, expect } from 'vitest';
import {
  parseSuggestions,
  buildSuggestionPromptFragment,
} from '../src/suggestions/index.js';
import type {
  SuggestionConfig,
  SuggestionPerspective,
} from '../src/suggestions/index.js';

// ── parseSuggestions ─────────────────────────────────────────────────

describe('parseSuggestions', () => {
  it('extracts suggestions from [SUGGESTIONS:] tag', () => {
    const input = 'Some response text.\n[SUGGESTIONS: How does it work? | What is the price? | Can I try it?]';
    const result = parseSuggestions(input);
    expect(result.cleanText).toBe('Some response text.');
    expect(result.suggestions).toEqual([
      'How does it work?',
      'What is the price?',
      'Can I try it?',
    ]);
  });

  it('handles [SUGGESTION:] (singular) tag', () => {
    const input = 'Text here\n[SUGGESTION: One question | Two question]';
    const result = parseSuggestions(input);
    expect(result.suggestions).toHaveLength(2);
    expect(result.cleanText).toBe('Text here');
  });

  it('is case-insensitive', () => {
    const input = 'Response\n[suggestions: a | b | c]';
    const result = parseSuggestions(input);
    expect(result.suggestions).toEqual(['a', 'b', 'c']);
  });

  it('limits to 3 suggestions max', () => {
    const input = 'Text\n[SUGGESTIONS: a | b | c | d | e]';
    const result = parseSuggestions(input);
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions).toEqual(['a', 'b', 'c']);
  });

  it('returns original text when no tag found', () => {
    const input = 'Just a plain response without suggestions.';
    const result = parseSuggestions(input);
    expect(result.cleanText).toBe(input);
    expect(result.suggestions).toEqual([]);
  });

  it('strips empty suggestions', () => {
    const input = 'Text\n[SUGGESTIONS:  | valid | | also valid |  ]';
    const result = parseSuggestions(input);
    expect(result.suggestions).toEqual(['valid', 'also valid']);
  });

  it('trims whitespace around suggestions', () => {
    const input = 'Text\n[SUGGESTIONS:  spaced out  |  another one  | trimmed ]';
    const result = parseSuggestions(input);
    expect(result.suggestions).toEqual(['spaced out', 'another one', 'trimmed']);
  });

  it('does NOT match tag in middle of text', () => {
    const input = 'The format is [SUGGESTIONS: a | b] and then more text follows here.';
    const result = parseSuggestions(input);
    // Tag is not at end, so no match
    expect(result.suggestions).toEqual([]);
    expect(result.cleanText).toBe(input);
  });

  it('handles trailing whitespace after tag', () => {
    const input = 'Response\n[SUGGESTIONS: a | b | c]   \n  ';
    const result = parseSuggestions(input);
    expect(result.suggestions).toEqual(['a', 'b', 'c']);
    expect(result.cleanText).toBe('Response');
  });
});

// ── buildSuggestionPromptFragment ────────────────────────────────────

describe('buildSuggestionPromptFragment', () => {
  describe('backward compatibility', () => {
    it('accepts plain string mode (sales)', () => {
      const { promptText } = buildSuggestionPromptFragment('sales');
      expect(promptText).toContain('[SUGGESTIONS:');
      expect(promptText).toContain('purchase');
    });

    it('accepts plain string mode (pidgie)', () => {
      const { promptText } = buildSuggestionPromptFragment('pidgie');
      expect(promptText).toContain('[SUGGESTIONS:');
      expect(promptText).toContain('follow-up questions');
    });
  });

  describe('SuggestionConfig object', () => {
    it('accepts full config object', () => {
      const config: SuggestionConfig = {
        mode: 'sales',
        perspective: 'user-asks-bot',
      };
      const { promptText } = buildSuggestionPromptFragment(config);
      expect(promptText).toContain('[SUGGESTIONS:');
    });

    it('defaults perspective to user-asks-bot', () => {
      const { promptText } = buildSuggestionPromptFragment({ mode: 'sales' });
      expect(promptText).toContain('USER would say to you');
      expect(promptText).not.toContain('questions you want to ask');
    });
  });

  describe('perspective anchoring', () => {
    it('user-asks-bot includes user-perspective anchor with good/bad examples', () => {
      const { promptText } = buildSuggestionPromptFragment({
        mode: 'sales',
        perspective: 'user-asks-bot',
      });
      expect(promptText).toContain('USER would say to you');
      expect(promptText).toContain('Good examples');
      expect(promptText).toContain('Bad examples');
      expect(promptText).toContain("What's your biggest challenge");
    });

    it('bot-asks-user includes bot-perspective anchor', () => {
      const { promptText } = buildSuggestionPromptFragment({
        mode: 'pidgie',
        perspective: 'bot-asks-user',
      });
      expect(promptText).toContain('questions you want to ask the user');
      expect(promptText).not.toContain('USER would say to you');
    });
  });

  describe('custom guidance', () => {
    it('uses customGuidance instead of default mode guidance', () => {
      const custom = 'Generate 2 specific product questions.';
      const { promptText } = buildSuggestionPromptFragment({
        mode: 'sales',
        customGuidance: custom,
      });
      expect(promptText).toContain(custom);
      expect(promptText).not.toContain('guiding them toward a purchase');
    });

    it('still includes perspective anchor alongside custom guidance', () => {
      const { promptText } = buildSuggestionPromptFragment({
        mode: 'sales',
        perspective: 'user-asks-bot',
        customGuidance: 'My custom text.',
      });
      expect(promptText).toContain('My custom text.');
      expect(promptText).toContain('USER would say to you');
    });
  });

  describe('format specification', () => {
    it('always specifies [SUGGESTIONS: ...] format', () => {
      const configs: Array<SuggestionConfig | string> = [
        'sales',
        'pidgie',
        { mode: 'sales', perspective: 'user-asks-bot' },
        { mode: 'pidgie', perspective: 'bot-asks-user' },
      ];
      for (const config of configs) {
        const { promptText } = buildSuggestionPromptFragment(config as any);
        expect(promptText).toContain('[SUGGESTIONS: question 1 | question 2 | question 3]');
      }
    });

    it('requires tag as last line', () => {
      const { promptText } = buildSuggestionPromptFragment('sales');
      expect(promptText).toContain('MUST be the very last thing');
    });

    it('specifies 40 char limit', () => {
      const { promptText } = buildSuggestionPromptFragment('sales');
      expect(promptText).toContain('under 40 characters');
    });
  });
});
