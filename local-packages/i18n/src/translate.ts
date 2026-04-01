import type { TranslationRecord, TranslateVars } from './types.js';

/**
 * Resolve a dot-separated key path from a nested object.
 * e.g. getNestedValue({ home: { title: "Hi" } }, "home.title") => "Hi"
 */
export function getNestedValue(obj: TranslationRecord, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Interpolate {{var}} placeholders in a string.
 * e.g. interpolate("Hello {{name}}", { name: "World" }) => "Hello World"
 */
export function interpolate(template: string, vars: TranslateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * Resolve plural form based on count.
 * Looks for keys with suffixes: _zero, _one, _other
 * e.g. for count=0 → try _zero → _other
 *      for count=1 → try _one → _other
 *      for count=N → _other
 */
export function resolvePlural(
  translations: TranslationRecord,
  keyPath: string,
  count: number
): string | undefined {
  let suffixedKey: string;

  if (count === 0) {
    suffixedKey = `${keyPath}_zero`;
    const zero = getNestedValue(translations, suffixedKey);
    if (typeof zero === 'string') return zero;
  }

  if (count === 1) {
    suffixedKey = `${keyPath}_one`;
    const one = getNestedValue(translations, suffixedKey);
    if (typeof one === 'string') return one;
  }

  suffixedKey = `${keyPath}_other`;
  const other = getNestedValue(translations, suffixedKey);
  if (typeof other === 'string') return other;

  return undefined;
}

/**
 * Main translate function.
 * Fallback chain: current locale translations → default locale translations → key path
 */
export function translate(
  translations: TranslationRecord,
  fallbackTranslations: TranslationRecord | null,
  key: string,
  vars?: TranslateVars
): string {
  const count = vars?.count;
  const hasCount = count !== undefined && typeof count === 'number';

  // Try current locale
  if (hasCount) {
    const plural = resolvePlural(translations, key, count);
    if (plural) return interpolate(plural, vars as TranslateVars);
  }

  const value = getNestedValue(translations, key);
  if (typeof value === 'string') {
    return vars ? interpolate(value, vars) : value;
  }

  // Try fallback (default locale)
  if (fallbackTranslations) {
    if (hasCount) {
      const plural = resolvePlural(fallbackTranslations, key, count);
      if (plural) return interpolate(plural, vars as TranslateVars);
    }

    const fallbackValue = getNestedValue(fallbackTranslations, key);
    if (typeof fallbackValue === 'string') {
      return vars ? interpolate(fallbackValue, vars) : fallbackValue;
    }
  }

  // Last resort: return key path
  return key;
}
