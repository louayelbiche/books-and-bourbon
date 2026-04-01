/**
 * Business Signal Detection Types
 *
 * Types for analyzing scraped website content and detecting business characteristics.
 */

// ============================================================================
// Business Type
// ============================================================================

export type BusinessType =
  | 'ecommerce' // Online store, products for sale
  | 'services' // Professional services, consulting, agencies
  | 'saas' // Software as a service
  | 'local' // Local business (restaurant, salon, etc.)
  | 'portfolio' // Portfolio/creative showcase
  | 'b2b' // Business-to-business
  | 'other'; // Fallback

// ============================================================================
// Contact Methods
// ============================================================================

export interface ContactMethods {
  /** Has a contact form */
  form: boolean;
  /** Detected email address */
  email: string | null;
  /** Detected phone number */
  phone: string | null;
  /** Has live chat widget */
  chat: boolean;
  /** Has social media links */
  social: string[];
  /** Extracted physical address (from JSON-LD, <address> tag, or footer) */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    formatted?: string;
  };
}

// ============================================================================
// Business Signals
// ============================================================================

export interface BusinessSignals {
  // Detected business type
  businessType: BusinessType;

  // Content capabilities
  hasProducts: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  hasCaseStudies: boolean;
  hasTeamPage: boolean;
  hasFAQ: boolean;
  hasBlog: boolean;

  // Contact methods available
  contactMethods: ContactMethods;

  // Primary offerings extracted from content
  primaryOfferings: string[];

  // Detected industry/niche keywords
  industryKeywords: string[];

  // Extracted product entries from website (real data, never fabricated)
  productEntries?: ProductEntry[];

  // Extracted FAQ entries from website (real data, never fabricated)
  faqEntries?: FAQEntry[];

  // Extracted blog entries from website (real data, never fabricated)
  blogEntries?: BlogEntry[];

  // Site meta description from homepage
  siteDescription?: string;

  // Detection confidence (0-1)
  confidence: number;
}

// ============================================================================
// Product Entry (extracted from website)
// ============================================================================

export interface ProductEntry {
  /** Product name */
  name: string;
  /** Price in cents. 0 if not found on website. Never fabricated. */
  priceInCents: number;
  /** Currency code (e.g., 'USD', 'TND', 'EUR') */
  currency?: string;
  /** Product description */
  description?: string;
  /** Product image URL */
  imageUrl?: string;
  /** Page where product was found */
  sourceUrl: string;
  /** How the product was extracted */
  extractionMethod: 'json-ld' | 'link-text' | 'heading-text' | 'url-path';
}

// ============================================================================
// FAQ Entry (extracted from website)
// ============================================================================

export interface FAQEntry {
  /** Question text */
  question: string;
  /** Answer text */
  answer: string;
  /** Optional category grouping */
  category?: string;
  /** Page where FAQ was found */
  sourceUrl: string;
  /** How the FAQ was extracted */
  extractionMethod: 'json-ld' | 'heading-pattern';
}

// ============================================================================
// Blog Entry (extracted from website)
// ============================================================================

export interface BlogEntry {
  /** Blog post title */
  title: string;
  /** URL slug */
  slug: string;
  /** Post excerpt or summary */
  excerpt?: string;
  /** Publication date (ISO string) */
  publishedAt?: string;
  /** Featured image URL */
  imageUrl?: string;
  /** Page where blog entry was found */
  sourceUrl: string;
  /** How the blog entry was extracted */
  extractionMethod: 'json-ld' | 'link-text';
}

// ============================================================================
// Tone
// ============================================================================

export type Tone = 'friendly' | 'professional' | 'casual';

// ============================================================================
// Scraped Page (input for detection)
// ============================================================================

/**
 * Minimal interface for scraped page content.
 * Consumers can pass any object matching this shape.
 */
export interface ScrapedPageInput {
  url: string;
  title: string;
  headings: string[];
  bodyText: string;
  links: string[];
  /** Meta description (optional, for siteDescription extraction) */
  description?: string;
  /** JSON-LD structured data (optional, for product extraction) */
  jsonLd?: unknown[];
  /** Images with URLs (optional, for product image matching) */
  images?: string[];
  /** Links with anchor text (optional, for product name extraction) */
  linkDetails?: { href: string; text: string }[];
  /** Images with alt text (optional, for product image matching) */
  imageDetails?: { src: string; alt: string }[];
}

// ============================================================================
// Default Signals (for initialization)
// ============================================================================

export function createDefaultSignals(): BusinessSignals {
  return {
    businessType: 'other',
    hasProducts: false,
    hasServices: false,
    hasPricing: false,
    hasBooking: false,
    hasCaseStudies: false,
    hasTeamPage: false,
    hasFAQ: false,
    hasBlog: false,
    contactMethods: {
      form: false,
      email: null,
      phone: null,
      chat: false,
      social: [],
    },
    primaryOfferings: [],
    industryKeywords: [],
    confidence: 0,
  };
}

// ============================================================================
// Default Tone by Business Type
// ============================================================================

export function getDefaultTone(businessType: BusinessType): Tone {
  switch (businessType) {
    case 'services':
    case 'b2b':
      return 'professional';
    case 'portfolio':
      return 'casual';
    case 'ecommerce':
    case 'saas':
    case 'local':
    case 'other':
    default:
      return 'friendly';
  }
}
