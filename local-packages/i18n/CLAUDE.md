# @runwell/i18n

Reusable internationalization package for all Runwell apps. React Context-based (no next-intl dependency), works with Next.js 15 AND 16.

## Quick Reference

| Item | Value |
|------|-------|
| Package | `@runwell/i18n` |
| Location | `packages/i18n/` in `runwell-bib` monorepo |
| Exports | `.` (client), `./server` (server), `./constants` (React-free) |
| Consumers | `apps/pidgie-demo/`, `apps/shopimate-landing/`, `packages/pidgie-shared/`, `apps/shopimate/` |
| Languages | EN (default), FR, DE, AR (RTL), ES |

## Commands

```bash
npx turbo build --filter=@runwell/i18n              # Build package
npx turbo build --filter=@runwell/i18n --force       # Build (bypass turbo cache)
pnpm --filter=@runwell/i18n exec tsx scripts/check-translations.ts <locales-dir>  # Check translation completeness
```

## Architecture

```
src/
├── types.ts              # Core types (Locale, I18nConfig, TranslateVars, etc.)
├── constants.ts          # SUPPORTED_LOCALES, LANGUAGE_NAMES, COOKIE_NAME, STORAGE_KEY, RTL_LOCALES, getLanguageName()
├── translate.ts          # getNestedValue, interpolate ({{var}}), resolvePlural (_zero/_one/_other), translate
├── detection.ts          # detectLocale: cookie > localStorage > navigator.language > default
├── persistence.ts        # persistLocale: cookie (1yr, SameSite=Lax) + localStorage
├── context.tsx           # I18nProvider (React Context + async translation loading + CMS overrides)
├── hook.ts               # useI18n() hook
├── language-switcher.tsx  # LanguageSwitcher: auto toggle (2 locales) vs dropdown (3+)
├── server.ts             # getLocaleFromRequest (cookie > Accept-Language header > default)
└── index.ts              # Barrel export
scripts/
└── check-translations.ts # CLI: compare locale files against en.json baseline
```

## Core API

```typescript
// Provider -wraps app root (client component)
<I18nProvider config={i18nConfig} initialTranslations={defaultTranslations}>

// Hook -use in any client component
const { locale, direction, setLocale, t, isLoading } = useI18n();

// Translation function
t('home.title')                          // simple key
t('loading.business', { name: 'Acme' }) // interpolation → "Loading Acme..."
t('scrape.pagesFound', { count: 3 })    // pluralization → "3 pages found"

// Language switcher (auto-adapts: toggle for 2 locales, dropdown for 3+)
<LanguageSwitcher locales={['en', 'fr', 'es']} />

// Server-side (API routes)
import { getLocaleFromRequest } from '@runwell/i18n/server';
const locale = getLocaleFromRequest(request, supportedLocales, 'en');

// Language name for agent/LLM prompts (React-free, safe for server modules)
import { getLanguageName, LANGUAGE_NAMES } from '@runwell/i18n/constants';
getLanguageName('fr')     // → 'French'
getLanguageName('tn')     // → 'Tunisian Arabic'
getLanguageName('xyz')    // → 'xyz' (fallback to code)
// LANGUAGE_NAMES: 28 languages (en, fr, de, ar, es, tn, pt, it, nl, ja, ko, zh, ru, tr, pl, sv, da, no, fi, el, cs, ro, hu, th, vi, id, ms, hi)
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | React Context | Works across Next.js 15+16, no plugin/middleware coupling |
| Interpolation | `{{var}}` double-brace | Simple regex, no deps, familiar from Handlebars |
| Pluralization | `_zero/_one/_other` suffix | Covers EN/FR/DE/ES; `_zero` used by Arabic |
| SSR safety | `initialTranslations` prop | Avoids flash of raw keys during SSR |
| Hydration | `mounted` state guard | SSR renders default locale, client detects after mount |
| HTML attributes | Auto-set `lang` + `dir` on `<html>` | Accessibility + RTL support |
| Fallback chain | current locale → default locale → key path | Missing translation shows EN, not broken key |
| Persistence | cookie + localStorage | Cookie for SSR/API routes, localStorage for fast client detection |
| CMS overrides | `loadCmsOverrides` deep-merge | BIB CMS copy management -overrides merge on top of static JSON |
| `./constants` export | Separate React-free entry | Server-side code (agents, API routes) can import `LANGUAGE_NAMES`/`getLanguageName` without pulling in React Context. Barrel (`@runwell/i18n`) bundles `createContext` which breaks Next.js server compilation |
| `LANGUAGE_NAMES` vs `SUPPORTED_LOCALES` | Separate maps | `SUPPORTED_LOCALES` lists only UI-translated locales (6). `LANGUAGE_NAMES` lists all known language names for LLM prompts (28). Agent code uses `LANGUAGE_NAMES` via `getLanguageName()` |

## Export Paths

| Path | Content | Use Case |
|------|---------|----------|
| `@runwell/i18n` | Full barrel: React Context, hooks, components, constants, translate utils | Client components (`useI18n`, `I18nProvider`, `LanguageSwitcher`) |
| `@runwell/i18n/server` | `getLocaleFromRequest` | Server-side locale detection in API routes |
| `@runwell/i18n/constants` | `SUPPORTED_LOCALES`, `LANGUAGE_NAMES`, `getLanguageName`, `getDirection`, etc. | Server modules, agents, system prompts -**no React dependency** |

## Consumer Integration Pattern

Each app that consumes this package needs:

1. **Locale files** (`locales/{en,fr,de,ar,es}.json`) -app-specific translations
2. **i18n-config.ts** -`I18nConfig` with `loadTranslations` (dynamic import) + synchronous EN import for `initialTranslations`
3. **providers.tsx** -Client wrapper with `<I18nProvider config={...} initialTranslations={...}>`
4. **layout.tsx** -Wrap `{children}` with `<Providers>`

```typescript
// Example: i18n-config.ts
import type { I18nConfig, TranslationRecord } from '@runwell/i18n';
import { SUPPORTED_LOCALES } from '@runwell/i18n';
import enTranslations from '../../locales/en.json';

