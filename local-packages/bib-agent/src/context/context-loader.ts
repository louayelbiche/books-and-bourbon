/**
 * loadDataContext — Single-query DataContext loader
 *
 * Loads all business data for a tenant from Prisma in a single query,
 * maps DB records to the DataContext interface, and computes _meta.
 *
 * @see spec TASK-015, TASK-016
 */

import type {
  DataContext,
  BookingConfig,
  BrandVoice,
  BrandIdentity,
  Service,
  Product,
  FAQ,
  DayHours,
  BusinessAddress,
  SocialLinks,
  ScrapedWebsite,
} from './types.js';
import { computeMeta } from './meta.js';
import { parseBusinessProfile } from './business-profile.js';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Thrown when a tenant is not found in the database.
 */
export class TenantNotFoundError extends Error {
  public readonly tenantId: string;

  constructor(tenantId: string) {
    super(`Tenant "${tenantId}" not found`);
    this.name = 'TenantNotFoundError';
    this.tenantId = tenantId;
  }
}

// =============================================================================
// Main Loader
// =============================================================================

/**
 * Load a complete DataContext for a tenant from Prisma.
 *
 * Uses a single findUnique query with includes to minimize DB roundtrips.
 * If the tenant is not found, throws TenantNotFoundError.
 * On partial failure, sets _meta.loadError and populates available fields.
 *
 * @param tenantId - The tenant ID to load
 * @param prisma - PrismaClient instance (typed as unknown to avoid @prisma/client dep)
 * @returns Complete DataContext with _meta computed
 */
export async function loadDataContext(
  tenantId: string,
  prisma: unknown
): Promise<DataContext> {
  const p = prisma as any;

  let tenant: any;
  try {
    tenant = await p.tenant.findUnique({
      where: { id: tenantId },
      include: {
        availability: true,
        services: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        products: { where: { isActive: true }, take: 500, orderBy: { name: 'asc' }, include: { category: { select: { name: true } } } },
        faqs: { where: { status: 'published' }, orderBy: { sortOrder: 'asc' } },
        bookingConfig: true,
        linkedInGenerations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { analysisJson: true },
        },
        salesCampaigns: {
          where: { brandProfile: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { brandProfile: true },
        },
      },
    });
  } catch (error) {
    // Partial failure — return degraded DataContext
    const errorMessage = error instanceof Error ? error.message : String(error);
    const ctx: Omit<DataContext, '_meta'> = buildEmptyContext(tenantId);
    const meta = computeMeta(ctx);
    return {
      ...ctx,
      _meta: {
        ...meta,
        loadError: `Prisma query failed: ${errorMessage}`,
      },
    };
  }

  if (!tenant) {
    throw new TenantNotFoundError(tenantId);
  }

  // ── Map DB records to DataContext ──────────────────────────────────────

  const meta = (tenant.metadata && typeof tenant.metadata === 'object' && !Array.isArray(tenant.metadata))
    ? tenant.metadata as Record<string, unknown>
    : {};
  const contactMeta = (meta.contact as Record<string, unknown>) || {};
  const enabledModules: string[] = tenant.enabledModules || [];

  // Parse structured BusinessProfile if available (v1 JSON format)
  const profile = parseBusinessProfile(tenant.websiteContext);

  // Infer category from enabled modules (same logic as build-business-data.ts)
  let category = (meta.category as string) || null;
  if (!category) {
    if (enabledModules.includes('ordering')) category = 'restaurant';
    else if (enabledModules.includes('booking')) category = 'service';
    else if (enabledModules.includes('store')) category = 'retail';
    else category = 'service';
  }

  // Extract description from BusinessProfile or legacy websiteContext
  let description: string | null = null;
  if (profile) {
    const firstPage = profile.scraped.pages[0];
    description = firstPage?.description
      || profile.scraped.combinedContent.slice(0, 2000)
      || null;
  } else if (tenant.websiteContext) {
    try {
      const wCtx = JSON.parse(tenant.websiteContext);
      description = wCtx.description || wCtx.summary || tenant.websiteContext.slice(0, 500);
    } catch {
      description = tenant.websiteContext.slice(0, 500);
    }
  }

  const ctx: Omit<DataContext, '_meta'> = {
    tenantId: tenant.id,
    tenantName: tenant.name || '',

    business: {
      name: tenant.name || '',
      category,
      description,
      industry: (meta.industry as string) || (profile?.signals.industryKeywords[0]) || null,
    },

    contact: {
      phone: (contactMeta.phone as string) || (meta.phone as string) || profile?.signals.contactMethods.phone || null,
      email: (contactMeta.email as string) || (meta.email as string) || profile?.signals.contactMethods.email || null,
      address: parseAddress(tenant),
      socialMedia: parseSocialMedia(tenant),
    },

    hours: mapHours(tenant.availability),

    services: mapServices(tenant.services),
    products: mapProducts(tenant.products),
    faqs: mapFaqs(tenant.faqs),
    promotions: [], // No Promotion model in schema

    booking: mapBookingConfig(tenant.bookingConfig),
    ordering: null, // No orderingConfig relation yet

    website: {
      scraped: profile?.scraped || parseWebsiteContext(tenant.websiteContext),
      url: (contactMeta.website as string) || (meta.website as string) || profile?.sourceUrl || null,
      publishStatus: null,
    },

    brand: {
      voice: extractBrandVoice(tenant),
      identity: extractBrandIdentity(tenant),
    },
  };

  const computedMeta = computeMeta(ctx);
  return { ...ctx, _meta: computedMeta };
}

