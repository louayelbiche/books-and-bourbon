/**
 * Tests for loadDataContext()
 *
 * Verifies:
 * - Full tenant → correct DataContext mapping
 * - Empty tenant → all nulls, empty arrays
 * - Missing tenant → throws TenantNotFoundError
 * - Service/product/FAQ/promotion/booking/hours mapping
 * - Website context JSON parsing
 * - Partial failure handling (sets loadError)
 * - Single query verification
 *
 * @see spec TASK-015, TASK-016
 */

import { describe, it, expect, vi } from 'vitest';
import { loadDataContext, TenantNotFoundError } from '../src/context/context-loader.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createFullTenant() {
  return {
    id: 'tenant-1',
    name: 'Urban Cuts',
    enabledModules: ['booking'],
    metadata: {
      category: 'service',
      industry: 'Beauty & Wellness',
      contact: {
        phone: '+1-555-0100',
        email: 'info@urbancuts.com',
        website: 'https://urbancuts.com',
      },
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
      },
      socialLinks: { instagram: 'https://instagram.com/urbancuts', facebook: 'https://facebook.com/urbancuts' },
    },
    websiteContext: JSON.stringify({
      url: 'https://urbancuts.com',
      description: 'A premium barbershop',
      pages: [{ url: '/', title: 'Home', description: 'Welcome', headings: [], bodyText: 'test', isExternal: false }],
      combinedContent: 'Welcome to Urban Cuts',
      businessName: 'Urban Cuts',
    }),
    availability: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 0, startTime: '09:00', endTime: '13:00', isActive: false },
    ],
    services: [
      { id: 's1', name: 'Haircut', description: 'Standard haircut', durationMinutes: 30, priceInCents: 2500, sortOrder: 1 },
      { id: 's2', name: 'Beard Trim', description: null, durationMinutes: 15, priceInCents: 1500, sortOrder: 2 },
    ],
    products: [
      {
        id: 'p1', name: 'Pomade', slug: 'pomade', description: 'Styling pomade', sku: 'SKU-001',
        priceInCents: 1200, comparePriceInCents: 1500,
        images: JSON.stringify(['img1.jpg', 'img2.jpg']),
        tags: JSON.stringify(['hair', 'styling']),
        isFeatured: true, category: { name: 'Hair Care' },
      },
    ],
    faqs: [
      { id: 'f1', question: 'Do I need an appointment?', answer: 'Walk-ins welcome but appointments preferred.', category: 'General', sortOrder: 1, status: 'published' },
    ],
    bookingConfig: {
      timezone: 'America/Chicago',
      autoConfirm: true,
      requirePhone: true,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 14,
      cancellationMinutes: 120,
      depositRequired: false,
      depositType: 'fixed',
      depositAmount: 0,
      defaultView: 'time_slots',
      allowStaffSelection: true,
    },
    linkedInGenerations: [],
    salesCampaigns: [],
  };
}

function createEmptyTenant() {
  return {
    id: 'tenant-empty',
    name: '',
    enabledModules: [],
    metadata: null,
    websiteContext: null,
    availability: [],
    services: [],
    products: [],
    faqs: [],
    bookingConfig: null,
    linkedInGenerations: [],
    salesCampaigns: [],
  };
}

