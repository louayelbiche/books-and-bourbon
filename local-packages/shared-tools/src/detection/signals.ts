/**
 * Business Signal Detection
 *
 * Analyzes scraped website content to detect business type and capabilities.
 */

import type {
  BusinessSignals,
  BusinessType,
  BlogEntry,
  FAQEntry,
  ProductEntry,
  ScrapedPageInput,
} from './types.js';
import { createDefaultSignals } from './types.js';
import { DETECTION_PATTERNS } from './patterns.js';
import { extractContactMethods } from './contacts.js';

// ============================================================================
// Helper Functions
// ============================================================================

function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function urlMatchesPatterns(urls: string[], patterns: RegExp[]): boolean {
  return urls.some((url) => patterns.some((pattern) => pattern.test(url)));
}

// ============================================================================
// Individual Detection Functions
// ============================================================================

/**
 * Detect if website has products for sale
 */
export function detectProducts(pages: ScrapedPageInput[]): boolean {
  const allText = pages.map((p) => p.bodyText + ' ' + p.title).join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasProductText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.products.text,
  ]);
  const hasProductUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.products.urls,
  ]);
  const hasPrices = DETECTION_PATTERNS.products.price.test(allText);

  return (hasProductText && hasPrices) || hasProductUrls;
}

/**
 * Detect if website offers services
 */
export function detectServices(pages: ScrapedPageInput[]): boolean {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.headings.join(' '))
    .join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasServiceText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.services.text,
  ]);
  const hasServiceUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.services.urls,
  ]);

  return hasServiceText || hasServiceUrls;
}

/**
 * Detect if website has pricing information
 */
export function detectPricing(pages: ScrapedPageInput[]): boolean {
  const allText = pages.map((p) => p.bodyText + ' ' + p.title).join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasPricingText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.pricing.text,
  ]);
  const hasPricingUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.pricing.urls,
  ]);

  return hasPricingText || hasPricingUrls;
}

/**
 * Detect if website has booking capabilities
 */
export function detectBooking(pages: ScrapedPageInput[]): boolean {
  const allText = pages.map((p) => p.bodyText).join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasBookingText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.booking.text,
  ]);
  const hasBookingUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.booking.urls,
  ]);

  return hasBookingText || hasBookingUrls;
}

/**
 * Detect if website has case studies
 */
export function detectCaseStudies(pages: ScrapedPageInput[]): boolean {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.title + ' ' + p.headings.join(' '))
    .join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasCaseStudyText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.caseStudies.text,
  ]);
  const hasCaseStudyUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.caseStudies.urls,
  ]);

  return hasCaseStudyText || hasCaseStudyUrls;
}

/**
 * Detect if website has a team page
 */
export function detectTeamPage(pages: ScrapedPageInput[]): boolean {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.title + ' ' + p.headings.join(' '))
    .join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  const hasTeamText = matchesPatterns(allText, [
    ...DETECTION_PATTERNS.team.text,
  ]);
  const hasTeamUrls = urlMatchesPatterns(allUrls, [
    ...DETECTION_PATTERNS.team.urls,
  ]);
  const hasRoles = matchesPatterns(allText, [...DETECTION_PATTERNS.team.roles]);

  return hasTeamText || hasTeamUrls || hasRoles;
}

/**
 * Detect if website has FAQ
 */
export function detectFAQ(pages: ScrapedPageInput[]): boolean {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.title + ' ' + p.headings.join(' '))
    .join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  return (
    matchesPatterns(allText, [...DETECTION_PATTERNS.faq.text]) ||
    urlMatchesPatterns(allUrls, [...DETECTION_PATTERNS.faq.urls])
  );
}

/**
 * Detect if website has a blog
 */
export function detectBlog(pages: ScrapedPageInput[]): boolean {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.title + ' ' + p.headings.join(' '))
    .join(' ');
  const allUrls = pages.flatMap((p) => [p.url, ...p.links]);

  return (
    matchesPatterns(allText, [...DETECTION_PATTERNS.blog.text]) ||
    urlMatchesPatterns(allUrls, [...DETECTION_PATTERNS.blog.urls])
  );
}

/**
 * Headings that are clearly UI chrome, not business offerings.
 */