// =============================================================================
// Internal Mappers
// =============================================================================

function buildEmptyContext(tenantId: string): Omit<DataContext, '_meta'> {
  return {
    tenantId,
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

function parseAddress(tenant: any): BusinessAddress | null {
  // Try parsing tenant.address as JSON first
  if (tenant.address) {
    if (typeof tenant.address === 'string') {
      try {
        const parsed = JSON.parse(tenant.address);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            street: parsed.street || null,
            city: parsed.city || null,
            state: parsed.state || null,
            zip: parsed.zip || null,
            country: parsed.country || null,
            ...(parsed.lat != null ? { lat: parsed.lat } : {}),
            ...(parsed.lng != null ? { lng: parsed.lng } : {}),
          };
        }
      } catch {
        // Not JSON, fall through
      }
    } else if (typeof tenant.address === 'object') {
      return {
        street: tenant.address.street || null,
        city: tenant.address.city || null,
        state: tenant.address.state || null,
        zip: tenant.address.zip || null,
        country: tenant.address.country || null,
        ...(tenant.address.lat != null ? { lat: tenant.address.lat } : {}),
        ...(tenant.address.lng != null ? { lng: tenant.address.lng } : {}),
      };
    }
  }

  // Try metadata.address
  if (tenant.metadata?.address) {
    const addr = tenant.metadata.address;
    return {
      street: addr.street || null,
      city: addr.city || null,
      state: addr.state || null,
      zip: addr.zip || null,
      country: addr.country || null,
      ...(addr.lat != null ? { lat: addr.lat } : {}),
      ...(addr.lng != null ? { lng: addr.lng } : {}),
    };
  }

  return null;
}

function parseSocialMedia(tenant: any): SocialLinks | null {
  const links = tenant.metadata?.socialLinks;
  if (!links || typeof links !== 'object') return null;

  // Only return if there's at least one link
  const entries = Object.entries(links).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return null;

  return links as SocialLinks;
}

function mapHours(businessHours: any[] | null | undefined): DayHours[] | null {
  if (!businessHours || !Array.isArray(businessHours)) return null;
  if (businessHours.length === 0) return null;

  return businessHours.map((h: any) => ({
    dayOfWeek: h.dayOfWeek,
    startTime: h.startTime,
    endTime: h.endTime,
    isActive: h.isActive,
  }));
}

function mapServices(services: any[] | null | undefined): Service[] {
  if (!services || !Array.isArray(services)) return [];

  return services.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description || null,
    durationMinutes: s.durationMinutes ?? 0,
    priceInCents: s.priceInCents ?? 0,
    sortOrder: s.sortOrder ?? 0,
  }));
}

function mapProducts(products: any[] | null | undefined): Product[] {
  if (!products || !Array.isArray(products)) return [];

  return products.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug || '',
    description: p.description || null,
    sku: p.sku || null,
    priceInCents: p.priceInCents ?? 0,
    comparePriceInCents: p.comparePriceInCents ?? null,
    images: safeJsonParse(p.images, []),
    tags: safeJsonParse(p.tags, []),
    isFeatured: p.isFeatured ?? false,
    categoryName: p.category?.name || null,
  }));
}

function mapFaqs(faqs: any[] | null | undefined): FAQ[] {
  if (!faqs || !Array.isArray(faqs)) return [];

  return faqs.map((f: any) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category || null,
    sortOrder: f.sortOrder ?? 0,
  }));
}

