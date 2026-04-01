import { describe, it, expect } from 'vitest';
import { ProfileInjector } from '../src/profile/injector.js';
import type { VisitorProfile } from '../src/visitor/types.js';

function makeProfile(overrides: Partial<VisitorProfile> = {}): VisitorProfile {
  return {
    id: 'visitor-uuid-1',
    visitorKey: 'cookie-abc',
    visitorType: 'cookie',
    sourceApp: 'shopimate-sales',
    tenantId: null,
    facts: [],
    lastConversationSummary: '',
    visitCount: 1,
    totalMessages: 0,
    geoRegion: null,
    firstSeenAt: new Date('2026-02-15T10:00:00Z'),
    lastSeenAt: new Date('2026-03-17T14:30:00Z'),
    ...overrides,
  };
}

describe('ProfileInjector', () => {
  describe('formatProfile', () => {
    it('returns empty block for profile with no facts', () => {
      const block = ProfileInjector.formatProfile(makeProfile());
      expect(block.promptText).toBe('');
      expect(block.tokenEstimate).toBe(0);
    });

    it('formats a profile with facts', () => {
      const profile = makeProfile({
        visitCount: 7,
        totalMessages: 42,
        facts: [
          { category: 'preference', key: 'shipping', value: 'prefers free over fast', confidence: 0.9 },
          { category: 'interest', key: 'running_shoes', value: 'compared Nike Pegasus vs Asics', confidence: 0.95 },
          { category: 'context', key: 'shoe_size', value: 'US 10', confidence: 1.0 },
        ],
        lastConversationSummary: 'Asked about new arrivals in running shoes.',
      });

      const block = ProfileInjector.formatProfile(profile);

      expect(block.promptText).toContain('[CUSTOMER PROFILE]');
      expect(block.promptText).toContain('7 visits, 42 messages');
      expect(block.promptText).toContain('[preference] shipping: prefers free over fast (confidence: 0.9)');
      expect(block.promptText).toContain('[interest] running_shoes: compared Nike Pegasus vs Asics (confidence: 0.95)');
      expect(block.promptText).toContain('[context] shoe_size: US 10 (confidence: 1)');
      expect(block.promptText).toContain('Last conversation: Asked about new arrivals');
      expect(block.tokenEstimate).toBeGreaterThan(0);
    });

    it('omits last conversation summary when empty', () => {
      const profile = makeProfile({
        facts: [{ category: 'context', key: 'size', value: 'M', confidence: 1.0 }],
        lastConversationSummary: '',
      });

      const block = ProfileInjector.formatProfile(profile);

      expect(block.promptText).not.toContain('Last conversation:');
    });

    it('includes date information', () => {
      const profile = makeProfile({
        facts: [{ category: 'context', key: 'test', value: 'val', confidence: 1.0 }],
      });

      const block = ProfileInjector.formatProfile(profile);

      expect(block.promptText).toContain('First seen: 2026-02-15');
      expect(block.promptText).toContain('Last seen: 2026-03-17');
    });

    it('estimates tokens as ~chars/4', () => {
      const profile = makeProfile({
        facts: [
          { category: 'preference', key: 'color', value: 'blue', confidence: 0.8 },
          { category: 'interest', key: 'topic', value: 'programming', confidence: 0.9 },
        ],
      });

      const block = ProfileInjector.formatProfile(profile);

      const expectedEstimate = Math.ceil(block.promptText.length / 4);
      expect(block.tokenEstimate).toBe(expectedEstimate);
    });
  });
});
