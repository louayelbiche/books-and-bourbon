/**
 * Tests for VoiceEnforcer pipeline step
 *
 * Verifies detection of third-person AI references:
 * - "the AI suggests" → warning flag
 * - "the bot recommends" → warning flag
 * - "the assistant says" → warning flag
 * - No detection for "the AI" without action verb
 * - Text is NOT modified (warning only)
 *
 * @see spec TASK-029
 */

import { describe, it, expect } from 'vitest';
import { VoiceEnforcer } from '../../src/pipeline/steps/voice-enforcer.js';
import { createTestPipelineContext } from './test-helpers.js';

const enforcer = new VoiceEnforcer();

describe('VoiceEnforcer', () => {
  it('has correct name and order', () => {
    expect(enforcer.name).toBe('voice-enforcer');
    expect(enforcer.order).toBe(20);
  });

  // ---------------------------------------------------------------------------
  // Detection
  // ---------------------------------------------------------------------------

  describe('detection', () => {
    it('detects "the AI suggests"', () => {
      const result = enforcer.process(
        'the AI suggests trying our new menu.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
      expect(result.flags[0].original).toMatch(/the AI suggests/i);
    });

    it('detects "the bot recommends"', () => {
      const result = enforcer.process(
        'the bot recommends booking in advance.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
      expect(result.flags[0].message).toContain('Third-person AI reference');
    });

    it('detects "the assistant says"', () => {
      const result = enforcer.process(
        'the assistant says you should visit us.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
    });

    it('detects "the system can help"', () => {
      const result = enforcer.process(
        'the system can help you with that.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(1);
    });

    it('detects "the chatbot thinks"', () => {
      const result = enforcer.process(
        'the chatbot thinks this is a great option.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(1);
    });

    it('detects multiple violations in same text', () => {
      const result = enforcer.process(
        'the AI suggests this and the bot recommends that.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // No false positives
  // ---------------------------------------------------------------------------

  describe('no false positives', () => {
    it('does not flag "the AI" without action verb', () => {
      const result = enforcer.process(
        'The AI is a fascinating technology.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(0);
    });

    it('does not flag normal business text', () => {
      const result = enforcer.process(
        'We recommend booking in advance for the best experience.',
        createTestPipelineContext()
      );

      expect(result.flags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Text NOT modified
  // ---------------------------------------------------------------------------

  describe('text not modified', () => {
    it('returns text unmodified even when violation detected', () => {
      const input = 'the AI suggests trying our new menu.';
      const result = enforcer.process(input, createTestPipelineContext());

      expect(result.text).toBe(input);
      expect(result.flags).toHaveLength(1);
    });

    it('returns text unmodified when no violations', () => {
      const input = 'Welcome! How can we help you today?';
      const result = enforcer.process(input, createTestPipelineContext());

      expect(result.text).toBe(input);
      expect(result.flags).toHaveLength(0);
    });
  });
});
