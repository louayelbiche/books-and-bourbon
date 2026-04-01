/**
 * Tests for computeMeta()
 *
 * Verifies field classification:
 * - availableFields: non-null scalars and non-empty arrays
 * - missingFields: null fields
 * - emptyCollections: arrays with length 0
 * - lastUpdated: ISO timestamp
 *
 * @see spec TASK-014
 */

import { describe, it, expect } from 'vitest';
import { computeMeta } from '../src/context/meta.js';
import type { DataContext } from '../src/context/types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createFullContext(): Omit<DataContext, '_meta'> {
  return {
    tenantId: 'tenant-1',
    tenantName: 'Test Business',
    business: {
      name: 'Test Business',
      category: 'restaurant',
      description: 'A test business',
      industry: 'Food & Beverage',
    },
    contact: {
      phone: '+1-555-0100',
      email: 'info@test.com',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
      },
      socialMedia: { instagram: 'https://instagram.com/test' },
    },
    hours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    ],
    services: [
      { id: 's1', name: 'Haircut', description: null, durationMinutes: 30, priceInCents: 2500, sortOrder: 0 },
    ],
    products: [
      { id: 'p1', name: 'Shampoo', slug: 'shampoo', description: null, sku: 'SKU-001', priceInCents: 1000, comparePriceInCents: null, images: [], tags: [], isFeatured: false, categoryName: null },
    ],
    faqs: [
      { id: 'f1', question: 'What?', answer: 'That.', category: null, sortOrder: 0 },
    ],
    promotions: [
      { id: 'pr1', title: '10% off', description: null, discountType: 'percentage', discountValue: 10, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
    ],
    booking: {
      timezone: 'America/Chicago',
      autoConfirm: true,
      requirePhone: false,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 30,
      cancellationMinutes: 120,
      depositRequired: false,
      depositType: 'fixed',
      depositAmount: 0,
      defaultView: 'time_slots',
      allowStaffSelection: false,
    },
    ordering: {
      enableDineIn: true,
      enablePickup: true,
      minPickupMinutes: 15,
      maxScheduleDays: 7,
      minOrderInCents: 500,
      taxRate: 0.0825,
      enableTipping: true,
      tipOptions: [15, 18, 20],
      showPrepTime: true,
      showCalories: false,
    },
    website: {
      scraped: { url: 'https://test.com', pages: [], combinedContent: 'Hello', businessName: 'Test' },
      url: 'https://test.com',
      publishStatus: 'published',
    },
    brand: {
      voice: { companyName: 'Test', industry: 'Food', mainOfferings: ['Dining'], brandVoice: 'Friendly' },
      identity: { colors: ['#000'], tagline: 'Welcome' },
    },
  };
}

