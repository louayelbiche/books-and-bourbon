# SEO Locale Routing with next-intl

Guide for adding URL-based locale routing (`/en`, `/fr`, `/ar`, etc.) to any site that uses `@runwell/i18n` for translations. This gives each language its own crawlable URL for proper SEO indexing.

## Why

Without URL-based routing, all languages share one URL (e.g. `example.com`). Search engines only see the default language. With locale routing:

- `example.com/en` — English (indexed separately)
- `example.com/fr` — French (indexed separately)
- `example.com/ar` — Arabic (indexed separately)

Google indexes each as a distinct page with proper `hreflang` signals, `alternateLocales` in OpenGraph, and per-locale meta titles/descriptions.

## Architecture

**Hybrid approach** — `next-intl` handles routing only (middleware + `[locale]` URL segments), while `@runwell/i18n` continues to handle translations (all `useI18n()` / `t()` calls stay unchanged).

```
next-intl → URL routing, locale detection, middleware redirects
@runwell/i18n → Translation loading, t() function, React context
```

This avoids rewriting every component. The `forceLocale` prop on `I18nProvider` bridges the two systems.

## Setup Steps

### 1. Install next-intl

```bash
pnpm --filter=@runwell/<app-name> add next-intl
```

### 2. Create routing config

Create `src/i18n/routing.ts`:

```typescript
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fr', 'ar', 'es'],  // your supported locales
  defaultLocale: 'en',
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

### 3. Create request config

Create `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // Empty messages — actual translations handled by @runwell/i18n
    messages: {},
  };
});
```

### 4. Create middleware

Create `src/middleware.ts`:

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except API routes and static files
  matcher: ['/((?!api|_next|.*\\..*).*)',],
};
```

### 5. Wrap next.config with plugin

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // ... existing config
};

export default withNextIntl(nextConfig);
```

### 6. Create `[locale]` layout

Move all pages from `app/` to `app/[locale]/`. Keep `api/` routes at root level.

```
app/
├── layout.tsx              ← Root layout (html/body only, no providers)
├── globals.css
├── api/                    ← API routes stay here (no locale prefix)
│   └── ...
└── [locale]/
    ├── layout.tsx          ← Locale layout (providers + SEO metadata)
    ├── page.tsx            ← Home page
    ├── demo/
    │   └── page.tsx
    ├── compare/
    │   └── page.tsx
    └── ...
```

**Root layout** (`app/layout.tsx`) — stripped down, no providers:

```tsx
export default function RootLayout({ children }) {
  return (
    <html className="scroll-smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

**Locale layout** (`app/[locale]/layout.tsx`):

```tsx
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { I18nWrapper } from '@/components/I18nWrapper';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Return per-locale title, description, alternates, openGraph, etc.
  return {
    title: titles[locale],
    description: descriptions[locale],
    alternates: {
      canonical: `https://example.com/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `https://example.com/${l}`])
      ),
    },
    openGraph: {
      locale: ogLocales[locale],
      alternateLocales: Object.values(ogLocales).filter((l) => l !== ogLocales[locale]),
      // ...
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <I18nWrapper forceLocale={locale}>
      {children}
    </I18nWrapper>
  );
}
```

### 7. Update I18nWrapper to accept forceLocale

```tsx
export function I18nWrapper({ children, forceLocale }: { children: ReactNode; forceLocale?: string }) {
  return (
    <I18nProvider config={i18nConfig} initialTranslations={defaultTranslations} forceLocale={forceLocale}>
      {children}
    </I18nProvider>
  );
}
```

The `forceLocale` prop was added to `@runwell/i18n`'s `I18nProvider` in Feb 2026. It overrides the cookie/localStorage/browser detection and uses the URL-derived locale directly.

### 8. Create URL-aware LanguageSwitcher

The standard `LanguageSwitcher` from `@runwell/i18n` only changes React state. With URL routing, switching locales must navigate to a new URL. Create a local `LocaleLanguageSwitcher`:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@runwell/i18n';
import { routing } from '@/i18n/routing';

export function LocaleLanguageSwitcher({ locales }) {
  const { locale } = useI18n();
  const rawPathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const localePattern = new RegExp(`^/(${routing.locales.join('|')})`);
    const pathWithoutLocale = rawPathname.replace(localePattern, '') || '/';
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    window.location.href = newPath;
  };

  // ... render dropdown/toggle using switchLocale instead of setLocale
}
```

Replace `LanguageSwitcher` imports with `LocaleLanguageSwitcher` in all components.

## Gotchas

| Gotcha | Solution |
|--------|----------|
| `usePathname` from next-intl requires `NextIntlClientProvider` | Use `usePathname` from `next/navigation` and strip locale prefix manually |
| `useRouter` from next-intl requires provider | Use `window.location.href` for locale switching, `next/navigation` router for same-locale navigation |
| Hardcoded links like `/demo` don't include locale | The middleware auto-redirects bare paths to locale-prefixed versions (e.g. `/demo` → `/en/demo`) |
| `isHome` pathname check fails (pathname is `/en` not `/`) | Strip locale prefix: `pathname.replace(/^\/(en|fr|ar|es)/, '') \|\| '/'` |
| Static prerendering fails without `setRequestLocale` | Call `setRequestLocale(locale)` in the `[locale]/layout.tsx` before any next-intl usage |
| `metadataBase` warning during build | Set `metadataBase` in the locale layout's `generateMetadata` |
| API routes get locale prefix | Keep `api/` directory at `app/` root, NOT inside `[locale]/` |
| Next.js 16 "middleware deprecated" warning | Cosmetic warning — middleware still works, `proxy` is the future replacement |

## SEO Output

After implementation, each locale URL gets:

- **`<html lang="fr">`** — set dynamically by `I18nProvider`
- **`<link rel="alternate" hreflang="en">`** — via `alternates.languages` in metadata
- **`<link rel="canonical">`** — via `alternates.canonical` in metadata
- **`<meta property="og:locale" content="fr_FR">`** — per-locale OpenGraph
- **`<meta property="og:locale:alternate" content="en_US">`** — alternateLocales
- **Localized `<title>` and `<meta description>`** — per-locale SEO copy

## Reference Implementation

- **Shopimate Landing**: `apps/shopimate-landing/` (4 locales: en, fr, ar, es)
- **Dating Pidgie**: `runwell-webstudio/cli-made/dating-pidgie/` (2 locales: de, en)
