/**
 * Content hashing for incremental translation.
 * SHA-256 of each English value, truncated to 16 hex chars.
 */

import { createHash } from 'crypto';
import type { FlatTranslations, HashFile, TranslationDelta } from './types.js';

/**
 * Compute SHA-256 hash of a string, truncated to 16 hex chars.
 */
export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/**
 * Build a hash map for all keys in a flat translations object.
 */
export function buildHashMap(flat: FlatTranslations): HashFile {
  const hashes: HashFile = {};
  for (const [key, value] of Object.entries(flat)) {
    hashes[key] = hashValue(value);
  }
  return hashes;
}

/**
 * Compute the delta between English source and previous hashes.
 * Returns only keys that need (re)translation.
 */
export function computeDelta(
  englishFlat: FlatTranslations,
  previousHashes: HashFile,
  existingTranslationKeys: Set<string>,
  force: boolean
): TranslationDelta {
  const newHashes = buildHashMap(englishFlat);
  const keysToTranslate: FlatTranslations = {};
  const removedKeys: string[] = [];

  if (force) {
    // Force mode: retranslate everything
    return {
      keysToTranslate: { ...englishFlat },
      removedKeys: [],
      newHashes,
    };
  }

  for (const [key, value] of Object.entries(englishFlat)) {
    const newHash = newHashes[key];
    const prevHash = previousHashes[key];

    if (!prevHash) {
      // New key — needs translation
      keysToTranslate[key] = value;
    } else if (newHash !== prevHash) {
      // Changed value — needs retranslation
      keysToTranslate[key] = value;
    } else if (!existingTranslationKeys.has(key)) {
      // Hash unchanged but translation missing — needs translation
      keysToTranslate[key] = value;
    }
  }

  // Detect removed keys
  for (const key of Object.keys(previousHashes)) {
    if (!(key in englishFlat)) {
      removedKeys.push(key);
    }
  }

  return { keysToTranslate, removedKeys, newHashes };
}
