// Types
export type {
  Locale,
  Direction,
  LocaleConfig,
  TranslationRecord,
  I18nConfig,
  I18nContextValue,
  TranslateVars,
  TranslateFunction,
} from './types.js';

// Constants
export {
  COOKIE_NAME,
  STORAGE_KEY,
  SUPPORTED_LOCALES,
  RTL_LOCALES,
  LANGUAGE_NAMES,
  getDirection,
  getLocaleConfig,
  getLocaleName,
  getLanguageName,
} from './constants.js';

// Translation utilities
export {
  getNestedValue,
  interpolate,
  resolvePlural,
  translate,
} from './translate.js';

// Detection & persistence
export { detectLocale } from './detection.js';
export { persistLocale } from './persistence.js';

// React context & hook
export { I18nContext, I18nProvider } from './context.js';
export { useI18n } from './hook.js';

// Components
export { LanguageSwitcher } from './language-switcher.js';
