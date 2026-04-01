/**
 * Content Hashing Utilities
 *
 * Hash functions for content change detection.
 */

import { createHash } from 'crypto';

/**
 * Hash content for comparison/change detection.
 * Normalizes content before hashing to reduce false positives from
 * whitespace changes and other minor variations.
 *
 * @param content - The content to hash
 * @param options - Hashing options
 * @returns SHA-256 hash of the normalized content
 */
export function hashContent(
  content: string,
  options?: {
    /** Maximum characters to hash (default: 10000) */
    maxLength?: number;
    /** Whether to normalize content (default: true) */
    normalize?: boolean;
  }
): string {
  const { maxLength = 10000, normalize = true } = options ?? {};

  let processed = content;

  if (normalize) {
    processed = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Limit to first N chars for consistency
  if (maxLength > 0) {
    processed = processed.slice(0, maxLength);
  }

  return createHash('sha256').update(processed).digest('hex');
}

/**
 * Generate a quick hash for cache keys from URL or other identifiers.
 * Faster than full SHA-256, suitable for cache key generation.
 *
 * @param input - The input to hash
 * @returns MD5 hash (shorter, faster)
 */
export function quickHash(input: string): string {
  return createHash('md5').update(input).digest('hex');
}

/**
 * Normalize a URL for consistent cache lookups.
 * Strips trailing slashes, query params, and fragments.
 *
 * @param url - The URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL origin
 */
export function normalizeUrl(
  url: string,
  options?: {
    /** Keep path (default: false, only keeps origin) */
    keepPath?: boolean;
    /** Keep query string (default: false) */
    keepQuery?: boolean;
  }
): string {
  const { keepPath = false, keepQuery = false } = options ?? {};

  try {
    const parsed = new URL(url);

    if (!keepPath) {
      return parsed.origin;
    }

    let result = `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}`;

    if (keepQuery && parsed.search) {
      result += parsed.search;
    }

    return result;
  } catch {
    return url;
  }
}
