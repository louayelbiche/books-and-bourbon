import { COOKIE_NAME, STORAGE_KEY } from './constants.js';

/**
 * Persist the selected locale to cookie + localStorage.
 * Cookie is set with 1 year expiry, path=/, SameSite=Lax.
 */
export function persistLocale(locale: string): void {
  // Cookie
  if (typeof document !== 'undefined') {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${COOKIE_NAME}=${locale};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  // localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage may be blocked
    }
  }
}
