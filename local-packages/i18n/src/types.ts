export type Locale = string;
export type Direction = 'ltr' | 'rtl';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction: Direction;
}

export type TranslationRecord = Record<string, unknown>;

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: LocaleConfig[];
  loadTranslations: (locale: Locale) => Promise<TranslationRecord>;
  /**
   * Optional CMS override loader. Returns partial translation records
   * that override static JSON translations for specific keys.
   * Useful for BIB CMS copy management across languages.
   */
  loadCmsOverrides?: (locale: Locale) => Promise<TranslationRecord>;
}

export interface I18nContextValue {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  t: TranslateFunction;
  isLoading: boolean;
}

export type TranslateVars = Record<string, string | number>;

export type TranslateFunction = (key: string, vars?: TranslateVars) => string;