const NOISE_PATTERNS: RegExp[] = [
  /^(reviews?|ratings?|average rating|customer review|write a review)/i,
  /^(related|similar|you may also|recently viewed|trending|popular)/i,
  /^(add to (cart|bag)|buy now|shop now|see more|view (all|more)|load more)/i,
  /^(sort by|filter|showing|results|search)/i,
  /^(free (shipping|delivery|returns)|limited (time|edition)|sale|new arrival)/i,
  /^(subscribe|newsletter|sign up|follow us|share|wishlist|compare)/i,
  /^(description|details|specifications|features|ingredients|size guide)/i,
  /^(terms|privacy|cookie|copyright|all rights reserved)/i,
  /^\d+(\.\d+)?\s*(out of|stars?|%|reviews?|ratings?)/i,
  /^[\W\d]+$/, // Only symbols or digits
];

/**
 * Check if a URL is the homepage or a listing/category page (not an individual item).
 */
function isHomepageOrListingPage(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    if (path === '' || path === '/') return true;
    const segments = path.split('/').filter(Boolean);
    const listingKeywords = [
      'services', 'solutions', 'offerings', 'what-we-do',
      'collections', 'categories', 'shop', 'store', 'catalog',
    ];
    if (segments.length === 1 && listingKeywords.includes(segments[0].toLowerCase())) return true;
    const categoryKeywords = ['collections', 'categories', 'shop', 'services'];
    if (segments.length === 2 && categoryKeywords.includes(segments[0].toLowerCase())) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract primary offerings from headings.
 *
 * Only examines homepage and listing/category pages (not individual product/service pages).
 * Uses section-gated heading extraction with proper boundary detection.
 */
export function extractPrimaryOfferings(pages: ScrapedPageInput[]): string[] {
  const offerings: string[] = [];
  const seen = new Set<string>();

  const sectionStartPatterns = [
    /^(?:our\s+)?services?$/i,
    /^what we (?:do|offer)$/i,
    /^solutions?$/i,
    /^(?:our\s+)?products?$/i,
    /^(?:our\s+)?offerings?$/i,
    /^(?:featured\s+)?categor(?:y|ies)$/i,
    /^(?:our\s+)?collections?$/i,
    /^(?:shop|browse)\s+(?:by\s+)?categor(?:y|ies)$/i,
    /^(?:shop|browse)\s+(?:by\s+)?collections?$/i,
    /^(?:explore|discover)\s+/i,
  ];

  const sectionEndPatterns = [
    /^(about|contact|team|blog|news|testimonials?|reviews?|faq)/i,
    /^(our\s+(?:story|mission|values|team|partners))/i,
    /^(customer\s+service|help|support|get\s+in\s+touch)/i,
    /^(latest|recent|featured)\s+(posts?|articles?|news)/i,
    /^(join|sign\s+up|subscribe|newsletter)/i,
    /^(footer|copyright)/i,
  ];

  for (const page of pages) {
    if (!isHomepageOrListingPage(page.url)) continue;

    let inOfferingsSection = false;

    for (const heading of page.headings) {
      const trimmed = heading.trim();

      if (matchesPatterns(trimmed, sectionStartPatterns)) {
        inOfferingsSection = true;
        continue;
      }

      if (matchesPatterns(trimmed, sectionEndPatterns)) {
        inOfferingsSection = false;
        continue;
      }

      if (!inOfferingsSection) continue;

      if (NOISE_PATTERNS.some((p) => p.test(trimmed))) continue;

      if (
        trimmed.length > 3 &&
        trimmed.length < 80 &&
        !seen.has(trimmed.toLowerCase())
      ) {
        seen.add(trimmed.toLowerCase());
        offerings.push(trimmed);
      }
    }
  }

  return offerings.slice(0, 10);
}

// ============================================================================
// Product Entry Extraction
// ============================================================================

/**
 * Noise anchor texts that are UI chrome, not product names.
 */
const NOISE_ANCHORS = /^(view\s+details?|add\s+to\s+cart|buy\s+now|shop\s+now|see\s+more|view\s+(all|more)|load\s+more|learn\s+more|read\s+more|contact\s+us|get\s+started|sign\s+up|log\s*in|subscribe|download|home|about|faq|blog|news|menu|close|back|next|prev|submit|search|cart|checkout|more\s+info|click\s+here)$/i;

/**
 * URL patterns that suggest a product/item detail page.
 */
const PRODUCT_URL_HINTS = /\/(products?|items?|equipment|catalog|shop|store|detail|p|article|instrument|device|machine|analyzer|model|services?|treatments?|packages?|offerings?|classes?|sessions?|menu)\b/i;

/**
 * Multi-currency price regex.
 * Matches: $1,500, 32,000 DT, EUR 500, 8.000,00 EUR, 1500 TND, etc.
 */
const PRICE_REGEX = /(?:(\$|€|£)\s*([\d,]+(?:\.\d{1,2})?))|([\d.,]+)\s*(DT|TND|MAD|DA|DZD|EUR|GBP|CAD|USD)(?:\b)/gi;

/**
 * Parse a price string into cents + currency.
 * Returns { cents: number, currency: string } or null.
 */
function parsePrice(match: RegExpMatchArray): { cents: number; currency: string } | null {
  const symbolMap: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP' };
  const codeMap: Record<string, string> = {
    DT: 'TND', TND: 'TND', MAD: 'MAD', DA: 'DZD', DZD: 'DZD',
    EUR: 'EUR', GBP: 'GBP', CAD: 'CAD', USD: 'USD',
  };

  let rawNum: string;
  let currency: string;

  if (match[1]) {
    // Symbol-prefixed: $1,500.00
    currency = symbolMap[match[1]] || 'USD';
    rawNum = match[2];
  } else if (match[3] && match[4]) {
    // Number + code: 32,000 DT
    currency = codeMap[match[4].toUpperCase()] || match[4].toUpperCase();
    rawNum = match[3];
  } else {
    return null;
  }

  // Normalize number: handle "32,000" (comma as thousands) and "8.000,00" (European)
  let num: number;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(rawNum)) {
    // European: 8.000,00 -> 8000.00
    num = parseFloat(rawNum.replace(/\./g, '').replace(',', '.'));
  } else {
    // Standard: 32,000.50 -> 32000.50
    num = parseFloat(rawNum.replace(/,/g, ''));
  }

  if (isNaN(num) || num <= 0) return null;
  return { cents: Math.round(num * 100), currency };
}

