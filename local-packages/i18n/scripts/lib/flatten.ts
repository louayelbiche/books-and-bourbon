/**
 * JSON flatten/unflatten utilities.
 * Converts nested locale JSON to flat dot-path keys and back.
 */

import type { FlatTranslations } from './types.js';

/**
 * Flatten a nested object to dot-separated keys.
 * { home: { title: "Hi" } } → { "home.title": "Hi" }
 */
export function flattenJson(
  obj: Record<string, unknown>,
  prefix = ''
): FlatTranslations {
  const result: FlatTranslations = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenJson(value as Record<string, unknown>, fullKey)
      );
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Unflatten dot-separated keys back to nested object.
 * { "home.title": "Hi" } → { home: { title: "Hi" } }
 */
export function unflattenJson(
  flat: FlatTranslations
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Sort keys to ensure parent paths are created before children
  const sortedKeys = Object.keys(flat).sort();

  for (const key of sortedKeys) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = flat[key];
  }

  return result;
}
