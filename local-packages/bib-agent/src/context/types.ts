/**
 * DataContext Type Definitions
 *
 * Typed business data manifest with explicit nulls.
 * Core data structure that all BibAgent tools read from.
 *
 * Conventions:
 * - null = not configured (NOT "closed" or "zero")
 * - [] = none configured (explicit empty collection)
 * - _meta tracks field presence for FactGuard/DataIntegrityGuard
 */

// =============================================================================
// Main DataContext Interface
// =============================================================================

export interface DataContext {
  tenantId: string;
  tenantName: string;

  business: {
    name: string;
    category: BusinessCategory;
    description: string | null;
    industry: string | null;
  };

  contact: {
    phone: string | null;
    email: string | null;
    address: BusinessAddress | null;
    socialMedia: SocialLinks | null;
  };

  hours: WeeklyHours | null;

  services: Service[];
  products: Product[];
  faqs: FAQ[];
  promotions: Promotion[];

  booking: BookingConfig | null;
  ordering: OrderingConfig | null;

  website: {
    scraped: ScrapedWebsite | null;
    url: string | null;
    publishStatus: string | null;
  };

  brand: {
    voice: BrandVoice | null;
    identity: BrandIdentity | null;
  };

  _meta: DataContextMeta;

  _extensions?: Record<string, unknown>;
}

// =============================================================================
// Meta
// =============================================================================

export interface DataContextMeta {
  availableFields: string[];
  missingFields: string[];
  emptyCollections: string[];
  lastUpdated: string;
  loadError?: string;
}

// =============================================================================
// Sub-types
// =============================================================================

export type BusinessCategory = 'restaurant' | 'retail' | 'service' | 'hospitality' | string;

export interface BusinessAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  lat?: number;
  lng?: number;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

export interface DayHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export type WeeklyHours = DayHours[];

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceInCents: number;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  priceInCents: number;
  comparePriceInCents: number | null;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  categoryName: string | null;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface BookingConfig {
  timezone: string;
  autoConfirm: boolean;
  requirePhone: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  cancellationMinutes: number;
  depositRequired: boolean;
  depositType: 'fixed' | 'percentage';
  depositAmount: number;
  defaultView: 'time_slots' | 'full_calendar';
  allowStaffSelection: boolean;
}

export interface OrderingConfig {
  enableDineIn: boolean;
  enablePickup: boolean;
  minPickupMinutes: number;
  maxScheduleDays: number;
  minOrderInCents: number;
  taxRate: number;
  enableTipping: boolean;
  tipOptions: number[];
  showPrepTime: boolean;
  showCalories: boolean;
}

export interface ScrapedWebsite {
  url: string;
  pages: ScrapedPage[];
  combinedContent: string;
  businessName: string;
  language?: string;
}

export interface ScrapedPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  links: string[];
  isExternal: boolean;
  domain: string;
  jsonLd?: unknown[];
  images?: string[];
  linkDetails?: { href: string; text: string }[];
  imageDetails?: { src: string; alt: string }[];
}

export interface BrandVoice {
  companyName: string;
  industry: string;
  mainOfferings: string[];
  brandVoice: string;
}

export interface BrandIdentity {
  colors?: string[];
  fonts?: string[];
  logoUrl?: string;
  tagline?: string;
  values?: string[];
  [key: string]: unknown;
}