function createEmptyContext(): Omit<DataContext, '_meta'> {
  return {
    tenantId: 'tenant-empty',
    tenantName: '',
    business: {
      name: '',
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
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('computeMeta', () => {
  // ---------------------------------------------------------------------------
  // All fields populated
  // ---------------------------------------------------------------------------

  it('classifies all populated fields as available', () => {
    const ctx = createFullContext();
    const meta = computeMeta(ctx);

    // Top-level scalars
    expect(meta.availableFields).toContain('tenantId');
    expect(meta.availableFields).toContain('tenantName');

    // Business nested
    expect(meta.availableFields).toContain('business.name');
    expect(meta.availableFields).toContain('business.category');
    expect(meta.availableFields).toContain('business.description');
    expect(meta.availableFields).toContain('business.industry');

    // Contact
    expect(meta.availableFields).toContain('contact.phone');
    expect(meta.availableFields).toContain('contact.email');
    expect(meta.availableFields).toContain('contact.address');
    expect(meta.availableFields).toContain('contact.socialMedia');

    // Hours
    expect(meta.availableFields).toContain('hours');

    // Collections
    expect(meta.availableFields).toContain('services');
    expect(meta.availableFields).toContain('products');
    expect(meta.availableFields).toContain('faqs');
    expect(meta.availableFields).toContain('promotions');

    // Configs
    expect(meta.availableFields).toContain('booking');
    expect(meta.availableFields).toContain('ordering');

    // Website
    expect(meta.availableFields).toContain('website.scraped');
    expect(meta.availableFields).toContain('website.url');
    expect(meta.availableFields).toContain('website.publishStatus');

    // Brand
    expect(meta.availableFields).toContain('brand.voice');
    expect(meta.availableFields).toContain('brand.identity');

    // Nothing missing or empty
    expect(meta.missingFields).toHaveLength(0);
    expect(meta.emptyCollections).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // All fields null (empty tenant)
  // ---------------------------------------------------------------------------

  it('classifies null fields as missing on empty context', () => {
    const ctx = createEmptyContext();
    const meta = computeMeta(ctx);

    // business.name and business.category are empty strings, not null — they're "available"
    expect(meta.availableFields).toContain('tenantId');
    expect(meta.availableFields).toContain('business.name');
    expect(meta.availableFields).toContain('business.category');

    // Null fields should be missing
    expect(meta.missingFields).toContain('business.description');
    expect(meta.missingFields).toContain('business.industry');
    expect(meta.missingFields).toContain('contact.phone');
    expect(meta.missingFields).toContain('contact.email');
    expect(meta.missingFields).toContain('contact.address');
    expect(meta.missingFields).toContain('contact.socialMedia');
    expect(meta.missingFields).toContain('hours');
    expect(meta.missingFields).toContain('booking');
    expect(meta.missingFields).toContain('ordering');
    expect(meta.missingFields).toContain('website.scraped');
    expect(meta.missingFields).toContain('website.url');
    expect(meta.missingFields).toContain('website.publishStatus');
    expect(meta.missingFields).toContain('brand.voice');
    expect(meta.missingFields).toContain('brand.identity');

    // Empty arrays should be in emptyCollections
    expect(meta.emptyCollections).toContain('services');
    expect(meta.emptyCollections).toContain('products');
    expect(meta.emptyCollections).toContain('faqs');
    expect(meta.emptyCollections).toContain('promotions');
  });

  // ---------------------------------------------------------------------------
  // Mixed fields
  // ---------------------------------------------------------------------------

  it('correctly classifies mixed available and missing fields', () => {
    const ctx = createEmptyContext();
    ctx.contact.phone = '+1-555-0100';
    ctx.services = [
      { id: 's1', name: 'Haircut', description: null, durationMinutes: 30, priceInCents: 2500, sortOrder: 0 },
    ];
    ctx.booking = {
      timezone: 'UTC',
      autoConfirm: false,
      requirePhone: false,
      minAdvanceMinutes: 0,
      maxAdvanceDays: 30,
      cancellationMinutes: 0,
      depositRequired: false,
      depositType: 'fixed',
      depositAmount: 0,
      defaultView: 'time_slots',
      allowStaffSelection: false,
    };

    const meta = computeMeta(ctx);

    expect(meta.availableFields).toContain('contact.phone');
    expect(meta.availableFields).toContain('services');
    expect(meta.availableFields).toContain('booking');

    expect(meta.missingFields).toContain('contact.email');
    expect(meta.missingFields).toContain('contact.address');
    expect(meta.missingFields).not.toContain('contact.phone');

    expect(meta.emptyCollections).toContain('products');
    expect(meta.emptyCollections).toContain('faqs');
    expect(meta.emptyCollections).not.toContain('services');
  });

  // ---------------------------------------------------------------------------
  // Empty arrays → emptyCollections
  // ---------------------------------------------------------------------------

  it('classifies empty arrays as emptyCollections', () => {
    const ctx = createFullContext();
    ctx.services = [];
    ctx.products = [];
    ctx.faqs = [];
    ctx.promotions = [];

    const meta = computeMeta(ctx);

    expect(meta.emptyCollections).toContain('services');
    expect(meta.emptyCollections).toContain('products');
    expect(meta.emptyCollections).toContain('faqs');
    expect(meta.emptyCollections).toContain('promotions');

    expect(meta.availableFields).not.toContain('services');
    expect(meta.availableFields).not.toContain('products');
    expect(meta.availableFields).not.toContain('faqs');
    expect(meta.availableFields).not.toContain('promotions');
  });

  // ---------------------------------------------------------------------------
  // lastUpdated
  // ---------------------------------------------------------------------------

  it('sets lastUpdated to ISO string', () => {
    const before = new Date().toISOString();
    const meta = computeMeta(createFullContext());
    const after = new Date().toISOString();

    expect(meta.lastUpdated).toBeDefined();
    // Should be a valid ISO date string
    expect(() => new Date(meta.lastUpdated)).not.toThrow();
    expect(meta.lastUpdated >= before).toBe(true);
    expect(meta.lastUpdated <= after).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Hours special cases
  // ---------------------------------------------------------------------------

  it('classifies hours=null as missingFields', () => {
    const ctx = createEmptyContext();
    ctx.hours = null;

    const meta = computeMeta(ctx);
    expect(meta.missingFields).toContain('hours');
    expect(meta.emptyCollections).not.toContain('hours');
    expect(meta.availableFields).not.toContain('hours');
  });

  it('classifies hours=[] as emptyCollections', () => {
    const ctx = createEmptyContext();
    ctx.hours = [];

    const meta = computeMeta(ctx);
    expect(meta.emptyCollections).toContain('hours');
    expect(meta.missingFields).not.toContain('hours');
    expect(meta.availableFields).not.toContain('hours');
  });

  it('classifies populated hours as available', () => {
    const ctx = createEmptyContext();
    ctx.hours = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    ];

    const meta = computeMeta(ctx);
    expect(meta.availableFields).toContain('hours');
    expect(meta.missingFields).not.toContain('hours');
    expect(meta.emptyCollections).not.toContain('hours');
  });

  // ---------------------------------------------------------------------------
  // No loadError by default
  // ---------------------------------------------------------------------------

  it('does not set loadError by default', () => {
    const meta = computeMeta(createFullContext());
    expect(meta.loadError).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // tenantName empty string is available (not null)
  // ---------------------------------------------------------------------------

  it('classifies empty string tenantName as available (not null)', () => {
    const ctx = createEmptyContext();
    ctx.tenantName = '';

    const meta = computeMeta(ctx);
    // Empty string is not null, so it's "available"
    expect(meta.availableFields).toContain('tenantName');
    expect(meta.missingFields).not.toContain('tenantName');
  });
});
