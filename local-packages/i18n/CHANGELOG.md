# @runwell/i18n Changelog

## [Unreleased]

### Enhanced Translation Validator (Plan #8 Phase 1)

**Date:** 2026-02-09

#### Improvements

- **Empty value detection**: Now catches empty strings, null, or undefined values
- **Plural form validation**: Language-specific rules for _zero, _one, _other, _few, _many
- **Enhanced reporting**: Categorized issues with visual indicators
  - `-` Missing keys
  - `+` Extra keys
  - `∅` Empty values
  - `⚠` Plural form issues
- **Coverage metrics**: Shows translation coverage percentage per locale
- **Plural form requirements**: Displays required forms per language in report
- **Better exit codes**: Returns exit code 1 on validation failure (CI/CD friendly)

#### Plural Form Rules

Added CLDR-based plural form rules:

| Language | Code | Required Forms | Notes |
|----------|------|----------------|-------|
| English | en | one, other | Standard 2-form |
| French | fr | one, other | Standard 2-form |
| German | de | one, other | Standard 2-form |
| Spanish | es | one, other | Standard 2-form |
| Arabic | ar | zero, one, other | Explicit zero form |
| Russian | ru | one, few, many, other | Complex 4-form |
| Polish | pl | one, few, many, other | Complex 4-form |

#### Example Output

```
═══════════════════════════════════════════════════════
  Translation Validation Report
═══════════════════════════════════════════════════════

Source: en.json (62 keys)

┌─ AR.json
│  Coverage: 101.6% (63/62 keys)
│  Plural forms: zero/one/other
│  Status: ✗ 1 issues found
│
│  Extra keys (1):
│    + scrape.pagesFound_zero
│
└─

┌─ DE.json
│  Coverage: 100.0% (62/62 keys)
│  Plural forms: one/other
│  Status: ✓ All checks passed
└─
```

#### Token Cost

- **Estimated tokens**: ~2,500
- **Implementation time**: 45 minutes
- **Files modified**: 1 (`scripts/check-translations.ts`)

#### Next Steps

- Phase 2: SSR hydration patterns (documentation)
- Phase 3: RTL support utilities
