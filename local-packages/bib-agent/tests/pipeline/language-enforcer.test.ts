/**
 * Tests for LanguageEnforcer pipeline step
 *
 * Verifies:
 * - Correct name and order
 * - French response + French message → no flag
 * - English response + French message → warning flag
 * - Arabic response + Arabic message → no flag
 * - English response + Arabic message → warning flag
 * - Mixed-language edge case → no crash
 * - Text NOT modified even when mismatch detected
 * - Short/ambiguous text → graceful handling
 */

import { describe, it, expect } from 'vitest';
import { LanguageEnforcer } from '../../src/pipeline/steps/language-enforcer.js';
import { createTestPipelineContext } from './test-helpers.js';

// =============================================================================
// Tests
// =============================================================================

describe('LanguageEnforcer', () => {
  const enforcer = new LanguageEnforcer();

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  describe('metadata', () => {
    it('has correct name', () => {
      expect(enforcer.name).toBe('language-enforcer');
    });

    it('has order 70', () => {
      expect(enforcer.order).toBe(70);
    });
  });

  // ---------------------------------------------------------------------------
  // French matching
  // ---------------------------------------------------------------------------

  describe('French language matching', () => {
    it('French response with French message → no flag', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'Bonjour, nous avons besoin de plus de détails sur les services.',
      });
      const frenchResponse =
        'Bien sûr, nous offrons plusieurs services pour vous aider avec votre projet.';

      const result = enforcer.process(frenchResponse, ctx);

      expect(result.flags).toHaveLength(0);
      expect(result.text).toBe(frenchResponse);
    });

    it('English response with French message → warning flag with "language mismatch"', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'Bonjour, nous avons besoin de plus de détails sur les services.',
      });
      const englishResponse = 'Hello, we offer several services to help with your project.';

      const result = enforcer.process(englishResponse, ctx);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
      expect(result.flags[0].step).toBe('language-enforcer');
      expect(result.flags[0].message.toLowerCase()).toContain('language mismatch');
      expect(result.flags[0].message).toContain('"en"');
      expect(result.flags[0].message).toContain('"fr"');
    });
  });

  // ---------------------------------------------------------------------------
  // Arabic matching
  // ---------------------------------------------------------------------------

  describe('Arabic language matching', () => {
    it('Arabic response with Arabic message → no flag', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'مرحبا، نحتاج إلى مزيد من التفاصيل حول الخدمات',
      });
      const arabicResponse = 'بالطبع، نقدم العديد من الخدمات لمساعدتك في مشروعك';

      const result = enforcer.process(arabicResponse, ctx);

      expect(result.flags).toHaveLength(0);
      expect(result.text).toBe(arabicResponse);
    });

    it('English response with Arabic message → warning flag', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'مرحبا، نحتاج إلى مزيد من التفاصيل حول الخدمات',
      });
      const englishResponse = 'We offer many services to help you with your project.';

      const result = enforcer.process(englishResponse, ctx);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
      expect(result.flags[0].message.toLowerCase()).toContain('language mismatch');
      expect(result.flags[0].message).toContain('"en"');
      expect(result.flags[0].message).toContain('"ar"');
    });
  });

  // ---------------------------------------------------------------------------
  // English matching
  // ---------------------------------------------------------------------------

  describe('English language matching', () => {
    it('English response with English message → no flag', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'What services do you offer?',
      });
      const englishResponse = 'We offer a wide range of services including consulting and support.';

      const result = enforcer.process(englishResponse, ctx);

      expect(result.flags).toHaveLength(0);
      expect(result.text).toBe(englishResponse);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('mixed-language text does not throw', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'Hello bonjour مرحبا',
      });

      expect(() => {
        enforcer.process('Some response text here', ctx);
      }).not.toThrow();
    });

    it('text is NOT modified even when mismatch detected', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'مرحبا، كيف حالك اليوم يا صديقي',
      });
      const responseText = 'We are doing great, thanks for asking!';

      const result = enforcer.process(responseText, ctx);

      // Text returned unchanged
      expect(result.text).toBe(responseText);
      // But flag was raised
      expect(result.flags.length).toBeGreaterThan(0);
    });

    it('short/ambiguous text is handled gracefully (no crash)', () => {
      const ctx = createTestPipelineContext({
        originalMessage: 'hi',
      });

      expect(() => {
        const result = enforcer.process('ok', ctx);
        expect(result.text).toBe('ok');
      }).not.toThrow();
    });

    it('empty text is handled gracefully', () => {
      const ctx = createTestPipelineContext({
        originalMessage: '',
      });

      expect(() => {
        const result = enforcer.process('', ctx);
        expect(result.text).toBe('');
      }).not.toThrow();
    });
  });
});