function createMockPrisma(tenant: any) {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue(tenant),
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('loadDataContext', () => {
  // ---------------------------------------------------------------------------
  // Full tenant mapping
  // ---------------------------------------------------------------------------

  it('loads full tenant into correct DataContext', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.tenantId).toBe('tenant-1');
    expect(ctx.tenantName).toBe('Urban Cuts');
    expect(ctx.business.name).toBe('Urban Cuts');
    expect(ctx.business.category).toBe('service');
    expect(ctx.business.description).toBe('A premium barbershop');
    expect(ctx.business.industry).toBe('Beauty & Wellness');
  });

  // ---------------------------------------------------------------------------
  // Empty tenant
  // ---------------------------------------------------------------------------

  it('loads empty tenant with all nulls and empty arrays', async () => {
    const tenant = createEmptyTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-empty', prisma);

    expect(ctx.tenantId).toBe('tenant-empty');
    expect(ctx.tenantName).toBe('');
    expect(ctx.business.description).toBeNull();
    expect(ctx.business.industry).toBeNull();
    expect(ctx.contact.phone).toBeNull();
    expect(ctx.contact.email).toBeNull();
    expect(ctx.contact.address).toBeNull();
    expect(ctx.contact.socialMedia).toBeNull();
    expect(ctx.hours).toBeNull();
    expect(ctx.services).toEqual([]);
    expect(ctx.products).toEqual([]);
    expect(ctx.faqs).toEqual([]);
    expect(ctx.promotions).toEqual([]);
    expect(ctx.booking).toBeNull();
    expect(ctx.ordering).toBeNull();
    expect(ctx.website.scraped).toBeNull();
    expect(ctx.website.url).toBeNull();
    expect(ctx.brand.voice).toBeNull();
    expect(ctx.brand.identity).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Missing tenant → TenantNotFoundError
  // ---------------------------------------------------------------------------

  it('throws TenantNotFoundError when tenant is null', async () => {
    const prisma = createMockPrisma(null);

    await expect(loadDataContext('nonexistent', prisma)).rejects.toThrow(TenantNotFoundError);
    await expect(loadDataContext('nonexistent', prisma)).rejects.toThrow('Tenant "nonexistent" not found');
  });

  it('TenantNotFoundError has tenantId property', async () => {
    const prisma = createMockPrisma(null);

    try {
      await loadDataContext('missing-id', prisma);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TenantNotFoundError);
      expect((err as TenantNotFoundError).tenantId).toBe('missing-id');
    }
  });

  // ---------------------------------------------------------------------------
  // Services mapping (active filter)
  // ---------------------------------------------------------------------------

  it('maps services correctly with all fields', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.services).toHaveLength(2);
    expect(ctx.services[0]).toEqual({
      id: 's1',
      name: 'Haircut',
      description: 'Standard haircut',
      durationMinutes: 30,
      priceInCents: 2500,
      sortOrder: 1,
    });
    expect(ctx.services[1]).toEqual({
      id: 's2',
      name: 'Beard Trim',
      description: null,
      durationMinutes: 15,
      priceInCents: 1500,
      sortOrder: 2,
    });
  });

  // ---------------------------------------------------------------------------
  // Products mapping (with JSON parse for images/tags)
  // ---------------------------------------------------------------------------

  it('maps products correctly with images/tags JSON parse', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.products).toHaveLength(1);
    expect(ctx.products[0].id).toBe('p1');
    expect(ctx.products[0].name).toBe('Pomade');
    expect(ctx.products[0].slug).toBe('pomade');
    expect(ctx.products[0].sku).toBe('SKU-001');
    expect(ctx.products[0].priceInCents).toBe(1200);
    expect(ctx.products[0].comparePriceInCents).toBe(1500);
    expect(ctx.products[0].images).toEqual(['img1.jpg', 'img2.jpg']);
    expect(ctx.products[0].tags).toEqual(['hair', 'styling']);
    expect(ctx.products[0].isFeatured).toBe(true);
    expect(ctx.products[0].categoryName).toBe('Hair Care');
  });

  it('handles products with already-parsed arrays (not JSON strings)', async () => {
    const tenant = createFullTenant();
    tenant.products[0].images = ['a.jpg', 'b.jpg'] as any;
    tenant.products[0].tags = ['tag1'] as any;
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.products[0].images).toEqual(['a.jpg', 'b.jpg']);
    expect(ctx.products[0].tags).toEqual(['tag1']);
  });

  // ---------------------------------------------------------------------------
  // FAQs mapping
  // ---------------------------------------------------------------------------

  it('maps FAQs correctly', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.faqs).toHaveLength(1);
    expect(ctx.faqs[0]).toEqual({
      id: 'f1',
      question: 'Do I need an appointment?',
      answer: 'Walk-ins welcome but appointments preferred.',
      category: 'General',
      sortOrder: 1,
    });
  });

  // ---------------------------------------------------------------------------
  // Promotions (no model in schema, always empty)
  // ---------------------------------------------------------------------------

  it('promotions is always an empty array (no Promotion model)', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.promotions).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // BookingConfig mapping
  // ---------------------------------------------------------------------------

  it('maps bookingConfig correctly', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.booking).not.toBeNull();
    expect(ctx.booking!.timezone).toBe('America/Chicago');
    expect(ctx.booking!.autoConfirm).toBe(true);
    expect(ctx.booking!.requirePhone).toBe(true);
    expect(ctx.booking!.minAdvanceMinutes).toBe(60);
    expect(ctx.booking!.maxAdvanceDays).toBe(14);
    expect(ctx.booking!.cancellationMinutes).toBe(120);
    expect(ctx.booking!.allowStaffSelection).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Hours mapping
  // ---------------------------------------------------------------------------

  it('maps hours correctly when populated', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.hours).not.toBeNull();
    expect(ctx.hours).toHaveLength(3);
    expect(ctx.hours![0]).toEqual({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    });
    expect(ctx.hours![2].isActive).toBe(false);
  });

  it('maps hours as null when availability is empty array', async () => {
    const tenant = createEmptyTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-empty', prisma);

    expect(ctx.hours).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Website context JSON parsing
  // ---------------------------------------------------------------------------

  it('parses websiteContext JSON string', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.website.scraped).not.toBeNull();
    expect(ctx.website.scraped!.url).toBe('https://urbancuts.com');
    expect(ctx.website.scraped!.businessName).toBe('Urban Cuts');
    expect(ctx.website.scraped!.combinedContent).toBe('Welcome to Urban Cuts');
    expect(ctx.website.scraped!.pages).toHaveLength(1);
  });

  it('handles invalid websiteContext JSON gracefully for scraped data', async () => {
    const tenant = createFullTenant();
    tenant.websiteContext = 'not-valid-json';
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    // scraped is null because JSON parse fails for ScrapedWebsite
    expect(ctx.website.scraped).toBeNull();
    // description falls back to raw string slice
    expect(ctx.business.description).toBe('not-valid-json');
  });

  // ---------------------------------------------------------------------------
  // Contact address parsing
  // ---------------------------------------------------------------------------

  it('parses address from metadata.address', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.contact.address).not.toBeNull();
    expect(ctx.contact.address!.street).toBe('123 Main St');
    expect(ctx.contact.address!.city).toBe('Springfield');
    expect(ctx.contact.address!.state).toBe('IL');
    expect(ctx.contact.address!.zip).toBe('62701');
    expect(ctx.contact.address!.country).toBe('US');
  });

  it('returns null address when metadata has no address', async () => {
    const tenant = createFullTenant();
    const { address: _, ...metaWithoutAddress } = tenant.metadata as Record<string, unknown>;
    tenant.metadata = metaWithoutAddress as any;
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.contact.address).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Social media parsing
  // ---------------------------------------------------------------------------

  it('parses socialMedia from metadata.socialLinks', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.contact.socialMedia).not.toBeNull();
    expect(ctx.contact.socialMedia!.instagram).toBe('https://instagram.com/urbancuts');
    expect(ctx.contact.socialMedia!.facebook).toBe('https://facebook.com/urbancuts');
  });

  // ---------------------------------------------------------------------------
  // Partial failure handling
  // ---------------------------------------------------------------------------

  it('sets loadError on Prisma query failure', async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn().mockRejectedValue(new Error('Connection refused')),
      },
    };

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx._meta.loadError).toBeDefined();
    expect(ctx._meta.loadError).toContain('Connection refused');
    expect(ctx.tenantId).toBe('tenant-1');
    expect(ctx.services).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Single query verification
  // ---------------------------------------------------------------------------

  it('calls prisma.tenant.findUnique exactly once', async () => {
    const tenant = createFullTenant();
    const findUniqueMock = vi.fn().mockResolvedValue(tenant);
    const prisma = { tenant: { findUnique: findUniqueMock } };

    await loadDataContext('tenant-1', prisma);

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        include: expect.objectContaining({
          availability: true,
          services: expect.any(Object),
          products: expect.any(Object),
          faqs: expect.any(Object),
          bookingConfig: true,
        }),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // _meta is computed
  // ---------------------------------------------------------------------------

  it('computes _meta with field classifications', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx._meta).toBeDefined();
    expect(ctx._meta.availableFields.length).toBeGreaterThan(0);
    expect(ctx._meta.lastUpdated).toBeDefined();
    expect(ctx._meta.loadError).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Ordering is always null (no relation yet)
  // ---------------------------------------------------------------------------

  it('always sets ordering to null', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.ordering).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Brand fields are always null (set at runtime)
  // ---------------------------------------------------------------------------

  it('always sets brand.voice and brand.identity to null', async () => {
    const tenant = createFullTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-1', prisma);

    expect(ctx.brand.voice).toBeNull();
    expect(ctx.brand.identity).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Default category when template is null
  // ---------------------------------------------------------------------------

  it('defaults business.category to "service" when template is null', async () => {
    const tenant = createEmptyTenant();
    const prisma = createMockPrisma(tenant);

    const ctx = await loadDataContext('tenant-empty', prisma);

    expect(ctx.business.category).toBe('service');
  });
});
