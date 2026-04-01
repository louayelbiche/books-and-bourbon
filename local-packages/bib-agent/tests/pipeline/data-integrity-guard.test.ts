/**
 * Tests for DataIntegrityGuard pipeline step
 *
 * Verifies detection of implicit data claims:
 * - "We are closed" when hours is null
 * - "we're currently closed" when hours is null
 * - "We don't have any services" when services is missing
 * - "We have 0 products" when products is empty
 * - No flag when hours is available
 * - No flag when services are populated
 *
 * @see spec TASK-029
 */

import { describe, it, expect } from 'vitest';
import { DataIntegrityGuard } from '../../src/pipeline/steps/data-integrity-guard.js';
import { createTestPipelineContext, createTestDataContext } from './test-helpers.js';

const guard = new DataIntegrityGuard();

describe('DataIntegrityGuard', () => {
  it('has correct name and order', () => {
    expect(guard.name).toBe('data-integrity-guard');
    expect(guard.order).toBe(30);
  });

  // ---------------------------------------------------------------------------
  // Hours-related claims
  // ---------------------------------------------------------------------------

  describe('hours claims', () => {
    it('detects "We are closed" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('We are closed right now.', ctx);

      expect(result.text).toContain('[hours not configured yet]');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('critical');
      expect(result.flags[0].message).toContain('hours');
    });

    it('detects "we\'re currently closed" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process("We're currently closed for the day.", ctx);

      expect(result.text).toContain('[hours not configured yet]');
      expect(result.flags[0].severity).toBe('critical');
    });

    it('detects "currently closed" when hours is null', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('The store is currently closed.', ctx);

      expect(result.text).toContain('[hours not configured yet]');
    });

    it('does NOT flag "closed" when hours is available', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext(
          { hours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }] },
          {
            missingFields: ['contact.phone'],
            availableFields: ['hours'],
          }
        ),
      });
      const result = guard.process('We are closed on Sundays.', ctx);

      const hoursFlags = result.flags.filter((f) => f.message.includes('hours'));
      expect(hoursFlags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Missing collection claims
  // ---------------------------------------------------------------------------

  describe('missing collection claims', () => {
    it('detects "We don\'t have any services" when services is missing', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          missingFields: ['services'],
        }),
      });
      const result = guard.process("We don't have any services at the moment.", ctx);

      expect(result.text).toContain('[not configured yet]');
      expect(result.flags[0].severity).toBe('critical');
    });

    it('detects "We do not have products" when products is missing', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          missingFields: ['products'],
        }),
      });
      const result = guard.process('We do not have products available.', ctx);

      expect(result.text).toContain('[not configured yet]');
    });

    it('does NOT flag when services are populated', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext(
          {
            services: [
              { id: 's1', name: 'Haircut', description: null, durationMinutes: 30, priceInCents: 2000, sortOrder: 1 },
            ],
          },
          {
            missingFields: ['contact.phone'],
            availableFields: ['services'],
            emptyCollections: [],
          }
        ),
      });
      const result = guard.process("We don't have any services at the moment.", ctx);

      // services is not in missingFields, so should not be flagged
      const serviceFlags = result.flags.filter((f) => f.message.includes('services'));
      expect(serviceFlags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty collection claims
  // ---------------------------------------------------------------------------

  describe('empty collection claims', () => {
    it('detects "We have 0 products" when products is in emptyCollections', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          emptyCollections: ['products'],
        }),
      });
      const result = guard.process('We have 0 products in stock.', ctx);

      expect(result.text).toContain('[none configured yet]');
      expect(result.flags[0].severity).toBe('critical');
    });

    it('detects "there are zero services"', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          emptyCollections: ['services'],
        }),
      });
      const result = guard.process('There are zero services available.', ctx);

      expect(result.text).toContain('[none configured yet]');
    });

    it('detects "we have 0 faqs"', () => {
      const ctx = createTestPipelineContext({
        dataContext: createTestDataContext({}, {
          emptyCollections: ['faqs'],
        }),
      });
      const result = guard.process('We have 0 faqs.', ctx);

      expect(result.text).toContain('[none configured yet]');
    });
  });

  // ---------------------------------------------------------------------------
  // Text without patterns
  // ---------------------------------------------------------------------------

  describe('text without patterns', () => {
    it('passes through clean text unchanged', () => {
      const ctx = createTestPipelineContext();
      const result = guard.process('Welcome to our business! How can we help?', ctx);

      expect(result.text).toBe('Welcome to our business! How can we help?');
      expect(result.flags).toHaveLength(0);
    });
  });
});
