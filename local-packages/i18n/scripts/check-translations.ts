#!/usr/bin/env tsx
/**
 * Enhanced translation completeness checker with plural form validation.
 * Compares all locale files against en.json baseline and reports:
 * - Missing keys
 * - Extra keys
 * - Empty values
 * - Invalid plural forms (language-specific rules)
 *
 * Usage:
 *   npx tsx scripts/check-translations.ts <locales-dir>
 *   pnpm --filter=@runwell/i18n exec tsx scripts/check-translations.ts ../../apps/pidgie-demo/locales
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================================
// Types
// ============================================================================

interface TranslationFile {
  locale: string;
  path: string;
  data: Record<string, any>;
}

interface ValidationIssue {
  locale: string;
  key: string;
  type: 'missing' | 'extra' | 'empty' | 'wrong_plural' | 'missing_accents';
  message: string;
}

interface PluralRules {
  zero?: boolean;
  one: boolean;
  other: boolean;
  few?: boolean;
  many?: boolean;
}

// ============================================================================
// Plural Form Rules by Language
// ============================================================================

/**
 * Plural form rules by language (CLDR-based)
 *
 * English, French, German, Spanish: one/other
 * Arabic: zero/one/other (has explicit zero form)
 * Russian, Polish: one/few/many/other (complex rules)
 */
const PLURAL_FORMS: Record<string, PluralRules> = {
  en: { one: true, other: true },
  fr: { one: true, other: true },
  de: { one: true, other: true },
  es: { one: true, other: true },
  ar: { zero: true, one: true, other: true }, // Arabic has zero form
  ru: { one: true, few: true, many: true, other: true }, // Russian complex
  pl: { one: true, few: true, many: true, other: true }, // Polish complex
};

// ============================================================================
// Key Utilities
// ============================================================================

/**
 * Flatten nested object into dot-notation keys
 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get nested value by dot-notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Validate translations against baseline
 */