/**
 * Find a price near a product name in body text (within ~200 chars).
 */
function findNearbyPrice(bodyText: string, productName: string): { cents: number; currency: string } | null {
  const idx = bodyText.toLowerCase().indexOf(productName.toLowerCase());
  if (idx < 0) return null;
  const start = Math.max(0, idx - 50);
  const end = Math.min(bodyText.length, idx + productName.length + 200);
  const window = bodyText.slice(start, end);

  PRICE_REGEX.lastIndex = 0;
  const m = PRICE_REGEX.exec(window);
  if (m) return parsePrice(m);
  return null;
}

/**
 * Normalize a product name for deduplication.
 */
function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Extract a readable name from a URL path segment.
 * e.g., "/cyclo_mixer/" -> "Cyclo Mixer"
 */
function nameFromPath(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\.\w+$/, '') // remove file extension
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Extract real product entries from scraped pages.
 *
 * 4-layer extraction strategy (ordered by quality):
 * 1. JSON-LD Product/ItemList structured data
 * 2. Link text for product/detail URLs
 * 3. Heading text within product sections with nearby prices
 * 4. URL path segments for manufacturer/equipment links
 *
 * Never fabricates prices. If no price found, priceInCents = 0.
 * Deduplicates by normalized name. Caps at 20 products.
 */
