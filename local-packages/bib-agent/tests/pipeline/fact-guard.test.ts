/**
 * Tests for FactGuard pipeline step
 *
 * Verifies detection of fabricated claims about missing business data:
 * - Hours claims when hours is null
 * - Phone number patterns when contact.phone is null
 * - Address claims when contact.address is null
 * - Service claims when services is in missingFields
 * - Product claims when products is in missingFields
 * - Brand voice claims when brand.voice is null
 * - No flag when field is available
 * - Multiple missing fields in same text
 * - Tool result bypass (EC-12)
 * - False positive handling (ERR-05)
 *
 * @see spec TASK-029
 */

import { describe, it, expect } from 'vitest';
import { FactGuard } from '../../src/pipeline/steps/fact-guard.js';
import { createTestPipelineContext, createTestDataContext } from './test-helpers.js';

const guard = new FactGuard();

describe('FactGuard', () => {
  it('has correct name and order', () => {
    expect(guard.name).toBe('fact-guard');
    expect(guard.order).toBe(10);
  });

  // ---------------------------------------------------------------------------
  // Hours claims
  // ---------------------------------------------------------------------------

  describe('hours claims', () => {
    it('detects "We are open Monday-Friday" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('We are open Monday through Friday.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('critical');
      expect(result.flags[0].message).toContain('hours');
    });

    it('detects "open from 9am" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('We are open from 9am to 5pm.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags.some((f) => f.severity === 'critical')).toBe(true);
    });

    it('detects "closed on Sunday" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('We are closed on Sunday.', ctx);

      expect(result.text).toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Phone claims
  // ---------------------------------------------------------------------------

  describe('phone claims', () => {
    it('detects phone number pattern when contact.phone is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Call us at (555) 123-4567.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags[0].severity).toBe('critical');
      expect(result.flags[0].message).toContain('contact.phone');
    });

    it('detects dashed phone pattern', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Reach us at 555-123-4567.', ctx);

      expect(result.text).toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Address claims
  // ---------------------------------------------------------------------------

  describe('address claims', () => {
    it('detects "located at 123 Main St" when contact.address is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('We are located at 123 Main Street.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags[0].severity).toBe('critical');
      expect(result.flags[0].message).toContain('contact.address');
    });

    it('detects "find us at" pattern', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('You can find us at 456 Oak Ave.', ctx);

      expect(result.text).toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Service claims
  // ---------------------------------------------------------------------------

  describe('service claims', () => {
    it('detects "we offer" when services is in missingFields', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          missingFields: ['services'],
        }),
      });
      const result = guard.process('We offer a variety of treatments.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags[0].message).toContain('services');
    });

    it('detects "our services include" when services is missing', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          missingFields: ['services'],
        }),
      });
      const result = guard.process('Our services include haircuts and styling.', ctx);

      expect(result.text).toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Product claims
  // ---------------------------------------------------------------------------

  describe('product claims', () => {
    it('detects "our menu includes" when products is in missingFields', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          missingFields: ['products'],
        }),
      });
      const result = guard.process('Our menu includes burgers and fries.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags[0].message).toContain('products');
    });
  });

  // ---------------------------------------------------------------------------
  // Brand voice claims
  // ---------------------------------------------------------------------------

  describe('brand voice claims', () => {
    it('detects "our values are" when brand.voice is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Our values are quality and service.', ctx);

      expect(result.text).toContain('[not available yet]');
      expect(result.flags[0].message).toContain('brand.voice');
    });

    it('detects "our mission is" when brand.voice is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Our mission is to serve our community.', ctx);

      expect(result.text).toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // No flag when field is available
  // ---------------------------------------------------------------------------

  describe('no flag when field is available', () => {
    it('does not flag hours claim when hours is available', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext(
          { hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }] },
          {
            availableFields: ['hours'],
            missingFields: ['contact.phone', 'contact.email', 'contact.address', 'contact.socialMedia'],
          }
        ),
      });
      const result = guard.process('We are open Monday through Friday.', ctx);

      // hours is NOT in missingFields, so no flag for hours
      const hoursFlags = result.flags.filter((f) => f.message.includes('hours'));
      expect(hoursFlags).toHaveLength(0);
    });

    it('does not flag phone when contact.phone is available', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext(
          { contact: { phone: '+1-555-0100', email: null, address: null, socialMedia: null } },
          {
            availableFields: ['contact.phone'],
            missingFields: ['contact.email', 'contact.address', 'contact.socialMedia', 'hours'],
          }
        ),
      });
      const result = guard.process('Call us at (555) 123-4567.', ctx);

      const phoneFlags = result.flags.filter((f) => f.message.includes('contact.phone'));
      expect(phoneFlags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple missing fields
  // ---------------------------------------------------------------------------

  describe('multiple missing fields', () => {
    it('detects claims about multiple missing fields in same text', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process(
        'We are open Monday from 9am. Call us at (555) 123-4567. Our values are integrity.',
        ctx
      );

      expect(result.flags.length).toBeGreaterThanOrEqual(3);
      const flagFields = result.flags.map((f) => f.message);
      expect(flagFields.some((m) => m.includes('hours'))).toBe(true);
      expect(flagFields.some((m) => m.includes('contact.phone'))).toBe(true);
      expect(flagFields.some((m) => m.includes('brand.voice'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Tool result bypass (EC-12)
  // ---------------------------------------------------------------------------

  describe('tool result bypass (EC-12)', () => {
    it('skips matched text that appears in tool results', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('get_hours', { text: 'We are open Monday through Friday.' });

      const ctx = createTestPipelineContext({ toolResults });
      const result = guard.process('We are open Monday through Friday.', ctx);

      // The match "open Monday" should be in the tool result string, so bypassed
      const hoursFlags = result.flags.filter((f) => f.message.includes('hours'));
      expect(hoursFlags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // False positive handling (ERR-05)
  // ---------------------------------------------------------------------------

  describe('false positive handling (ERR-05)', () => {
    it('does not flag text when corresponding field is available', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext(
          {},
          {
            missingFields: [], // No missing fields
            availableFields: [
              'hours', 'contact.phone', 'contact.address',
              'services', 'products', 'brand.voice', 'brand.identity',
            ],
          }
        ),
      });
      const result = guard.process(
        'We are open Monday. Call (555) 123-4567. We offer services. Our menu includes food.',
        ctx
      );

      expect(result.flags).toHaveLength(0);
      expect(result.text).not.toContain('[not available yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Text without patterns
  // ---------------------------------------------------------------------------

  describe('text without patterns', () => {
    it('passes through text that has no claim patterns', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Hello! How can I help you today?', ctx);

      expect(result.text).toBe('Hello! How can I help you today?');
      expect(result.flags).toHaveLength(0);
    });
  });
});
