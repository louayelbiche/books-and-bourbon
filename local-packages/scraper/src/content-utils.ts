/**
 * Content Utilities
 *
 * Content extraction and processing functions for the scraper.
 */

import type { CheerioAPI } from 'cheerio';
import type { ScrapedPage } from './types.js';
import { REGION_IDENTIFIERS, GENERIC_PHRASES } from './constants.js';

/**
 * Hash content for deduplication.
 *
 * @param text - Text content to hash
 * @returns Hash string
 */
export function hashContent(text: string): string {
  // Normalize: lowercase, collapse whitespace, remove punctuation
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .slice(0, 1000);

  // Simple hash using string character codes
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Check if text is a country or region identifier.
 *
 * @param text - Text to check
 * @returns True if text is a region identifier
 */
export function isCountryOrRegion(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return REGION_IDENTIFIERS.includes(lower) || lower.length <= 3;
}

/**
 * Check if text is a generic phrase (not a business name).
 *
 * @param text - Text to check
 * @returns True if text is generic
 */
export function isGenericPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  // If >50% of words are generic, it's probably a tagline
  const words = lower.split(/\s+/);
  const genericCount = words.filter((w) => GENERIC_PHRASES.includes(w)).length;
  return genericCount / words.length > 0.5;
}

/**
 * Extract business name from domain.
 *
 * @param url - URL to extract from
 * @returns Extracted name or null
 */
export function extractFromDomain(url: string): string | null {
  try {
    // calendly.com → Calendly
    // bio-instruments.tn → Bio Instruments
    const hostname = new URL(url).hostname;
    const name = hostname
      .replace(/^www\./, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return name.length > 2 ? name : null;
  } catch {
    return null;
  }
}

/**
 * Extract business name from page title.
 *
 * @param title - Page title
 * @param domainHint - Domain hint for matching
 * @returns Extracted name or null
 */
export function extractFromTitle(
  title: string,
  domainHint: string | null
): string | null {
  // Split on any common separator
  const separatorPattern = / \| | - | – | — |: /;

  if (!separatorPattern.test(title)) {
    return null;
  }

  const parts = title
    .split(separatorPattern)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length < 2) {
    return null;
  }

  // If domain hint matches a part, use it
  if (domainHint) {
    const lowerHint = domainHint.toLowerCase();

    // First: exact match (case-insensitive)
    const exactMatch = parts.find((p) => p.toLowerCase() === lowerHint);
    if (exactMatch) return exactMatch;

    // Second: part that's very close in length to domain hint
    const closeMatch = parts.find(
      (p) =>
        p.toLowerCase().includes(lowerHint) && p.length <= lowerHint.length + 5
    );
    if (closeMatch) return closeMatch;
  }

  // Prefer shorter part (likely brand name, not tagline)
  // Filter out generic phrases and overly long parts
  const validParts = parts.filter((p) => p.length < 30 && !isGenericPhrase(p));

  if (validParts.length > 0) {
    return validParts.reduce((a, b) => (a.length <= b.length ? a : b));
  }

  return null;
}

/**
 * Extract business name from homepage content.
 *
 * @param homepage - Scraped homepage data
 * @param $ - Cheerio API instance
 * @param url - Homepage URL
 * @returns Extracted business name
 */
export function extractBusinessName(
  homepage: ScrapedPage,
  $: CheerioAPI,
  url: string
): string {
  // Get domain hint early for use in parsing
  const domainName = extractFromDomain(url);

  // 1. og:site_name (most reliable)
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
  if (ogSiteName && ogSiteName.length < 50 && !isCountryOrRegion(ogSiteName)) {
    // Check if og:site_name has a separator - if so, extract the brand part
    const cleanedOgName = extractFromTitle(ogSiteName, domainName);
    if (cleanedOgName && !isCountryOrRegion(cleanedOgName)) return cleanedOgName;
    // No separator, use as-is
    return ogSiteName;
  }

  // 2. application-name
  const appName = $('meta[name="application-name"]').attr('content')?.trim();
  if (appName && appName.length < 50) return appName;

  // 3. Title parsing (improved)
  const titleName = extractFromTitle(homepage.title, domainName);
  if (titleName && !isCountryOrRegion(titleName)) return titleName;

  // 4. Domain fallback
  if (domainName) return domainName;

  // 5. First heading (last resort)
  if (homepage.headings.length > 0 && homepage.headings[0].length < 50) {
    return homepage.headings[0];
  }

  return homepage.title || 'This business';
}

/**
 * Build combined content from all scraped pages.
 *
 * @param pages - All scraped pages
 * @param businessName - Business name
 * @param baseDomain - Base domain
 * @param maxChars - Maximum characters
 * @returns Combined content string
 */
export function buildCombinedContent(
  pages: ScrapedPage[],
  businessName: string,
  baseDomain: string,
  maxChars: number
): string {
  const internalPages = pages.filter((p) => !p.isExternal);
  const externalPages = pages.filter((p) => p.isExternal);

  let content = `# ${businessName} - Website Content\n\n`;

  // Internal pages section
  if (internalPages.length > 0) {
    content += `## Primary Website (${baseDomain})\n\n`;

    for (const page of internalPages) {
      content += `### ${page.title || page.url}\n\n`;
      if (page.description) {
        content += `Description: ${page.description}\n\n`;
      }
      if (page.headings.length > 0) {
        content += `Key Points:\n${page.headings.map((h) => `- ${h}`).join('\n')}\n\n`;
      }
      if (page.images && page.images.length > 0) {
        content += `Images:\n${page.images.map((img) => `- ${img}`).join('\n')}\n\n`;
      }
      content += `Content:\n${page.bodyText}\n\n`;
      content += '---\n\n';
    }
  }

  // External pages section
  if (externalPages.length > 0) {
    content += `## External Sources & Social Profiles\n`;
    content += `*Content from external sites linked to ${businessName}:*\n\n`;

    for (const page of externalPages) {
      content += `### [External: ${page.domain}] ${page.title || 'Page'}\n\n`;
      if (page.description) {
        content += `Description: ${page.description}\n\n`;
      }
      if (page.headings.length > 0) {
        content += `Key Points:\n${page.headings.map((h) => `- ${h}`).join('\n')}\n\n`;
      }
      content += `Content:\n${page.bodyText}\n\n`;
      content += '---\n\n';
    }
  }

  return content.slice(0, maxChars);
}