export function extractProductEntries(pages: ScrapedPageInput[]): ProductEntry[] {
  const entries: ProductEntry[] = [];
  const seen = new Set<string>();

  function addEntry(entry: ProductEntry): boolean {
    if (entries.length >= 20) return false;
    const key = normalizeProductName(entry.name);
    if (!key || key.length < 2 || seen.has(key)) return false;
    seen.add(key);
    entries.push(entry);
    return true;
  }

  // Layer 0: Open Graph product meta tags (STORY-009 / FT-07)
  // Scraper injects OG products as synthetic JSON-LD entries with _ogProduct flag.
  for (const page of pages) {
    if (!page.jsonLd) continue;
    for (const item of page.jsonLd) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (obj._ogProduct === true) {
        const name = String(obj.name || '');
        const priceStr = String(obj.price || '0').replace(/[^0-9.]/g, '');
        const priceNum = parseFloat(priceStr) || 0;
        addEntry({
          name,
          priceInCents: Math.round(priceNum * 100),
          currency: String(obj.currency || 'USD'),
          description: String(obj.description || ''),
          imageUrl: obj.image ? String(obj.image) : undefined,
          sourceUrl: page.url,
          extractionMethod: 'json-ld',
        });
      }
    }
  }

  // Layer 1: JSON-LD structured data
  for (const page of pages) {
    if (!page.jsonLd) continue;
    for (const item of page.jsonLd) {
      const products = extractJsonLdProducts(item);
      for (const p of products) {
        addEntry({
          name: p.name,
          priceInCents: p.priceInCents,
          currency: p.currency,
          description: p.description,
          imageUrl: p.imageUrl,
          sourceUrl: page.url,
          extractionMethod: 'json-ld',
        });
      }
    }
  }

  // Layer 2: Link text for product/detail URLs
  for (const page of pages) {
    if (!page.linkDetails) continue;
    for (const link of page.linkDetails) {
      if (!PRODUCT_URL_HINTS.test(link.href)) continue;
      if (NOISE_ANCHORS.test(link.text)) continue;
      if (link.text.length < 3 || link.text.length > 120) continue;

      const priceData = findNearbyPrice(page.bodyText, link.text);
      const imageUrl = findImageForProduct(page, link.text);

      addEntry({
        name: link.text,
        priceInCents: priceData?.cents ?? 0,
        currency: priceData?.currency,
        imageUrl,
        sourceUrl: page.url,
        extractionMethod: 'link-text',
      });
    }
  }

  // Layer 3: Heading text within product sections with nearby prices
  for (const page of pages) {
    if (!isHomepageOrListingPage(page.url)) continue;
    let inProductSection = false;

    for (const heading of page.headings) {
      const trimmed = heading.trim();

      if (/^(?:our\s+)?products?$/i.test(trimmed) ||
          /^(?:featured\s+)?(?:equipment|instruments?|devices?)$/i.test(trimmed) ||
          /^(?:our\s+)?catalog(?:ue)?$/i.test(trimmed)) {
        inProductSection = true;
        continue;
      }
      if (matchesPatterns(trimmed, [
        /^(about|contact|team|blog|news|testimonials?|reviews?|faq|services?)/i,
        /^(our\s+(?:story|mission|values|team|partners))/i,
      ])) {
        inProductSection = false;
        continue;
      }

      if (!inProductSection) continue;
      if (NOISE_PATTERNS.some(p => p.test(trimmed))) continue;
      if (trimmed.length < 3 || trimmed.length > 80) continue;

      const priceData = findNearbyPrice(page.bodyText, trimmed);
      // Only add as heading-text if we found a price (otherwise it is just an offering label)
      if (priceData) {
        const imageUrl = findImageForProduct(page, trimmed);
        addEntry({
          name: trimmed,
          priceInCents: priceData.cents,
          currency: priceData.currency,
          imageUrl,
          sourceUrl: page.url,
          extractionMethod: 'heading-text',
        });
      }
    }
  }

  // Layer 4: URL path fallback for manufacturer/equipment links
  for (const page of pages) {
    if (!page.linkDetails) continue;
    for (const link of page.linkDetails) {
      // Only for external links with no useful anchor text
      if (link.text && !NOISE_ANCHORS.test(link.text) && link.text.length >= 3) continue;
      if (!PRODUCT_URL_HINTS.test(link.href)) continue;

      try {
        const url = new URL(link.href);
        const segments = url.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        if (!lastSegment || lastSegment.length < 3) continue;

        const name = nameFromPath(lastSegment);
        if (name.length < 3 || name.length > 80) continue;

        addEntry({
          name,
          priceInCents: 0,
          sourceUrl: page.url,
          extractionMethod: 'url-path',
        });
      } catch {
        continue;
      }
    }
  }

  return entries;
}

/**
 * Extract product data from a JSON-LD object (handles Product and ItemList types).
 */
