'use client';

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { I18nConfig, I18nContextValue, TranslationRecord, TranslateVars } from './types.js';
import { getDirection } from './constants.js';
import { detectLocale } from './detection.js';
import { persistLocale } from './persistence.js';
import { translate } from './translate.js';

export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Deep merge source into target. Source values override target values.
 * Only merges plain objects; arrays and primitives are replaced.
 */
function deepMerge(target: TranslationRecord, source: TranslationRecord): TranslationRecord {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      sourceVal &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as TranslationRecord,
        sourceVal as TranslationRecord
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

interface I18nProviderProps {
  config: I18nConfig;
  /**
   * Pre-loaded translations for the default locale. Provides content during SSR
   * so t() returns real strings instead of raw key paths on first render.
   */
  initialTranslations?: TranslationRecord;
  /**
   * Force a specific locale instead of auto-detecting from cookie/localStorage/browser.
   * Used when the locale is determined by the URL path (e.g., /en, /fr) via next-intl routing.
   */
  forceLocale?: string;
  /**
   * Optional error handler for translation loading failures.
   * If not provided, errors are silently ignored.
   */
  onError?: (error: unknown, locale: string) => void;
  children: ReactNode;
}

export function I18nProvider({ config, initialTranslations, forceLocale, onError, children }: I18nProviderProps) {
  const { defaultLocale, supportedLocales, loadTranslations, loadCmsOverrides } = config;
  const supportedCodes = supportedLocales.map((l) => l.code);

  const [mounted, setMounted] = useState(false);
  const [locale, setLocaleState] = useState(forceLocale && supportedCodes.includes(forceLocale) ? forceLocale : defaultLocale);
  const [translations, setTranslations] = useState<TranslationRecord>(initialTranslations ?? {});
  const [fallbackTranslations, setFallbackTranslations] = useState<TranslationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(!initialTranslations);

  const loadingRef = useRef(false);

  // Load translations for a locale (static JSON + optional CMS overrides)
  const loadLocale = useCallback(
    async (loc: string) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setIsLoading(true);

      try {
        let msgs = await loadTranslations(loc);

        // Merge CMS overrides on top of static translations
        if (loadCmsOverrides) {
          try {
            const overrides = await loadCmsOverrides(loc);
            if (overrides && Object.keys(overrides).length > 0) {
              msgs = deepMerge(msgs, overrides);
            }
          } catch {
            // CMS overrides are optional — don't block on failure
          }
        }

        setTranslations(msgs);

        // Load fallback (default locale) if different from current
        if (loc !== defaultLocale) {
          let fallback = await loadTranslations(defaultLocale);
          if (loadCmsOverrides) {
            try {
              const fallbackOverrides = await loadCmsOverrides(defaultLocale);
              if (fallbackOverrides && Object.keys(fallbackOverrides).length > 0) {
                fallback = deepMerge(fallback, fallbackOverrides);
              }
            } catch {
              // CMS overrides are optional
            }
          }
          setFallbackTranslations(fallback);
        } else {
          setFallbackTranslations(null);
        }
      } catch (err) {
        // Call optional error handler, or silently ignore
        onError?.(err, loc);
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [loadTranslations, loadCmsOverrides, defaultLocale, onError]
  );

  // After mount: detect locale (or use forced), load translations
  useEffect(() => {
    const resolved = forceLocale && supportedCodes.includes(forceLocale)
      ? forceLocale
      : detectLocale(supportedCodes, defaultLocale);
    setLocaleState(resolved);
    setMounted(true);
    loadLocale(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Respond to forceLocale prop changes after mount (URL-based locale navigation)
  useEffect(() => {
    if (!mounted) return;
    if (!forceLocale || !supportedCodes.includes(forceLocale)) return;
    if (forceLocale === locale) return;

    loadingRef.current = false;
    setLocaleState(forceLocale);
    loadLocale(forceLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceLocale]);

  // Sync translations immediately when initialTranslations prop changes (URL-based locale switch).
  // useState(initialTranslations) only uses the value on mount; this effect handles subsequent changes.
  const prevInitialRef = useRef(initialTranslations);
  useEffect(() => {
    if (!mounted || !initialTranslations) return;
    if (initialTranslations === prevInitialRef.current) return;
    prevInitialRef.current = initialTranslations;
    setTranslations(initialTranslations);
  }, [initialTranslations, mounted]);

  // Update <html> lang and dir attributes
  useEffect(() => {
    if (!mounted) return;
    const dir = getDirection(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, mounted]);

  const setLocale = useCallback(
    (newLocale: string) => {
      if (!supportedCodes.includes(newLocale)) return;
      if (newLocale === locale) return;

      setLocaleState(newLocale);
      persistLocale(newLocale);
      loadLocale(newLocale);
    },
    [locale, supportedCodes, loadLocale]
  );

  const t = useCallback(
    (key: string, vars?: TranslateVars): string => {
      return translate(translations, fallbackTranslations, key, vars);
    },
    [translations, fallbackTranslations]
  );

  const direction = getDirection(locale);

  const value: I18nContextValue = {
    locale,
    direction,
    setLocale,
    t,
    isLoading,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
