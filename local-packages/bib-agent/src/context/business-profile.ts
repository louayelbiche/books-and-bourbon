/**
 * BusinessProfile: Structured storage format for scraped website data.
 *
 * Replaces the old plain-text websiteContext with a versioned JSON object
 * that preserves the full ScrapedWebsite (75K+ chars of combinedContent,
 * per-page data, JSON-LD, images) and BusinessSignals.
 *
 * Stored in tenant.websiteContext as JSON.stringify(profile).
 * parseBusinessProfile() parses it back, returning null for legacy plain-text.
 */

import type { ScrapedWebsite } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Signals shape matching @runwell/pidgie-core/detection BusinessSignals.
 * Kept minimal to avoid cross-package dependency.
 */
export interface BusinessProfileSignals {
  businessType: string;
  hasProducts: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  hasCaseStudies: boolean;
  hasTeamPage: boolean;
  hasFAQ: boolean;
  hasBlog: boolean;
  contactMethods: {
    form: boolean;
    email: string | null;
    phone: string | null;
    chat: boolean;
    social: string[];
  };
  primaryOfferings: string[];
  industryKeywords: string[];
  productEntries?: Array<{ name: string; priceInCents: number; currency?: string; description?: string; imageUrl?: string; sourceUrl: string; extractionMethod: string }>;
  faqEntries?: Array<{ question: string; answer: string; category?: string; sourceUrl: string; extractionMethod: string }>;
  blogEntries?: Array<{ title: string; slug: string; excerpt?: string; publishedAt?: string; imageUrl?: string; sourceUrl: string; extractionMethod: string }>;
  siteDescription?: string;
  confidence: number;
}

export interface BusinessProfile {
  version: 1;
  sourceUrl: string;
  scraped: ScrapedWebsite;
  signals: BusinessProfileSignals;
}

export interface ExtractedMetadata {
  contact: {
    email: string | null;
    phone: string | null;
    website: string | null;
  };
  category: string | null;
  industry: string | null;
}

// =============================================================================
// Resolve business context (shared utility for all agents)
// =============================================================================

/**
 * Resolve the effective business context string for domain tools.
 *
 * Replaces the duplicated fallback chain that was copy-pasted across
 * engagement, social, sales, and marketing agent onReady() methods.
 *
 * Priority: constructor-provided value > business description from DB >
 * first 3K chars of scraped website content > null.
 */
export function resolveBusinessContext(
  dataContext: { business: { description: string | null }; website: { scraped: { combinedContent: string } | null } },
  constructorContext: string | null,
): string | null {
  return constructorContext
    || dataContext.business.description
    || dataContext.website.scraped?.combinedContent?.slice(0, 3000)
    || null;
}

// =============================================================================
// Build
// =============================================================================

/**
 * Build a structured BusinessProfile from scraped data and signals.
 * The returned object is JSON-serialized and stored in tenant.websiteContext.
 */
export function buildBusinessProfile(
  scraped: ScrapedWebsite,
  signals: BusinessProfileSignals,
  sourceUrl: string,
): BusinessProfile {
  return {
    version: 1,
    sourceUrl,
    scraped,
    signals,
  };
}

// =============================================================================
// Parse
// =============================================================================

/**
 * Parse a stored websiteContext string back into a BusinessProfile.
 * Returns null for legacy plain-text format or invalid data.
 */
export function parseBusinessProfile(
  websiteContext: string | null | undefined,
): BusinessProfile | null {
  if (!websiteContext || typeof websiteContext !== 'string') return null;

  try {
    const parsed = JSON.parse(websiteContext);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === 1 &&
      parsed.scraped &&
      parsed.signals
    ) {
      return parsed as BusinessProfile;
    }
  } catch {
    // Not JSON (legacy plain-text format)
  }

  return null;
}

// =============================================================================
// Metadata extraction
// =============================================================================

/**
 * Extract enriched metadata from signals to populate tenant.metadata fields.
 * Used during provisioning to fill contact, category, and industry.
 */
export function extractMetadataFromSignals(
  signals: BusinessProfileSignals,
): ExtractedMetadata {
  // Map industry keywords to pidgie BusinessCategory for accurate greetings,
  // suggestions, and agent behavior. Industry keywords are more specific than
  // businessType (which is coarse: local, ecommerce, services, etc.).
  const industryToCategory: Record<string, string> = {
    food: 'restaurant',
    salon: 'salon',
    fitness: 'fitness',
    hotel: 'hotel',
    healthcare: 'healthcare',
  };

  const typeToCategory: Record<string, string> = {
    ecommerce: 'retail',
    services: 'service',
    saas: 'service',
    local: 'service',
    portfolio: 'service',
    b2b: 'service',
  };

  // Prefer industry keyword match (more specific) over businessType.
  // A "local" business with food keywords should be "restaurant", not "service".
  // Use startsWith matching because LLM keywords are often compound
  // (e.g. "food service", "fitness apparel") while our map keys are roots.
  let category: string | null = null;
  for (const kw of signals.industryKeywords) {
    const lower = kw.toLowerCase();
    for (const [root, cat] of Object.entries(industryToCategory)) {
      if (lower === root || lower.startsWith(root + ' ') || lower.startsWith(root + '-')) {
        category = cat;
        break;
      }
    }
    if (category) break;
  }
  if (!category) {
    category = typeToCategory[signals.businessType] || null;
  }

  return {
    contact: {
      email: signals.contactMethods.email || null,
      phone: signals.contactMethods.phone || null,
      website: null, // Populated from sourceUrl by caller
    },
    category,
    industry: signals.industryKeywords.length > 0
      ? signals.industryKeywords[0]
      : null,
  };
}
