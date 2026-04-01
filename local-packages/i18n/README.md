# @runwell/i18n

Lightweight internationalization package for React/Next.js apps. Context-based, works with Next.js 15 & 16, zero external i18n dependencies.

## Features

- 🌍 **5 languages**: EN (default), FR, DE, AR (RTL), ES
- ⚡ **Zero dependencies**: Pure React Context implementation
- 🔄 **SSR-safe**: No flash of raw translation keys
- 📱 **RTL support**: Automatic direction detection for Arabic
- 🎯 **Type-safe**: Full TypeScript support with autocomplete
- 🔌 **Framework-agnostic**: Works with any React setup
- 🎨 **CMS-ready**: Optional override system for dynamic content

## Installation

```bash
# In your monorepo app
pnpm add @runwell/i18n --workspace
```

## Quick Start

### 1. Create locale files

```
your-app/
  locales/
    en.json  # English (source of truth)
    fr.json  # French
    es.json  # Spanish
```

**Example (`locales/en.json`):**
```json
{
  "home": {
    "title": "Welcome",
    "greeting": "Hello, {{name}}!"
  },
  "items": {
    "count_zero": "No items",
    "count_one": "1 item",
    "count_other": "{{count}} items"
  }
}
```

### 2. Configure i18n

```typescript
// lib/i18n-config.ts
import type { I18nConfig, TranslationRecord } from '@runwell/i18n';
import { SUPPORTED_LOCALES } from '@runwell/i18n';
import enTranslations from '../locales/en.json';

export const defaultTranslations: TranslationRecord = enTranslations;

export const i18nConfig: I18nConfig = {
  defaultLocale: 'en',
  supportedLocales: SUPPORTED_LOCALES.filter(l => ['en', 'fr', 'es'].includes(l.code)),
  loadTranslations: async (locale) => {
    const mod = await import(`../locales/${locale}.json`);
    return mod.default ?? mod;
  },
};
```

### 3. Wrap your app

```typescript
// app/layout.tsx
import { I18nProvider } from '@runwell/i18n';
import { i18nConfig, defaultTranslations } from '@/lib/i18n-config';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nProvider config={i18nConfig} initialTranslations={defaultTranslations}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

### 4. Use translations

```typescript
'use client';
import { useI18n } from '@runwell/i18n';

export function MyComponent() {
  const { t, locale, setLocale } = useI18n();

  return (
    <div>
      <h1>{t('home.title')}</h1>
      <p>{t('home.greeting', { name: 'Alice' })}</p>
      <p>{t('items.count', { count: 5 })}</p>
    </div>
  );
}
```

## API Reference

### `<I18nProvider>`

Wraps your app to provide i18n context.

```typescript
<I18nProvider
  config={i18nConfig}           // Required: i18n configuration
  initialTranslations={enJSON}  // Required: prevents SSR flash
/>
```

### `useI18n()`

Hook for accessing i18n in components.

```typescript
const {
  locale,        // Current locale code (e.g., 'en')
  direction,     // 'ltr' or 'rtl' (auto-detected)
  setLocale,     // Function to change language
  t,             // Translation function
  isLoading      // Boolean: translations loading
} = useI18n();
```

### `t()` - Translation Function

```typescript
// Simple translation
t('home.title') // → "Welcome"

// With interpolation
t('home.greeting', { name: 'Alice' }) // → "Hello, Alice!"

// With pluralization
t('items.count', { count: 0 }) // → "No items"
t('items.count', { count: 1 }) // → "1 item"
t('items.count', { count: 5 }) // → "5 items"
```

**Pluralization rules:**
- `{key}_zero` - Used for count === 0 (optional, falls back to `_other`)
- `{key}_one` - Used for count === 1
- `{key}_other` - Used for all other counts

### `<LanguageSwitcher>`

Pre-built language selector component.

```typescript
import { LanguageSwitcher } from '@runwell/i18n';

<LanguageSwitcher
  locales={['en', 'fr', 'es']}  // Optional: defaults to all supported
  variant="auto"                 // Optional: 'light', 'dark', 'auto'
/>
```

**Auto-adapts:**
- 2 languages: Toggle button
- 3+ languages: Dropdown menu

### Server-Side (API Routes)

```typescript
import { getLocaleFromRequest } from '@runwell/i18n/server';

