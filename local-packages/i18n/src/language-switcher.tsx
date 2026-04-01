'use client';

import { useState, useRef, useEffect } from 'react';
import { useI18n } from './hook.js';
import type { LocaleConfig } from './types.js';

interface LanguageSwitcherProps {
  locales: LocaleConfig[];
  className?: string;
  /** Force dark or light dropdown theme. Default "auto" uses Tailwind dark: variants. */
  variant?: 'auto' | 'dark' | 'light';
}

export function LanguageSwitcher({ locales, className = '', variant = 'auto' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  // 2 locales → toggle button; 3+ → dropdown
  if (locales.length === 2) {
    return <ToggleSwitcher locales={locales} locale={locale} setLocale={setLocale} className={className} />;
  }

  return <DropdownSwitcher locales={locales} locale={locale} setLocale={setLocale} className={className} variant={variant} />;
}

function ToggleSwitcher({
  locales,
  locale,
  setLocale,
  className,
}: {
  locales: LocaleConfig[];
  locale: string;
  setLocale: (l: string) => void;
  className: string;
}) {
  const other = locales.find((l) => l.code !== locale) ?? locales[0];

  return (
    <button
      onClick={() => setLocale(other.code)}
      className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm min-h-[44px] rounded-lg border border-current/20 hover:bg-current/5 transition-colors ${className}`}
      aria-label={`Switch to ${other.name}`}
      title={`Switch to ${other.nativeName}`}
    >
      <span aria-hidden="true">🌐</span>
      <span>{other.nativeName}</span>
    </button>
  );
}

function DropdownSwitcher({
  locales,
  locale,
  setLocale,
  className,
  variant = 'auto',
}: {
  locales: LocaleConfig[];
  locale: string;
  setLocale: (l: string) => void;
  className: string;
  variant: 'auto' | 'dark' | 'light';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = locales.find((l) => l.code === locale) ?? locales[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm min-h-[44px] rounded-lg border border-current/20 hover:bg-current/5 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span aria-hidden="true">🌐</span>
        <span>{current.nativeName}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Available languages"
          className={`absolute top-full mt-1 right-0 min-w-[160px] max-w-[calc(100vw-1rem)] rounded-lg shadow-lg py-1 z-50 ${
            variant === 'dark'
              ? 'bg-neutral-900 border border-neutral-700 text-neutral-100'
              : variant === 'light'
                ? 'bg-white border border-neutral-200 text-neutral-900'
                : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
          }`}
        >
          {locales.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === locale}
              onClick={() => {
                setLocale(l.code);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-3 text-sm transition-colors ${
                l.code === locale
                  ? variant === 'dark'
                    ? 'bg-neutral-800 font-medium'
                    : variant === 'light'
                      ? 'bg-neutral-100 font-medium'
                      : 'bg-neutral-100 dark:bg-neutral-800 font-medium'
                  : variant === 'dark'
                    ? 'hover:bg-neutral-800/50'
                    : variant === 'light'
                      ? 'hover:bg-neutral-50'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
              dir={l.direction}
            >
              <span>{l.nativeName}</span>
              {l.code === locale && (
                <span className="ml-2 text-xs opacity-60">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