function extractJsonLdProducts(data: unknown): Array<{
  name: string;
  priceInCents: number;
  currency?: string;
  description?: string;
  imageUrl?: string;
}> {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  const results: Array<{
    name: string;
    priceInCents: number;
    currency?: string;
    description?: string;
    imageUrl?: string;
  }> = [];

  const type = (obj['@type'] as string) || '';

  if (type === 'Product' || type === 'IndividualProduct' || type === 'Service') {
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name) return results;

    let priceInCents = 0;
    let currency: string | undefined;

    const offers = obj.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
    if (offers) {
      const offer = Array.isArray(offers) ? offers[0] : offers;
      if (offer && typeof offer === 'object') {
        const price = parseFloat(String(offer.price ?? '0'));
        if (!isNaN(price) && price > 0) {
          priceInCents = Math.round(price * 100);
          currency = typeof offer.priceCurrency === 'string' ? offer.priceCurrency : undefined;
        }
      }
    }

    const description = typeof obj.description === 'string' ? obj.description.trim().slice(0, 200) : undefined;
    const image = typeof obj.image === 'string' ? obj.image :
      (Array.isArray(obj.image) && typeof obj.image[0] === 'string' ? obj.image[0] : undefined);

    results.push({ name, priceInCents, currency, description, imageUrl: image });
  }

  if (type === 'ItemList' && Array.isArray(obj.itemListElement)) {
    for (const el of obj.itemListElement as unknown[]) {
      if (el && typeof el === 'object') {
        const listItem = el as Record<string, unknown>;
        const item = listItem.item ?? listItem;
        results.push(...extractJsonLdProducts(item));
      }
    }
  }

  // LocalBusiness / Restaurant / FoodEstablishment with makesOffer
  const localTypes = ['LocalBusiness', 'Restaurant', 'FoodEstablishment'];
  if (localTypes.includes(type) && Array.isArray(obj.makesOffer)) {
    for (const offer of obj.makesOffer as unknown[]) {
      if (offer && typeof offer === 'object') {
        const offerObj = offer as Record<string, unknown>;
        const itemOffered = offerObj.itemOffered;
        if (itemOffered) {
          results.push(...extractJsonLdProducts(itemOffered));
        }
      }
    }
  }

  // Menu with hasMenuSection > hasMenuItem
  if (type === 'Menu' && Array.isArray(obj.hasMenuSection)) {
    for (const section of obj.hasMenuSection as unknown[]) {
      if (section && typeof section === 'object') {
        const sectionObj = section as Record<string, unknown>;
        if (Array.isArray(sectionObj.hasMenuItem)) {
          for (const menuItem of sectionObj.hasMenuItem as unknown[]) {
            if (menuItem && typeof menuItem === 'object') {
              const mi = menuItem as Record<string, unknown>;
              const name = typeof mi.name === 'string' ? mi.name.trim() : '';
              if (!name) continue;

              let priceInCents = 0;
              let currency: string | undefined;
              const offers = mi.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
              if (offers) {
                const offer = Array.isArray(offers) ? offers[0] : offers;
                if (offer && typeof offer === 'object') {
                  const price = parseFloat(String(offer.price ?? '0'));
                  if (!isNaN(price) && price > 0) {
                    priceInCents = Math.round(price * 100);
                    currency = typeof offer.priceCurrency === 'string' ? offer.priceCurrency : undefined;
                  }
                }
              }

              const description = typeof mi.description === 'string' ? mi.description.trim().slice(0, 200) : undefined;
              results.push({ name, priceInCents, currency, description });
            }
          }
        }
      }
    }
  }

  // Handle @graph arrays
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) {
      results.push(...extractJsonLdProducts(item));
    }
  }

  return results;
}

/**
 * Try to find a matching image for a product name from page images/imageDetails.
 */
function findImageForProduct(page: ScrapedPageInput, productName: string): string | undefined {
  if (page.imageDetails) {
    const lower = productName.toLowerCase();
    for (const img of page.imageDetails) {
      if (img.alt.toLowerCase().includes(lower) || lower.includes(img.alt.toLowerCase())) {
        return img.src;
      }
    }
  }
  return undefined;
}

/**
 * Extract industry keywords
 */
export function extractIndustryKeywords(pages: ScrapedPageInput[]): string[] {
  const allText = pages
    .map((p) => p.bodyText + ' ' + p.title)
    .join(' ')
    .toLowerCase();
  const keywords: string[] = [];

  for (const [industry, patterns] of Object.entries(
    DETECTION_PATTERNS.industries
  )) {
    const matches = countMatches(allText, [...patterns]);
    if (matches >= 2) {
      keywords.push(industry);
    }
  }

  return keywords;
}

