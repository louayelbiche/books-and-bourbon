import { COOKIE_NAME, STORAGE_KEY } from './constants.js';

/**
 * Detect user's preferred locale.
 * Priority: cookie > localStorage > navigator.language > default
 */
export function detectLocale(
  supportedCodes: string[],
  defaultLocale: string
): string {
  // 1. Cookie
  if (typeof document !== 'undefined') {
    const cookieMatch = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (cookieMatch) {
      const cookieLocale = cookieMatch.split('=')[1];
      if (supportedCodes.includes(cookieLocale)) {
        return cookieLocale;
      }
    }
  }

  // 2. localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && supportedCodes.includes(stored)) {
        return stored;
      }
    } catch {
      // localStorage may be blocked
    }
  }

  // 3. navigator.language
  if (typeof navigator !== 'undefined' && navigator.language) {
    // Try exact match first (e.g. "fr-FR")
    if (supportedCodes.includes(navigator.language)) {
      return navigator.language;
    }
    // Try base language (e.g. "fr" from "fr-FR")
    const base = navigator.language.split('-')[0];
    if (supportedCodes.includes(base)) {
      return base;
    }

    // Try navigator.languages array
    if (navigator.languages) {
      for (const lang of navigator.languages) {
        if (supportedCodes.includes(lang)) return lang;
        const langBase = lang.split('-')[0];
        if (supportedCodes.includes(langBase)) return langBase;
      }
    }
  }

  // 4. Default
  return defaultLocale;
}