export const defaultTranslations: TranslationRecord = enTranslations as TranslationRecord;

export const i18nConfig: I18nConfig = {
  defaultLocale: 'en',
  supportedLocales: SUPPORTED_LOCALES,
  loadTranslations: async (locale) => {
    const mod = await import(`../../locales/${locale}.json`);
    return mod.default ?? mod;
  },
};
```

## Adding a New Language

1. Add locale to `SUPPORTED_LOCALES` in `src/constants.ts`
2. If RTL, add to `RTL_LOCALES`
3. Rebuild: `npx turbo build --filter=@runwell/i18n --force`
4. Create `locales/{code}.json` in each consumer app
5. Run completeness check: `pnpm --filter=@runwell/i18n exec tsx scripts/check-translations.ts <locales-dir>`

## SEO Locale Routing (URL-based)

For proper multilingual SEO (`/en`, `/fr`, `/ar` URL prefixes), see **[docs/seo-locale-routing.md](docs/seo-locale-routing.md)**. Uses `next-intl` for URL routing + middleware alongside `@runwell/i18n` for translations (hybrid approach). Key: `forceLocale` prop on `I18nProvider`, `LocaleLanguageSwitcher` component, `[locale]` dynamic segment.

**Reference implementation**: `apps/shopimate-landing/`

## Gotchas

| Gotcha | Prevention |
|--------|------------|
| SSR renders raw keys without `initialTranslations` | Always pass synchronously imported EN JSON as `initialTranslations` prop |
| `TranslateVars \| undefined` TS error in DTS | Use `as TranslateVars` cast in conditional branches where vars is known to exist |
| Arabic needs `_zero` plural form | Include `key_zero` in ar.json for count-based keys |
| Turbo cache stale after TS fix | Use `--force` flag: `npx turbo build --filter=@runwell/i18n --force` |
| `tsx` not found at monorepo root | Run via filter: `pnpm --filter=@runwell/i18n exec tsx scripts/...` |
| Dynamic import path must be literal | Use template literal directly in `import()` -don't extract to variable |
| LLM prompt language | Keep system prompts in English, add `IMPORTANT: Always respond in {language}` instruction |
| API/backend errors | Stay English -UI strings only (no pidgie-shared locale files) |
| CMS overrides fail silently | By design -`loadCmsOverrides` errors are caught and ignored |
| Server code importing barrel crashes Next.js build | Server modules (agents, API routes) must use `@runwell/i18n/constants`, NOT `@runwell/i18n`. The barrel bundles React `createContext` which Next.js rejects in server context |
| `LANGUAGE_NAMES` ≠ `SUPPORTED_LOCALES` | `LANGUAGE_NAMES` has 28 entries for LLM prompts. `SUPPORTED_LOCALES` has 6 for UI translations. Don't confuse them |
| `forceLocale` + URL routing | When using next-intl URL routing, pass `forceLocale={locale}` to `I18nProvider` to skip cookie/browser detection and use the URL-derived locale |
| next-intl client hooks require `NextIntlClientProvider` | Don't use `usePathname`/`useRouter` from `next-intl/navigation` in components -use `next/navigation` + manual locale prefix stripping |

## Scope

- **In scope**: UI-facing strings in client components (pages, widgets, forms, labels)
- **Out of scope**: API error messages, backend logs, system prompts (all stay English)

## Universal Rules

See [Universal Development Rules](/Users/balencia/Documents/Code/claude-PM/foundation/rules/universal-rules.md) for writing style, documentation, and deployment patterns.
