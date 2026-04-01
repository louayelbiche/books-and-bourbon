/**
 * Shared test helpers for pipeline tests.
 *
 * Provides factory functions for PipelineContext and DataContext
 * with sensible defaults and override support.
 */

import type { PipelineContext } from '../../src/pipeline/types.js';
import type { DataContext, DataContextMeta } from '../../src/context/types.js';

// =============================================================================
// Default DataContext for tests
// =============================================================================

/**
 * Create a DataContext with all fields null/empty (everything missing).
 * Override specific fields as needed.
 */
export function createTestDataContext(
  overrides: Partial<DataContext> = {},
  metaOverrides: Partial<DataContextMeta> = {}
): DataContext {
  const base: DataContext = {
    tenantId: 'test-tenant',
    tenantName: 'Test Business',
    business: {
      name: 'Test Business',
      category: 'service',
      description: null,
      industry: null,
    },
    contact: {
      phone: null,
      email: null,
      address: null,
      socialMedia: null,
    },
    hours: null,
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: {
      scraped: null,
      url: null,
      publishStatus: null,
    },
    brand: {
      voice: null,
      identity: null,
    },
    _meta: {
      availableFields: ['tenantId', 'tenantName', 'business.name', 'business.category'],
      missingFields: [
        'business.description',
        'business.industry',
        'contact.phone',
        'contact.email',
        'contact.address',
        'contact.socialMedia',
        'hours',
        'booking',
        'ordering',
        'website.scraped',
        'website.url',
        'website.publishStatus',
        'brand.voice',
        'brand.identity',
      ],
      emptyCollections: ['services', 'products', 'faqs', 'promotions'],
      lastUpdated: new Date().toISOString(),
      ...metaOverrides,
    },
    ...overrides,
  };

  // Apply meta overrides after the spread
  if (metaOverrides && Object.keys(metaOverrides).length > 0) {
    base._meta = { ...base._meta, ...metaOverrides };
  }

  return base;
}

// =============================================================================
// Default PipelineContext for tests
// =============================================================================

/**
 * Create a PipelineContext with defaults suitable for most tests.
 * Override specific fields as needed.
 */
export function createTestPipelineContext(
  overrides: Partial<PipelineContext> = {}
): PipelineContext {
  return {
    dataContext: createTestDataContext(),
    toolResults: new Map(),
    allowedValues: new Set(),
    originalMessage: 'test message',
    ...overrides,
  };
}