/**
 * Determine business type from signals
 */
export function detectBusinessType(
  signals: Omit<BusinessSignals, 'businessType' | 'confidence'>
): BusinessType {
  const scores: Record<BusinessType, number> = {
    ecommerce: 0,
    services: 0,
    saas: 0,
    local: 0,
    portfolio: 0,
    b2b: 0,
    other: 0,
  };

  if (signals.hasProducts) scores.ecommerce += 3;
  if (signals.hasProducts && signals.hasPricing) scores.ecommerce += 2;

  if (signals.hasPricing && !signals.hasProducts) scores.saas += 2;
  if (signals.industryKeywords.includes('technology')) scores.saas += 1;
  if (signals.hasBooking) scores.saas += 1;

  if (signals.hasServices) scores.services += 2;
  if (signals.hasCaseStudies) scores.services += 2;
  if (signals.hasTeamPage && signals.hasServices) scores.services += 1;

  if (signals.hasCaseStudies && signals.hasServices) scores.b2b += 2;
  if (signals.industryKeywords.includes('technology') && signals.hasServices)
    scores.b2b += 1;

  if (signals.hasBooking && signals.contactMethods.phone) scores.local += 2;
  if (
    signals.contactMethods.phone &&
    !signals.hasProducts &&
    !signals.hasPricing
  )
    scores.local += 1;

  if (signals.hasCaseStudies && !signals.hasServices && !signals.hasPricing)
    scores.portfolio += 2;
  if (signals.industryKeywords.includes('marketing')) scores.portfolio += 1;

  let maxScore = 0;
  let detectedType: BusinessType = 'other';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as BusinessType;
    }
  }

  if (maxScore < 2) {
    return 'other';
  }

  return detectedType;
}

/**
 * Calculate detection confidence
 */
export function calculateConfidence(
  signals: Omit<BusinessSignals, 'confidence'>
): number {
  let score = 0;
  let maxScore = 0;

  const capabilities = [
    signals.hasProducts,
    signals.hasServices,
    signals.hasPricing,
    signals.hasBooking,
    signals.hasCaseStudies,
    signals.hasTeamPage,
    signals.hasFAQ,
    signals.hasBlog,
  ];

  for (const cap of capabilities) {
    maxScore += 1;
    if (cap) score += 1;
  }

  if (signals.contactMethods.email) score += 0.5;
  if (signals.contactMethods.phone) score += 0.5;
  if (signals.contactMethods.form) score += 0.5;
  maxScore += 1.5;

  if (signals.primaryOfferings.length > 0) score += 1;
  if (signals.primaryOfferings.length > 3) score += 0.5;
  maxScore += 1.5;

  if (signals.industryKeywords.length > 0) score += 1;
  maxScore += 1;

  if (signals.businessType !== 'other') score += 1;
  maxScore += 1;

  return Math.min(score / maxScore, 1);
}

// ============================================================================
// FAQ Entry Extraction
// ============================================================================

/**
 * Extract FAQ entries from scraped pages.
 *
 * 2-layer extraction strategy:
 * 1. JSON-LD FAQPage: mainEntity array of Question objects
 * 2. Heading pattern: headings ending in ? on FAQ pages, with nearby body text as answer
 *
 * Deduplicates by normalized question text. Caps at 20 entries.
 */