function validateTranslations(
  sourceFile: TranslationFile,
  targetFiles: TranslationFile[]
): {
  valid: boolean;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const sourceKeys = new Set(flattenKeys(sourceFile.data));

  for (const targetFile of targetFiles) {
    const targetKeys = new Set(flattenKeys(targetFile.data));

    // 1. Check for missing keys
    for (const key of sourceKeys) {
      if (!targetKeys.has(key)) {
        issues.push({
          locale: targetFile.locale,
          key,
          type: 'missing',
          message: `Missing translation for key: ${key}`,
        });
      }
    }

    // 2. Check for extra keys (might be outdated)
    for (const key of targetKeys) {
      if (!sourceKeys.has(key)) {
        issues.push({
          locale: targetFile.locale,
          key,
          type: 'extra',
          message: `Extra key not in source: ${key}`,
        });
      }
    }

    // 3. Check for empty values
    for (const key of targetKeys) {
      const value = getNestedValue(targetFile.data, key);
      if (value === '' || value === null || value === undefined) {
        issues.push({
          locale: targetFile.locale,
          key,
          type: 'empty',
          message: `Empty value for key: ${key}`,
        });
      }
    }

    // 4. Check French accent enforcement
    if (targetFile.locale === 'fr') {
      for (const key of targetKeys) {
        const value = getNestedValue(targetFile.data, key);
        if (typeof value !== 'string' || value.length < 20) continue;

        // Count French letters and accented characters
        const frenchLetters = (value.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
        if (frenchLetters < 15) continue;

        const accentedChars = (value.match(/[éèêëàâùûôîïçÉÈÊËÀÂÙÛÔÎÏÇ]/g) || []).length;
        const accentRatio = accentedChars / frenchLetters;

        // French text typically has 3-8% accented characters.
        // Flag strings with zero accents that are long enough to expect some.
        if (accentedChars === 0 && frenchLetters >= 30) {
          issues.push({
            locale: targetFile.locale,
            key,
            type: 'missing_accents',
            message: `French value has no accented characters (${frenchLetters} letters). Likely missing accents: "${value.slice(0, 60)}..."`,
          });
        }
      }
    }

    // 5. Check plural forms (language-specific rules)
    const pluralRules = PLURAL_FORMS[targetFile.locale];
    if (pluralRules) {
      const checkedBaseKeys = new Set<string>();

      for (const key of targetKeys) {
        // Only check keys with plural suffixes
        if (!key.match(/_(zero|one|other|few|many)$/)) {
          continue;
        }

        const baseKey = key.replace(/_(zero|one|other|few|many)$/, '');

        // Skip if we've already validated this base key
        if (checkedBaseKeys.has(baseKey)) {
          continue;
        }
        checkedBaseKeys.add(baseKey);

        // Check required forms exist
        if (pluralRules.zero && !targetKeys.has(`${baseKey}_zero`)) {
          issues.push({
            locale: targetFile.locale,
            key: baseKey,
            type: 'wrong_plural',
            message: `Missing required plural form: ${baseKey}_zero`,
          });
        }

        if (pluralRules.one && !targetKeys.has(`${baseKey}_one`)) {
          issues.push({
            locale: targetFile.locale,
            key: baseKey,
            type: 'wrong_plural',
            message: `Missing required plural form: ${baseKey}_one`,
          });
        }

        if (pluralRules.other && !targetKeys.has(`${baseKey}_other`)) {
          issues.push({
            locale: targetFile.locale,
            key: baseKey,
            type: 'wrong_plural',
            message: `Missing required plural form: ${baseKey}_other`,
          });
        }

        if (pluralRules.few && !targetKeys.has(`${baseKey}_few`)) {
          issues.push({
            locale: targetFile.locale,
            key: baseKey,
            type: 'wrong_plural',
            message: `Missing required plural form: ${baseKey}_few`,
          });
        }

        if (pluralRules.many && !targetKeys.has(`${baseKey}_many`)) {
          issues.push({
            locale: targetFile.locale,
            key: baseKey,
            type: 'wrong_plural',
            message: `Missing required plural form: ${baseKey}_many`,
          });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Generate enhanced validation report
 */
function generateReport(
  sourceFile: TranslationFile,
  targetFiles: TranslationFile[],
  validation: ReturnType<typeof validateTranslations>
): string {
  const lines: string[] = [];
  const sourceKeyCount = flattenKeys(sourceFile.data).length;

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('  Translation Validation Report');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Source: ${sourceFile.locale}.json (${sourceKeyCount} keys)`);
  lines.push('');

  for (const targetFile of targetFiles) {
    const localeIssues = validation.issues.filter(i => i.locale === targetFile.locale);
    const targetKeyCount = flattenKeys(targetFile.data).length;
    const coverage = ((targetKeyCount / sourceKeyCount) * 100).toFixed(1);

    const pluralRules = PLURAL_FORMS[targetFile.locale];
    const pluralFormsStr = pluralRules
      ? Object.entries(pluralRules)
          .filter(([, required]) => required)
          .map(([form]) => form)
          .join('/')
      : 'N/A';

    lines.push(`┌─ ${targetFile.locale.toUpperCase()}.json`);
    lines.push(`│  Coverage: ${coverage}% (${targetKeyCount}/${sourceKeyCount} keys)`);
    lines.push(`│  Plural forms: ${pluralFormsStr}`);

    if (localeIssues.length === 0) {
      lines.push(`│  Status: ✓ All checks passed`);
      lines.push('└─');
    } else {
      const missingCount = localeIssues.filter(i => i.type === 'missing').length;
      const extraCount = localeIssues.filter(i => i.type === 'extra').length;
      const emptyCount = localeIssues.filter(i => i.type === 'empty').length;
      const pluralCount = localeIssues.filter(i => i.type === 'wrong_plural').length;
      const accentCount = localeIssues.filter(i => i.type === 'missing_accents').length;

      lines.push(`│  Status: ✗ ${localeIssues.length} issues found`);
      lines.push('│');

      if (missingCount > 0) {
        lines.push(`│  Missing keys (${missingCount}):`);
        localeIssues
          .filter(i => i.type === 'missing')
          .forEach(issue => {
            lines.push(`│    - ${issue.key}`);
          });
        lines.push('│');
      }

      if (extraCount > 0) {
        lines.push(`│  Extra keys (${extraCount}):`);
        localeIssues
          .filter(i => i.type === 'extra')
          .forEach(issue => {
            lines.push(`│    + ${issue.key}`);
          });
        lines.push('│');
      }

      if (emptyCount > 0) {
        lines.push(`│  Empty values (${emptyCount}):`);
        localeIssues
          .filter(i => i.type === 'empty')
          .forEach(issue => {
            lines.push(`│    ∅ ${issue.key}`);
          });
        lines.push('│');
      }

      if (pluralCount > 0) {
        lines.push(`│  Plural form issues (${pluralCount}):`);
        localeIssues
          .filter(i => i.type === 'wrong_plural')
          .forEach(issue => {
            lines.push(`│    ⚠ ${issue.message}`);
          });
        lines.push('│');
      }

      if (accentCount > 0) {
        lines.push(`│  Missing accents (${accentCount}):`);
        localeIssues
          .filter(i => i.type === 'missing_accents')
          .forEach(issue => {
            lines.push(`│    ⚠ ${issue.message}`);
          });
        lines.push('│');
      }

      lines.push('└─');
    }
    lines.push('');
  }

  // Summary
  const totalIssues = validation.issues.length;
  const totalMissing = validation.issues.filter(i => i.type === 'missing').length;
  const totalExtra = validation.issues.filter(i => i.type === 'extra').length;
  const totalEmpty = validation.issues.filter(i => i.type === 'empty').length;
  const totalPlural = validation.issues.filter(i => i.type === 'wrong_plural').length;
  const totalAccents = validation.issues.filter(i => i.type === 'missing_accents').length;

  lines.push('═══════════════════════════════════════════════════════');
  lines.push('  Summary');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total locales checked: ${targetFiles.length}`);
  lines.push(`Total issues: ${totalIssues}`);
  if (totalMissing > 0) lines.push(`  - Missing keys: ${totalMissing}`);
  if (totalExtra > 0) lines.push(`  - Extra keys: ${totalExtra}`);
  if (totalEmpty > 0) lines.push(`  - Empty values: ${totalEmpty}`);
  if (totalPlural > 0) lines.push(`  - Plural form issues: ${totalPlural}`);
  if (totalAccents > 0) lines.push(`  - Missing accents (FR): ${totalAccents}`);
  lines.push('');

  if (validation.valid) {
    lines.push('✓ All translations valid!');
  } else {
    lines.push('✗ Translation validation failed');
    lines.push('  Please fix the issues above before deploying.');
  }
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const localesDir = resolve(process.argv[2] || '.');

  if (!existsSync(localesDir)) {
    console.error(`Directory not found: ${localesDir}`);
    process.exit(1);
  }

  const enPath = join(localesDir, 'en.json');
  if (!existsSync(enPath)) {
    console.error(`Baseline en.json not found in: ${localesDir}`);
    process.exit(1);
  }

  // Load source file (English baseline)
  const sourceFile: TranslationFile = {
    locale: 'en',
    path: enPath,
    data: JSON.parse(readFileSync(enPath, 'utf-8')),
  };

  // Load target files (all other locales)
  const files = readdirSync(localesDir).filter(
    (f) => f.endsWith('.json') && f !== 'en.json'
  );

  if (files.length === 0) {
    console.log('\nNo other locale files found. Nothing to validate.');
    process.exit(0);
  }

  const targetFiles: TranslationFile[] = [];

  for (const file of files.sort()) {
    const filePath = join(localesDir, file);
    const locale = file.replace('.json', '');

    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      targetFiles.push({ locale, path: filePath, data });
    } catch (err) {
      console.error(`Failed to parse ${file}: ${err}`);
      process.exit(1);
    }
  }

  // Validate
  const validation = validateTranslations(sourceFile, targetFiles);

  // Generate and print report
  const report = generateReport(sourceFile, targetFiles, validation);
  console.log(report);

  // Exit with error code if validation failed
  if (!validation.valid) {
    process.exit(1);
  }
}

main();
