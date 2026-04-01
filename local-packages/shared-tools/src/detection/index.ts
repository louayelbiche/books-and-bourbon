// Types
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

// Patterns
export { DETECTION_PATTERNS, type DetectionPatterns } from './patterns.js';

// Contact extraction
export { extractContactMethods } from './contacts.js';

// Signal detection
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