function mapBookingConfig(config: any | null | undefined): BookingConfig | null {
  if (!config) return null;

  return {
    timezone: config.timezone || 'UTC',
    autoConfirm: config.autoConfirm ?? false,
    requirePhone: config.requirePhone ?? false,
    minAdvanceMinutes: config.minAdvanceMinutes ?? 0,
    maxAdvanceDays: config.maxAdvanceDays ?? 30,
    cancellationMinutes: config.cancellationMinutes ?? 0,
    depositRequired: config.depositRequired ?? false,
    depositType: config.depositType || 'fixed',
    depositAmount: config.depositAmount ?? 0,
    defaultView: config.defaultView || 'time_slots',
    allowStaffSelection: config.allowStaffSelection ?? false,
  };
}

function parseWebsiteContext(websiteContext: any): ScrapedWebsite | null {
  if (!websiteContext) return null;

  if (typeof websiteContext === 'string') {
    try {
      const parsed = JSON.parse(websiteContext);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as ScrapedWebsite;
      }
    } catch {
      return null;
    }
  }

  if (typeof websiteContext === 'object') {
    return websiteContext as ScrapedWebsite;
  }

  return null;
}

/**
 * Extract BrandVoice from the latest LinkedInGeneration.analysisJson.
 * Falls back to SalesCampaign.brandProfile if no LinkedIn data exists.
 */
function extractBrandVoice(tenant: any): BrandVoice | null {
  // Try LinkedInGeneration analysisJson first (most authoritative source)
  const latestLinkedIn = tenant.linkedInGenerations?.[0];
  if (latestLinkedIn?.analysisJson) {
    const analysis = latestLinkedIn.analysisJson as Record<string, unknown>;
    if (analysis.companyName && analysis.brandVoice) {
      return {
        companyName: String(analysis.companyName),
        industry: String(analysis.industry || ''),
        mainOfferings: Array.isArray(analysis.mainOfferings)
          ? analysis.mainOfferings.map(String)
          : [],
        brandVoice: String(analysis.brandVoice),
      };
    }
  }

  // Fallback: extract from SalesCampaign.brandProfile
  const latestCampaign = tenant.salesCampaigns?.[0];
  if (latestCampaign?.brandProfile) {
    const profile = latestCampaign.brandProfile as Record<string, unknown>;
    const voice = profile.brandVoice as Record<string, unknown> | undefined;
    if (profile.companyName) {
      return {
        companyName: String(profile.companyName),
        industry: String(profile.targetAudience || ''),
        mainOfferings: Array.isArray(profile.products)
          ? (profile.products as Array<{ name?: string }>).map(
              (p) => String(p.name || '')
            )
          : [],
        brandVoice: voice?.tone ? String(voice.tone) : '',
      };
    }
  }

  return null;
}

/**
 * Extract BrandIdentity from tenant metadata or SalesCampaign.brandProfile.
 */
function extractBrandIdentity(tenant: any): BrandIdentity | null {
  // Try tenant.metadata.brandIdentity first
  const meta = tenant.metadata as Record<string, unknown> | null;
  if (meta?.brandIdentity) {
    const bi = meta.brandIdentity as Record<string, unknown>;
    return {
      colors: Array.isArray(bi.colors) ? bi.colors.map(String) : undefined,
      fonts: Array.isArray(bi.fonts) ? bi.fonts.map(String) : undefined,
      logoUrl: bi.logoUrl ? String(bi.logoUrl) : undefined,
      tagline: bi.tagline ? String(bi.tagline) : undefined,
      values: Array.isArray(bi.values) ? bi.values.map(String) : undefined,
    };
  }

  // Fallback: extract from SalesCampaign.brandProfile
  const latestCampaign = tenant.salesCampaigns?.[0];
  if (latestCampaign?.brandProfile) {
    const profile = latestCampaign.brandProfile as Record<string, unknown>;
    if (profile.brandValues || profile.companyName) {
      return {
        values: Array.isArray(profile.brandValues)
          ? profile.brandValues.map(String)
          : undefined,
        tagline: profile.companyName ? String(profile.companyName) : undefined,
      };
    }
  }

  return null;
}

/**
 * Safely parse a JSON string, returning a fallback if parsing fails.
 * If the value is already the target type, returns it directly.
 */
function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value as unknown as T;
  if (typeof value === 'object') return value as unknown as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
