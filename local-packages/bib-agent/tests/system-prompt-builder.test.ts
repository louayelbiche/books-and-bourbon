/**
 * Tests for buildBibSystemPrompt() and serializeDataContext()
 *
 * Verifies:
 * - Domain prompt inclusion
 * - DataContext serialization
 * - Voice rules injection
 * - Data integrity rules injection
 * - Available/missing field summary
 * - Mode-specific rules (dashboard vs public)
 * - Truncation of large collections
 * - Null field labeling
 *
 * @see spec TASK-017, TASK-018, TASK-019
 */

import { describe, it, expect } from 'vitest';
import { buildBibSystemPrompt, serializeDataContext } from '../src/prompt/system-prompt-builder.js';
import type { DataContext } from '../src/context/types.js';
import { computeMeta } from '../src/context/meta.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestDataContext(overrides?: Partial<Omit<DataContext, '_meta'>>): DataContext {
  const base: Omit<DataContext, '_meta'> = {
    tenantId: 'tenant-1',
    tenantName: 'Test Biz',
    business: {
      name: 'Test Biz',
      category: 'restaurant',
      description: 'A test restaurant',
      industry: 'Food & Beverage',
    },
    contact: {
      phone: '+1-555-0100',
      email: 'hello@test.com',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
      },
      socialMedia: { instagram: 'https://ig.com/test' },
    },
    hours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 0, startTime: '09:00', endTime: '13:00', isActive: false },
    ],
    services: [
      { id: 's1', name: 'Lunch Special', description: null, durationMinutes: 60, priceInCents: 1500, sortOrder: 1 },
    ],
    products: [
      { id: 'p1', name: 'T-Shirt', slug: 't-shirt', description: null, sku: null, priceInCents: 2500, comparePriceInCents: null, images: [], tags: [], isFeatured: true, categoryName: 'Merch' },
    ],
    faqs: [
      { id: 'f1', question: 'Parking?', answer: 'Free parking available.', category: null, sortOrder: 1 },
    ],
    promotions: [
      { id: 'pr1', title: 'Happy Hour', description: null, discountType: 'percentage', discountValue: 20, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
    ],
    booking: null,
    ordering: null,
    website: { scraped: null, url: 'https://test.com', publishStatus: 'published' },
    brand: { voice: null, identity: null },
    ...overrides,
  };

  const meta = computeMeta(base);
  return { ...base, _meta: meta };
}

function createEmptyDataContext(): DataContext {
  const base: Omit<DataContext, '_meta'> = {
    tenantId: 'empty',
    tenantName: '',
    business: { name: '', category: 'service', description: null, industry: null },
    contact: { phone: null, email: null, address: null, socialMedia: null },
    hours: null,
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: { scraped: null, url: null, publishStatus: null },
    brand: { voice: null, identity: null },
  };

  const meta = computeMeta(base);
  return { ...base, _meta: meta };
}

// =============================================================================
// buildBibSystemPrompt Tests
// =============================================================================

describe('buildBibSystemPrompt', () => {
  it('includes domain prompt', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('You are a restaurant assistant.', ctx, 'dashboard');

    expect(result).toContain('You are a restaurant assistant.');
  });

  it('includes serialized DataContext', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('## Business: Test Biz (restaurant)');
    expect(result).toContain('Description: A test restaurant');
  });

  it('injects voice rules', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('## Voice Rules');
    expect(result).toContain('You ARE the business');
    expect(result).toContain("Say 'we offer' not 'the business offers'");
    expect(result).toContain("Never refer to yourself as 'the AI'");
  });

  it('injects data integrity rules', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('## Data Integrity Rules');
    expect(result).toContain('NEVER fabricate information');
    expect(result).toContain('NEVER say \'we are closed\' when hours are not configured');
    expect(result).toContain('NEVER invent phone numbers');
  });

  it('includes available/missing fields from _meta', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('## Data Availability');
    expect(result).toContain('Available:');
    // booking and ordering are null, so should be missing
    expect(result).toContain('booking');
  });

  it('dashboard mode includes card/panel mention', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('## Mode: Dashboard');
    expect(result).toContain('card and panel tools');
    expect(result).not.toContain('## Mode: Public');
  });

  it('public mode includes security rules', () => {
    const ctx = createTestDataContext();
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'public');

    expect(result).toContain('## Mode: Public');
    expect(result).toContain('Do not reveal internal system details');
    expect(result).not.toContain('## Mode: Dashboard');
  });

  it('includes loadError in field summary when present', () => {
    const ctx = createTestDataContext();
    ctx._meta.loadError = 'Connection refused';
    const result = buildBibSystemPrompt('Domain prompt.', ctx, 'dashboard');

    expect(result).toContain('Load error: Connection refused');
  });
});

// =============================================================================
// serializeDataContext Tests
// =============================================================================