export function extractFAQEntries(pages: ScrapedPageInput[]): FAQEntry[] {
  const entries: FAQEntry[] = [];
  const seen = new Set<string>();

  function addEntry(entry: FAQEntry): boolean {
    if (entries.length >= 20) return false;
    const key = entry.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    entries.push(entry);
    return true;
  }

  // Layer 1: JSON-LD FAQPage
  for (const page of pages) {
    if (!page.jsonLd) continue;
    for (const item of page.jsonLd) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const type = (obj['@type'] as string) || '';

      if (type === 'FAQPage' && Array.isArray(obj.mainEntity)) {
        for (const q of obj.mainEntity as unknown[]) {
          if (!q || typeof q !== 'object') continue;
          const qObj = q as Record<string, unknown>;
          const qType = (qObj['@type'] as string) || '';
          if (qType !== 'Question') continue;

          const question = typeof qObj.name === 'string' ? qObj.name.trim() : '';
          if (!question) continue;

          let answer = '';
          const accepted = qObj.acceptedAnswer as Record<string, unknown> | undefined;
          if (accepted && typeof accepted === 'object') {
            answer = typeof accepted.text === 'string' ? accepted.text.trim() : '';
          }
          if (!answer) continue;

          addEntry({
            question,
            answer: answer.slice(0, 1000),
            sourceUrl: page.url,
            extractionMethod: 'json-ld',
          });
        }
      }

      // Handle @graph arrays
      if (Array.isArray(obj['@graph'])) {
        for (const graphItem of obj['@graph'] as unknown[]) {
          if (!graphItem || typeof graphItem !== 'object') continue;
          const gObj = graphItem as Record<string, unknown>;
          if ((gObj['@type'] as string) === 'FAQPage' && Array.isArray(gObj.mainEntity)) {
            for (const q of gObj.mainEntity as unknown[]) {
              if (!q || typeof q !== 'object') continue;
              const qObj = q as Record<string, unknown>;
              if ((qObj['@type'] as string) !== 'Question') continue;

              const question = typeof qObj.name === 'string' ? qObj.name.trim() : '';
              if (!question) continue;

              let answer = '';
              const accepted = qObj.acceptedAnswer as Record<string, unknown> | undefined;
              if (accepted && typeof accepted === 'object') {
                answer = typeof accepted.text === 'string' ? accepted.text.trim() : '';
              }
              if (!answer) continue;

              addEntry({
                question,
                answer: answer.slice(0, 1000),
                sourceUrl: page.url,
                extractionMethod: 'json-ld',
              });
            }
          }
        }
      }
    }
  }

  // Layer 2: Heading pattern on FAQ pages
  for (const page of pages) {
    const isFaqPage = /\/faq/i.test(page.url) ||
      page.headings.some(h => /\bfaq\b|frequently\s+asked/i.test(h));
    if (!isFaqPage) continue;

    for (let i = 0; i < page.headings.length; i++) {
      const heading = page.headings[i].trim();
      if (!heading.endsWith('?')) continue;
      if (heading.length < 10) continue;

      // Find the heading in body text and extract text after it as the answer
      const headingIdx = page.bodyText.indexOf(heading);
      if (headingIdx < 0) continue;

      const afterHeading = page.bodyText.slice(headingIdx + heading.length, headingIdx + heading.length + 500).trim();
      // Take text until the next question mark heading or end of window
      const nextQ = page.headings[i + 1];
      let answer = afterHeading;
      if (nextQ) {
        const nextQIdx = afterHeading.indexOf(nextQ);
        if (nextQIdx > 0) {
          answer = afterHeading.slice(0, nextQIdx).trim();
        }
      }

      // Clean up the answer
      answer = answer.replace(/^\s*[-:]\s*/, '').trim();
      if (answer.length < 10) continue;

      addEntry({
        question: heading,
        answer: answer.slice(0, 1000),
        sourceUrl: page.url,
        extractionMethod: 'heading-pattern',
      });
    }
  }

  return entries;
}

// ============================================================================
// Blog Entry Extraction
// ============================================================================

/**
 * Derive a URL slug from a full URL path.
 */
function slugFromUrl(urlStr: string): string {
  try {
    const path = new URL(urlStr).pathname;
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    return last.replace(/\.\w+$/, '').slice(0, 60);
  } catch {
    return '';
  }
}

/**
 * Extract blog entries from scraped pages.
 *
 * 2-layer extraction strategy:
 * 1. JSON-LD BlogPosting / Article structured data
 * 2. Link text on blog listing pages (URLs matching /blog, /articles, /news, /insights)
 *
 * Deduplicates by normalized title. Caps at 10 entries.
 */
