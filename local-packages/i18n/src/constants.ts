import type { LocaleConfig } from './types.js';

export const COOKIE_NAME = 'runwell-locale';
export const STORAGE_KEY = 'runwell-locale';

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
];

export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'tn']);

export function getDirection(locale: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

export function getLocaleConfig(locale: string, supportedLocales: LocaleConfig[]): LocaleConfig | undefined {
  return supportedLocales.find((l) => l.code === locale);
}

export function getLocaleName(locale: string, supportedLocales: LocaleConfig[]): string {
  return getLocaleConfig(locale, supportedLocales)?.nativeName ?? locale;
}

/**
 * Comprehensive language name map for agent/LLM prompts.
 * Separate from SUPPORTED_LOCALES (which only lists UI-translated locales).
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', de: 'German', ar: 'Arabic', es: 'Spanish',
  tn: 'Tunisian Arabic', pt: 'Portuguese', it: 'Italian', nl: 'Dutch',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ru: 'Russian',
  tr: 'Turkish', pl: 'Polish', sv: 'Swedish', da: 'Danish', no: 'Norwegian',
  fi: 'Finnish', el: 'Greek', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', hi: 'Hindi',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}
