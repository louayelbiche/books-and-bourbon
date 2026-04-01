/**
 * Input Sanitizer
 *
 * Preprocesses user input before sending to LLM.
 * Strips invisible characters, normalizes encoding, enforces limits.
 * Used by all Runwell chatbots via shared-tools.
 */

/**
 * Zero-width and invisible Unicode characters
 */
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060-\u2064\u180E\u034F\u17B4\u17B5\uFFA0]/g;

/**
 * Bidirectional text override characters
 */
const BIDI_OVERRIDES = /[\u202A-\u202E\u2066-\u2069\u061C]/g;

/**
 * Control characters (except tab, newline, carriage return)
 */
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Variation selectors (used for emoji smuggling)
 * Note: uses Unicode flag for supplementary plane chars
 */
const VARIATION_SELECTORS = /[\uFE00-\uFE0F]/g;

export interface SanitizeOptions {
  /** Maximum allowed length (default: 2000) */
  maxLength?: number;
  /** Strip invisible characters (default: true) */
  stripInvisible?: boolean;
  /** Normalize whitespace (default: true) */
  normalizeWhitespace?: boolean;
  /** Strip HTML tags (default: true) */
  stripHtml?: boolean;
}

export interface SanitizeResult {
  /** Sanitized text */
  text: string;
  /** Whether any modifications were made */
  modified: boolean;
  /** What was stripped */
  strippedTypes: string[];
  /** Original length */
  originalLength: number;
}

/**
 * Sanitize user input before LLM processing.
 */
export function sanitizeInput(input: string, options: SanitizeOptions = {}): SanitizeResult {
  const {
    maxLength = 2000,
    stripInvisible = true,
    normalizeWhitespace = true,
    stripHtml = true,
  } = options;

  let text = input;
  const strippedTypes: string[] = [];
  const originalLength = text.length;

  // Strip invisible characters
  if (stripInvisible) {
    const before = text;
    text = text.replace(INVISIBLE_CHARS, '');
    text = text.replace(BIDI_OVERRIDES, '');
    text = text.replace(CONTROL_CHARS, '');
    text = text.replace(VARIATION_SELECTORS, '');
    if (text !== before) strippedTypes.push('invisible_chars');
  }

  // Strip null bytes
  if (text.includes('\0')) {
    text = text.replace(/\0/g, '');
    strippedTypes.push('null_bytes');
  }

  // Strip HTML tags
  if (stripHtml && /<[^>]+>/.test(text)) {
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<[^>]+>/g, '');
    strippedTypes.push('html_tags');
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    const before = text;
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/\t/g, ' ');
    text = text.replace(/ {3,}/g, '  ');
    text = text.replace(/\n{4,}/g, '\n\n\n');
    text = text.trim();
    if (text !== before) strippedTypes.push('whitespace_normalized');
  }

  // Enforce length limit
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
    strippedTypes.push('truncated');
  }

  return {
    text,
    modified: strippedTypes.length > 0,
    strippedTypes,
    originalLength,
  };
}