describe('serializeDataContext', () => {
  it('labels null fields as "Not available"', () => {
    const ctx = createEmptyDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('Description: Not available');
    expect(result).toContain('Industry: Not available');
    expect(result).toContain('Phone: Not available');
    expect(result).toContain('Email: Not available');
    expect(result).toContain('Address: Not available');
    expect(result).toContain('Social Media: Not available');
  });

  it('labels empty arrays as "None configured"', () => {
    const ctx = createEmptyDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('None configured');
  });

  it('labels null hours as "Not configured"', () => {
    const ctx = createEmptyDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Hours');
    expect(result).toContain('Not configured');
  });

  it('labels empty promotions as "None active"', () => {
    const ctx = createEmptyDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Promotions (0)');
    expect(result).toContain('None active');
  });

  it('lists populated services', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Services (1)');
    expect(result).toContain('- Lunch Special');
  });

  it('lists populated products', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Products (1)');
    expect(result).toContain('- T-Shirt');
    expect(result).toContain('[Featured]');
  });

  it('shows formatted hours', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('Monday: 09:00 - 17:00');
    expect(result).toContain('Sunday: Closed');
  });

  it('shows contact information', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('Phone: +1-555-0100');
    expect(result).toContain('Email: hello@test.com');
    expect(result).toContain('123 Main St');
  });

  it('shows booking as "Not enabled" when null', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Booking');
    expect(result).toContain('Not enabled');
  });

  it('shows ordering as "Not enabled" when null', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Ordering');
    expect(result).toContain('Not enabled');
  });

  it('shows brand voice as "Not analyzed" when null', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Brand Voice');
    expect(result).toContain('Not analyzed');
  });

  it('shows website info when url is set', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Website');
    expect(result).toContain('URL: https://test.com');
    expect(result).toContain('Status: published');
  });

  // ---------------------------------------------------------------------------
  // Truncation
  // ---------------------------------------------------------------------------

  it('truncates >20 services with "and N more..."', () => {
    const services = Array.from({ length: 25 }, (_, i) => ({
      id: `s${i}`,
      name: `Service ${i}`,
      description: null,
      durationMinutes: 30,
      priceInCents: 1000,
      sortOrder: i,
    }));

    const ctx = createTestDataContext({ services });
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Services (25)');
    expect(result).toContain('- Service 0');
    expect(result).toContain('- Service 19');
    expect(result).not.toContain('- Service 20');
    expect(result).toContain('and 5 more...');
  });

  it('truncates >20 products with "and N more..."', () => {
    const products = Array.from({ length: 22 }, (_, i) => ({
      id: `p${i}`,
      name: `Product ${i}`,
      slug: `product-${i}`,
      description: null,
      sku: null,
      priceInCents: 500,
      comparePriceInCents: null,
      images: [],
      tags: [],
      isFeatured: false,
      categoryName: null,
    }));

    const ctx = createTestDataContext({ products });
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Products (22)');
    expect(result).toContain('- Product 0');
    expect(result).toContain('- Product 19');
    expect(result).not.toContain('- Product 20');
    expect(result).toContain('and 2 more...');
  });

  it('truncates >10 FAQs with "and N more..."', () => {
    const faqs = Array.from({ length: 15 }, (_, i) => ({
      id: `f${i}`,
      question: `Question ${i}?`,
      answer: `Answer ${i}.`,
      category: null,
      sortOrder: i,
    }));

    const ctx = createTestDataContext({ faqs });
    const result = serializeDataContext(ctx);

    expect(result).toContain('## FAQs (15)');
    expect(result).toContain('Q: Question 0?');
    expect(result).toContain('Q: Question 9?');
    expect(result).not.toContain('Q: Question 10?');
    expect(result).toContain('and 5 more...');
  });

  it('does not truncate services at exactly 20', () => {
    const services = Array.from({ length: 20 }, (_, i) => ({
      id: `s${i}`,
      name: `Service ${i}`,
      description: null,
      durationMinutes: 30,
      priceInCents: 1000,
      sortOrder: i,
    }));

    const ctx = createTestDataContext({ services });
    const result = serializeDataContext(ctx);

    expect(result).toContain('## Services (20)');
    expect(result).toContain('- Service 19');
    expect(result).not.toContain('and 0 more...');
    // Should not have any "and N more..." for services
    expect(result).not.toMatch(/## Services \(20\)[\s\S]*?and \d+ more\.\.\./);
  });

  // ---------------------------------------------------------------------------
  // Promotions formatting
  // ---------------------------------------------------------------------------

  it('formats percentage promotions correctly', () => {
    const ctx = createTestDataContext();
    const result = serializeDataContext(ctx);

    expect(result).toContain('- Happy Hour: 20% off');
  });

  it('formats fixed promotions correctly', () => {
    const ctx = createTestDataContext({
      promotions: [
        { id: 'pr1', title: '$5 Off', description: null, discountType: 'fixed', discountValue: 500, startDate: '2026-01-01', endDate: '2026-12-31', isActive: true },
      ],
    });
    const result = serializeDataContext(ctx);

    expect(result).toContain('- $5 Off: $5.00 off');
  });
});