export function extractBlogEntries(pages: ScrapedPageInput[]): BlogEntry[] {
  const entries: BlogEntry[] = [];
  const seen = new Set<string>();

  function addEntry(entry: BlogEntry): boolean {
    if (entries.length >= 10) return false;
    const key = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    entries.push(entry);
    return true;
  }

  // Layer 1: JSON-LD BlogPosting / Article
  for (const page of pages) {
    if (!page.jsonLd) continue;
    for (const item of page.jsonLd) {
      extractBlogFromJsonLd(item, page.url, addEntry);
    }
  }

  // Layer 2: Link text on blog listing pages
  const blogUrlPattern = /\/(blog|articles?|news|insights|posts?)\b/i;
  for (const page of pages) {
    if (!blogUrlPattern.test(page.url)) continue;
    if (!page.linkDetails) continue;

    for (const link of page.linkDetails) {
      if (!blogUrlPattern.test(link.href)) continue;
      if (NOISE_ANCHORS.test(link.text)) continue;
      if (link.text.length < 5 || link.text.length > 200) continue;

      const slug = slugFromUrl(link.href);
      if (!slug) continue;

      addEntry({
        title: link.text,
        slug,
        sourceUrl: page.url,
        extractionMethod: 'link-text',
      });
    }
  }

  return entries;
}

/**
 * Extract blog entries from a single JSON-LD object.
 */
function extractBlogFromJsonLd(
  data: unknown,
  sourceUrl: string,
  addEntry: (entry: BlogEntry) => boolean,
): void {
  if (!data || typeof data !== 'object') return;
  const obj = data as Record<string, unknown>;
  const type = (obj['@type'] as string) || '';

  if (type === 'BlogPosting' || type === 'Article' || type === 'NewsArticle') {
    const title = (typeof obj.headline === 'string' ? obj.headline :
      typeof obj.name === 'string' ? obj.name : '').trim();
    if (!title) return;

    const url = typeof obj.url === 'string' ? obj.url : sourceUrl;
    const slug = slugFromUrl(url) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

    const excerpt = typeof obj.description === 'string' ? obj.description.trim().slice(0, 300) : undefined;
    const publishedAt = typeof obj.datePublished === 'string' ? obj.datePublished : undefined;
    const image = typeof obj.image === 'string' ? obj.image :
      (Array.isArray(obj.image) && typeof obj.image[0] === 'string' ? obj.image[0] : undefined);

    addEntry({
      title,
      slug,
      excerpt,
      publishedAt,
      imageUrl: image,
      sourceUrl,
      extractionMethod: 'json-ld',
    });
  }

  // Handle @graph arrays
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph'] as unknown[]) {
      extractBlogFromJsonLd(item, sourceUrl, addEntry);
    }
  }

  // Handle ItemList of blog posts
  if (type === 'ItemList' && Array.isArray(obj.itemListElement)) {
    for (const el of obj.itemListElement as unknown[]) {
      if (el && typeof el === 'object') {
        const listItem = el as Record<string, unknown>;
        const item = listItem.item ?? listItem;
        extractBlogFromJsonLd(item, sourceUrl, addEntry);
      }
    }
  }
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Analyze scraped pages and detect business signals
 */
export function detectBusinessSignals(
  pages: ScrapedPageInput[]
): BusinessSignals {
  if (!pages || pages.length === 0) {
    return createDefaultSignals();
  }

  const hasProducts = detectProducts(pages);
  const hasServices = detectServices(pages);
  const hasPricing = detectPricing(pages);
  const hasBooking = detectBooking(pages);
  const hasCaseStudies = detectCaseStudies(pages);
  const hasTeamPage = detectTeamPage(pages);
  const hasFAQ = detectFAQ(pages);
  const hasBlog = detectBlog(pages);
  const contactMethods = extractContactMethods(pages);
  const primaryOfferings = extractPrimaryOfferings(pages);
  const productEntries = extractProductEntries(pages);
  const faqEntries = extractFAQEntries(pages);
  const blogEntries = extractBlogEntries(pages);
  const industryKeywords = extractIndustryKeywords(pages);
  const siteDescription = pages[0]?.description || undefined;

  const partialSignals = {
    hasProducts,
    hasServices,
    hasPricing,
    hasBooking,
    hasCaseStudies,
    hasTeamPage,
    hasFAQ,
    hasBlog,
    contactMethods,
    primaryOfferings,
    ...(productEntries.length > 0 && { productEntries }),
    ...(faqEntries.length > 0 && { faqEntries }),
    ...(blogEntries.length > 0 && { blogEntries }),
    ...(siteDescription && { siteDescription }),
    industryKeywords,
  };

  const businessType = detectBusinessType(partialSignals);

  const signals: BusinessSignals = {
    ...partialSignals,
    businessType,
    confidence: 0,
  };

  signals.confidence = calculateConfidence(signals);

  return signals;
}
