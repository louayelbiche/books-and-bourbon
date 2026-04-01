/**
 * Tests for StreamingModule
 *
 * Verifies:
 * - Default config values (maxToolRounds=3, idleTimeoutMs=20000, etc.)
 * - Custom config overrides
 * - shouldAllowToolCall returns true for rounds < max
 * - shouldAllowToolCall returns false for rounds >= max
 * - isIdleTimedOut returns false within timeout
 * - isIdleTimedOut returns true after timeout
 *
 * @see spec Phase 3a — StreamingModule
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { StreamingModule } from '../../src/modules/streaming.js';

describe('StreamingModule', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor & Defaults
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('creates module with name "streaming"', () => {
      const mod = new StreamingModule();
      expect(mod.name).toBe('streaming');
    });

    it('defaults maxToolRounds to 3', () => {
      const mod = new StreamingModule();
      expect(mod.config.maxToolRounds).toBe(3);
    });

    it('defaults idleTimeoutMs to 20000', () => {
      const mod = new StreamingModule();
      expect(mod.config.idleTimeoutMs).toBe(20_000);
    });

    it('defaults plainStringYields to true', () => {
      const mod = new StreamingModule();
      expect(mod.config.plainStringYields).toBe(true);
    });

    it('defaults systemPromptInUserMessage to true', () => {
      const mod = new StreamingModule();
      expect(mod.config.systemPromptInUserMessage).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Custom Config
  // ---------------------------------------------------------------------------

  describe('custom config', () => {
    it('overrides maxToolRounds', () => {
      const mod = new StreamingModule({ maxToolRounds: 5 });
      expect(mod.config.maxToolRounds).toBe(5);
    });

    it('overrides idleTimeoutMs', () => {
      const mod = new StreamingModule({ idleTimeoutMs: 10_000 });
      expect(mod.config.idleTimeoutMs).toBe(10_000);
    });

    it('overrides plainStringYields', () => {
      const mod = new StreamingModule({ plainStringYields: false });
      expect(mod.config.plainStringYields).toBe(false);
    });

    it('overrides systemPromptInUserMessage', () => {
      const mod = new StreamingModule({ systemPromptInUserMessage: false });
      expect(mod.config.systemPromptInUserMessage).toBe(false);
    });

    it('partial overrides preserve other defaults', () => {
      const mod = new StreamingModule({ maxToolRounds: 7 });

      expect(mod.config.maxToolRounds).toBe(7);
      expect(mod.config.idleTimeoutMs).toBe(20_000);
      expect(mod.config.plainStringYields).toBe(true);
      expect(mod.config.systemPromptInUserMessage).toBe(true);
    });

    it('config is readonly (frozen)', () => {
      const mod = new StreamingModule();

      expect(() => {
        (mod.config as any).maxToolRounds = 99;
      }).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // shouldAllowToolCall
  // ---------------------------------------------------------------------------

  describe('shouldAllowToolCall', () => {
    it('returns true for rounds below max', () => {
      const mod = new StreamingModule({ maxToolRounds: 3 });

      expect(mod.shouldAllowToolCall(0)).toBe(true);
      expect(mod.shouldAllowToolCall(1)).toBe(true);
      expect(mod.shouldAllowToolCall(2)).toBe(true);
    });

    it('returns false for rounds at max', () => {
      const mod = new StreamingModule({ maxToolRounds: 3 });

      expect(mod.shouldAllowToolCall(3)).toBe(false);
    });

    it('returns false for rounds above max', () => {
      const mod = new StreamingModule({ maxToolRounds: 3 });

      expect(mod.shouldAllowToolCall(5)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // isIdleTimedOut
  // ---------------------------------------------------------------------------

  describe('isIdleTimedOut', () => {
    it('returns false within timeout window', () => {
      const mod = new StreamingModule({ idleTimeoutMs: 20_000 });
      const now = Date.now();

      // Last chunk was 5 seconds ago — within 20s timeout
      expect(mod.isIdleTimedOut(now - 5_000)).toBe(false);
    });

    it('returns true after timeout exceeded', () => {
      const mod = new StreamingModule({ idleTimeoutMs: 20_000 });
      const now = Date.now();

      // Last chunk was 25 seconds ago — beyond 20s timeout
      expect(mod.isIdleTimedOut(now - 25_000)).toBe(true);
    });

    it('returns true at exactly the timeout boundary', () => {
      const mod = new StreamingModule({ idleTimeoutMs: 10_000 });

      // Use a fixed timestamp to avoid flakiness
      const mockNow = 1_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Exactly at boundary: now - lastChunk = 10_000 = idleTimeoutMs
      expect(mod.isIdleTimedOut(mockNow - 10_000)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // No tools
  // ---------------------------------------------------------------------------

  describe('no tools', () => {
    it('does not have a getTools method', () => {
      const mod = new StreamingModule();

      // StreamingModule should NOT implement getTools
      expect((mod as any).getTools).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // initialize
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('stores agent reference without error', () => {
      const mod = new StreamingModule();
      const mockAgent = { agentType: 'test' };

      expect(() => mod.initialize(mockAgent)).not.toThrow();
    });
  });
});
