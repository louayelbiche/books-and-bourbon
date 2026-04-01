/**
 * Business Signal Detection Module
 *
 * Core detection logic re-exported from @runwell/shared-tools/detection.
 * LLM enrichment is pidgie-core-specific (uses agent-core's Gemini client).
 *
 * @example
 * ```typescript
 * import {
 *   detectBusinessSignals,
 *   type BusinessSignals,
 *   type BusinessType,
 * } from '@runwell/pidgie-core/detection';
 *
 * const pages = [{ url: '...', title: '...', headings: [], bodyText: '...', links: [] }];
 * const signals = detectBusinessSignals(pages);
 *
 * console.log(signals.businessType); // 'ecommerce' | 'services' | 'saas' | ...
 * console.log(signals.confidence);   // 0-1
 * ```
 */

// Types (from shared-tools)
export type {
  BusinessType,
  BusinessSignals,
  ContactMethods,
  ProductEntry,
  FAQEntry,
  BlogEntry,
  Tone,
  ScrapedPageInput,
} from './types.js';

export { createDefaultSignals, getDefaultTone } from './types.js';

// Patterns (from shared-tools)
export { DETECTION_PATTERNS, type DetectionPatterns } from './patterns.js';

// Contact extraction (from shared-tools)
export { extractContactMethods } from './contacts.js';

// Signal detection (from shared-tools)
export {
  detectBusinessSignals,
  detectProducts,
  detectServices,
  detectPricing,
  detectBooking,
  detectCaseStudies,
  detectTeamPage,
  detectFAQ,
  detectBlog,
  detectBusinessType,
  extractPrimaryOfferings,
  extractProductEntries,
  extractFAQEntries,
  extractBlogEntries,
  extractIndustryKeywords,
  calculateConfidence,
} from './signals.js';

// LLM enrichment (pidgie-core-specific)
export { enrichSignalsWithLLM } from './llm-enrich.js';