export async function GET(request: Request) {
  const locale = getLocaleFromRequest(
    request,
    ['en', 'fr', 'es'], // supported locales
    'en'                // default
  );

  // Use locale for server-side operations
}
```

**Detection priority:**
1. `runwell-locale` cookie
2. `Accept-Language` header
3. Default locale

## Translation File Management

### Check completeness

```bash
pnpm --filter=@runwell/i18n exec tsx scripts/check-translations.ts path/to/locales
```

**Output:**
```
✅ fr.json: 62/62 keys (100%)
❌ es.json: 58/62 keys (93%) - Missing: home.subtitle, items.new
```

### Translation structure

```json
{
  "section": {
    "key": "Simple translation",
    "interpolated": "Hello, {{name}}!",
    "count_zero": "No items",
    "count_one": "{{count}} item",
    "count_other": "{{count}} items"
  }
}
```

**Rules:**
- Use nested objects for organization
- Use `{{varName}}` for interpolation
- Use `{key}_zero/_one/_other` suffixes for pluralization
- Keep keys in `snake_case` or `camelCase`

## Advanced Features

### CMS Overrides

For apps with a CMS, you can override static translations:

```typescript
const i18nConfig: I18nConfig = {
  // ... other config
  loadCmsOverrides: async (locale) => {
    const overrides = await fetchFromCMS(locale);
    return overrides; // Deep-merged with static translations
  },
};
```

### Custom Persistence

By default, locale is saved to:
- Cookie (`runwell-locale`, 1 year, `SameSite=Lax`)
- localStorage (`runwell-locale`)

Both are handled automatically.

### HTML Attributes

The provider automatically updates:
- `<html lang="xx">` - Current locale code
- `<html dir="ltr|rtl">` - Text direction

## Supported Languages

| Code | Language | Direction | Status |
|------|----------|-----------|--------|
| `en` | English | LTR | ✅ Default |
| `fr` | French | LTR | ✅ Supported |
| `de` | German | LTR | ✅ Supported |
| `ar` | Arabic | **RTL** | ✅ Supported |
| `es` | Spanish | LTR | ✅ Supported |

## TypeScript

Full type safety included:

```typescript
import type {
  Locale,           // 'en' | 'fr' | 'de' | 'ar' | 'es'
  Direction,        // 'ltr' | 'rtl'
  I18nConfig,       // Provider config shape
  TranslationRecord // Translation file shape
} from '@runwell/i18n';
```

## Examples

### Dynamic language switching

```typescript
export function LanguageMenu() {
  const { locale, setLocale } = useI18n();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="es">Español</option>
    </select>
  );
}
```

### Conditional rendering based on locale

```typescript
export function PriceDisplay({ amount }: { amount: number }) {
  const { locale } = useI18n();

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'en' ? 'USD' : 'EUR'
  });

  return <span>{formatter.format(amount)}</span>;
}
```

### SSR with Next.js App Router

```typescript
// app/layout.tsx (Server Component)
export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

// components/providers.tsx (Client Component)
'use client';
import { I18nProvider } from '@runwell/i18n';
import { i18nConfig, defaultTranslations } from '@/lib/i18n-config';

export function ClientProviders({ children }) {
  return (
    <I18nProvider config={i18nConfig} initialTranslations={defaultTranslations}>
      {children}
    </I18nProvider>
  );
}
```

## Troubleshooting

### Flash of raw keys during SSR

**Problem:** See `home.title` instead of "Welcome" on first render

**Solution:** Pass `initialTranslations` prop with synchronously imported English translations:

```typescript
import enTranslations from '../locales/en.json';

<I18nProvider
  config={i18nConfig}
  initialTranslations={enTranslations} // ← Required for SSR
/>
```

### TypeScript error with `TranslateVars`

**Problem:** Type error when passing variables through conditional

**Solution:** Use `as` cast:

```typescript
const vars = condition ? { name: 'Alice' } : undefined;
t('home.greeting', vars as TranslateVars);
```

### Arabic translations not using `_zero` form

**Problem:** Arabic shows "0 items" instead of "No items"

**Solution:** Arabic requires explicit `_zero` key:

```json
{
  "items": {
    "count_zero": "لا عناصر",
    "count_one": "عنصر واحد",
    "count_other": "{{count}} عناصر"
  }
}
```

## License

MIT

## Related

- Part of the `runwell-bib` monorepo
- Used in: `pidgie-demo`, `shopimate-landing`
- See `CLAUDE.md` for internal implementation details
