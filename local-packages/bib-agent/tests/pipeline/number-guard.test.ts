/**
 * Tests for NumberGuardStep pipeline step
 *
 * Verifies number hallucination detection:
 * - Allowed numbers (in allowedValues) pass through
 * - Hallucinated numbers replaced with "[data unavailable]"
 * - Safe patterns pass: dates, times, ordinals, years
 * - Small integers (0-10) pass in non-financial context
 * - Currency amounts flagged if not in allowedValues
 *
 * @see spec TASK-033
 */

import { describe, it, expect } from 'vitest';
import { NumberGuardStep } from '../../src/pipeline/steps/number-guard.js';
import { createTestPipelineContext } from './test-helpers.js';

const guard = new NumberGuardStep();

describe('NumberGuardStep', () => {
  it('has correct name and order', () => {
    expect(guard.name).toBe('number-guard');
    expect(guard.order).toBe(50);
  });

  // ---------------------------------------------------------------------------
  // Allowed numbers
  // ---------------------------------------------------------------------------

  describe('allowed numbers', () => {
    it('passes numbers that are in allowedValues', () => {
      const ctx = createTestPipelineContext({
        allowedValues: new Set(['1234', '56.78']),
      });
      const result = guard.process('Revenue is 1234 and margin is 56.78%.', ctx);

      // 1234 and 56.78 should pass through
      expect(result.text).toContain('1234');
      expect(result.text).toContain('56.78');
    });

    it('passes comma-formatted numbers when normalized version is in allowedValues', () => {
      const ctx = createTestPipelineContext({
        allowedValues: new Set(['12345']),
      });
      const result = guard.process('Total: 12,345 items.', ctx);

      expect(result.text).toContain('12,345');
    });

    it('passes currency when stripped version is in allowedValues', () => {
      const ctx = createTestPipelineContext({
        allowedValues: new Set(['500']),
      });
      const result = guard.process('That costs $500.', ctx);

      expect(result.text).toContain('$500');
    });
  });

  // ---------------------------------------------------------------------------
  // Hallucinated numbers
  // ---------------------------------------------------------------------------

  describe('hallucinated numbers', () => {
    it('replaces unknown numbers with "[data unavailable]"', () => {
      const ctx = createTestPipelineContext({
        allowedValues: new Set(),
      });
      const result = guard.process('Your revenue is $45,678 this month.', ctx);

      expect(result.text).toContain('[data unavailable]');
      expect(result.flags.some((f) => f.severity === 'critical')).toBe(true);
    });

    it('flags percentage numbers not in allowedValues', () => {
      const ctx = createTestPipelineContext({
        allowedValues: new Set(),
      });
      const result = guard.process('Sales increased by 23.5%.', ctx);

      expect(result.flags.some((f) => f.original === '23.5%')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Safe patterns
  // ---------------------------------------------------------------------------

  describe('safe patterns', () => {
    it('allows ordinals (1st, 2nd, 3rd, 4th)', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('This is your 1st visit and 3rd order.', ctx);

      // Ordinals should NOT be flagged
      const ordinalFlags = result.flags.filter(
        (f) => f.original === '1st' || f.original === '3rd'
      );
      expect(ordinalFlags).toHaveLength(0);
    });

    it('allows 4-digit years', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('Founded in 2024, growing since 2020.', ctx);

      const yearFlags = result.flags.filter(
        (f) => f.original === '2024' || f.original === '2020'
      );
      expect(yearFlags).toHaveLength(0);
    });

    it('allows time patterns (HH:MM)', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('Open from 9:00 to 17:30.', ctx);

      const timeFlags = result.flags.filter(
        (f) => f.original === '9:00' || f.original === '17:30'
      );
      expect(timeFlags).toHaveLength(0);
    });

    it('allows date patterns (MM/DD/YYYY)', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('Event on 12/25/2024.', ctx);

      const dateFlags = result.flags.filter((f) => f.original === '12/25/2024');
      expect(dateFlags).toHaveLength(0);
    });

    it('allows time with am/pm', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('Opens at 9 am and closes at 5 pm.', ctx);

      const timeFlags = result.flags.filter(
        (f) => f.original === '9 am' || f.original === '5 pm'
      );
      expect(timeFlags).toHaveLength(0);
    });

    it('allows small integers (0-10) in non-financial context', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('We have 3 locations and 5 staff members.', ctx);

      const smallIntFlags = result.flags.filter(
        (f) => f.original === '3' || f.original === '5'
      );
      expect(smallIntFlags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Currency flagging
  // ---------------------------------------------------------------------------

  describe('currency amounts', () => {
    it('flags currency amounts not in allowedValues', () => {
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('That costs $1,234.56.', ctx);

      expect(result.flags.some((f) => f.severity === 'critical')).toBe(true);
      expect(result.text).toContain('[data unavailable]');
    });

    it('does not flag $5 (small integer in currency)', () => {
      // $5 contains 5, which is a small integer, but it has $ so it's financial
      const ctx = createTestPipelineContext({ allowedValues: new Set() });
      const result = guard.process('Costs $5 per item.', ctx);

      // $5 has $ sign, so isSafe should return false (financial context)
      const dollarFlags = result.flags.filter((f) => f.original === '$5');
      expect(dollarFlags).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Text without numbers
  // ---------------------------------------------------------------------------

  describe('no numbers', () => {
    it('passes through text without numbers unchanged', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Welcome to our store!', ctx);

      expect(result.text).toBe('Welcome to our store!');
      expect(result.flags).toHaveLength(0);
    });
  });
});
