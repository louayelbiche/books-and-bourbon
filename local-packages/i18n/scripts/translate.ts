#!/usr/bin/env tsx
/**
 * Contextual Translation Pipeline
 *
 * Uses Claude CLI (--print) to produce culturally-appropriate,
 * conversational translations with per-language glossary, style guide,
 * and few-shot examples.
 *
 * Usage:
 *   pnpm --filter=@runwell/i18n exec tsx scripts/translate.ts <locales-dir> --lang ar
 *   pnpm --filter=@runwell/i18n exec tsx scripts/translate.ts <locales-dir> --all
 *   pnpm --filter=@runwell/i18n exec tsx scripts/translate.ts <locales-dir> --lang ar --force
 *   pnpm --filter=@runwell/i18n exec tsx scripts/translate.ts <locales-dir> --all --dry-run
 */

import { existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type {
  TranslateOptions,
  FlatTranslations,
  TranslationConfig,
} from './lib/types.js';
import { flattenJson, unflattenJson } from './lib/flatten.js';
import { computeDelta } from './lib/hash.js';
import { buildPrompt, createBatches } from './lib/prompt-builder.js';
import { translateBatch } from './lib/claude-cli.js';
import {
  readJsonFile,
  readLocaleFile,
  writeLocaleFile,
  readHashes,
  writeHashes,
  mergeTranslations,
} from './lib/json-io.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Language names for prompt context */
const LANG_NAMES: Record<string, string> = {
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  tr: 'Turkish',
  nl: 'Dutch',
  ru: 'Russian',
  tn: 'Tunisian Arabic',
};

/**
 * Parse CLI arguments.
 */
function parseArgs(): TranslateOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: tsx scripts/translate.ts <locales-dir> [options]

Options:
  --lang <code>   Translate a single language (e.g., ar, fr, de, es)
  --all           Translate all non-English locale files
  --force         Re-translate all keys (ignore content hashes)
  --dry-run       Show what would be translated without writing files

Examples:
  tsx scripts/translate.ts ../../apps/pidgie-demo/locales --lang ar
  tsx scripts/translate.ts ../../apps/pidgie-demo/locales --all --force
  tsx scripts/translate.ts ../../apps/pidgie-demo/locales --all --dry-run
`);
    process.exit(0);
  }

  const localesDir = resolve(args[0]);
  let lang: string | undefined;
  let all = false;
  let force = false;
  let dryRun = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--lang':
        lang = args[++i];
        break;
      case '--all':
        all = true;
        break;
      case '--force':
        force = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!lang && !all) {
    console.error('Error: specify --lang <code> or --all');
    process.exit(1);
  }

  return { localesDir, lang, all, force, dryRun };
}

/**
 * Load translation config from translation-config/ directory.
 */
function loadConfig(): TranslationConfig {
  const configDir = join(__dirname, '..', 'translation-config');
  return {
    glossary: readJsonFile(join(configDir, 'glossary.json')),
    styleGuides: readJsonFile(join(configDir, 'style-guides.json')),
    examples: readJsonFile(join(configDir, 'examples.json')),
  };
}

/**
 * Determine which languages to translate.
 */
function getTargetLanguages(opts: TranslateOptions): string[] {
  if (opts.lang) {
    return [opts.lang];
  }

  // --all: find all non-English JSON files in locales dir
  return readdirSync(opts.localesDir)
    .filter((f) => f.endsWith('.json') && f !== 'en.json')
    .map((f) => f.replace('.json', ''))
    .filter((lang) => !lang.startsWith('.'));  // skip hidden files like .translation-hashes
}

/**
 * Translate a single language.
 */
async function translateLanguage(
  lang: string,
  englishFlat: FlatTranslations,
  opts: TranslateOptions,
  config: TranslationConfig
): Promise<{ translated: number; skipped: number; errors: string[] }> {
  const langName = LANG_NAMES[lang] || lang;
  console.log(`\n[${ lang}] Translating to ${langName}...`);

  // Load existing translations
  const existingNested = readLocaleFile(opts.localesDir, lang);
  const existingFlat = flattenJson(existingNested);

  // Compute delta
  const previousHashes = readHashes(opts.localesDir, lang);
  const delta = computeDelta(
    englishFlat,
    previousHashes,
    new Set(Object.keys(existingFlat)),
    opts.force
  );

  // Report removed keys
  if (delta.removedKeys.length > 0) {
    console.warn(
      `  Warning: ${delta.removedKeys.length} keys removed from English source:`
    );
    for (const key of delta.removedKeys) {
      console.warn(`    - ${key}`);
    }
  }

  const keysCount = Object.keys(delta.keysToTranslate).length;
  if (keysCount === 0) {
    console.log('  No changes detected. Skipping.');
    return { translated: 0, skipped: Object.keys(englishFlat).length, errors: [] };
  }

  console.log(
    `  ${keysCount} key(s) to translate (${opts.force ? 'forced' : 'incremental'})`
  );

  if (opts.dryRun) {
    console.log('  [DRY RUN] Keys that would be translated:');
    for (const key of Object.keys(delta.keysToTranslate)) {
      const existing = existingFlat[key];
      console.log(
        `    ${key}: "${delta.keysToTranslate[key]}"${existing ? ` → current: "${existing}"` : ' (new)'}`
      );
    }
    return { translated: 0, skipped: 0, errors: [] };
  }

  // Create batches
  const batches = createBatches(delta.keysToTranslate);
  console.log(
    `  Processing in ${batches.length} batch${batches.length > 1 ? 'es' : ''}...`
  );

  let allTranslated: FlatTranslations = {};
  const allErrors: string[] = [];

  for (const batch of batches) {
    const batchLabel =
      batches.length > 1
        ? ` [batch ${batch.batchIndex + 1}/${batch.totalBatches}]`
        : '';
    console.log(
      `  Translating ${Object.keys(batch.keys).length} keys${batchLabel}...`
    );

    const prompt = buildPrompt(lang, langName, batch, config, existingFlat);
    const result = await translateBatch(prompt, batch.keys, lang);

    if (result.errors.length > 0) {
      console.warn(`  Validation warnings${batchLabel}:`);
      for (const err of result.errors) {
        console.warn(`    - ${err}`);
      }
      allErrors.push(...result.errors);
    }

    allTranslated = { ...allTranslated, ...result.translations };
  }

  // Merge with existing translations
  const merged = mergeTranslations(existingFlat, allTranslated);
  const nestedResult = unflattenJson(merged);

  // Write updated locale file
  writeLocaleFile(opts.localesDir, lang, nestedResult);
  console.log(
    `  Wrote ${Object.keys(merged).length} keys to ${lang}.json`
  );

  // Write updated hashes
  writeHashes(opts.localesDir, lang, delta.newHashes);

  // Run completeness check inline
  const englishKeySet = new Set(Object.keys(englishFlat));
  const mergedKeys = new Set(Object.keys(merged));
  const missing = [...englishKeySet].filter((k) => !mergedKeys.has(k));

  if (missing.length > 0) {
    console.warn(
      `  Warning: ${missing.length} key(s) still missing after translation:`
    );
    for (const key of missing) {
      console.warn(`    - ${key}`);
    }
  } else {
    // Account for Arabic _zero extra keys
    const extraKeys = [...mergedKeys].filter((k) => !englishKeySet.has(k));
    const legitimateExtra = extraKeys.filter(
      (k) => (lang === 'ar' || lang === 'tn') && k.endsWith('_zero')
    );
    console.log(
      `  100% coverage (${Object.keys(englishFlat).length} keys${legitimateExtra.length > 0 ? ` + ${legitimateExtra.length} Arabic _zero keys` : ''})`
    );
  }

  return {
    translated: Object.keys(allTranslated).length,
    skipped: Object.keys(englishFlat).length - keysCount,
    errors: allErrors,
  };
}

/**
 * Main entry point.
 */
async function main() {
  const opts = parseArgs();

  // Validate locales directory
  if (!existsSync(opts.localesDir)) {
    console.error(`Directory not found: ${opts.localesDir}`);
    process.exit(1);
  }

  const enPath = join(opts.localesDir, 'en.json');
  if (!existsSync(enPath)) {
    console.error(`Baseline en.json not found in: ${opts.localesDir}`);
    process.exit(1);
  }

  // Load English source
  const englishNested = readJsonFile<Record<string, unknown>>(enPath);
  const englishFlat = flattenJson(englishNested);
  console.log(`Source: en.json (${Object.keys(englishFlat).length} keys)`);
  console.log(`Directory: ${opts.localesDir}`);

  if (opts.dryRun) {
    console.log('Mode: DRY RUN (no files will be written)');
  }
  if (opts.force) {
    console.log('Mode: FORCE (re-translating all keys)');
  }

  // Load translation config
  const config = loadConfig();

  // Get target languages
  const languages = getTargetLanguages(opts);
  if (languages.length === 0) {
    console.log('No target languages found.');
    process.exit(0);
  }

  console.log(`Target languages: ${languages.join(', ')}`);

  // Translate each language
  let totalTranslated = 0;
  let totalErrors = 0;

  for (const lang of languages) {
    try {
      const result = await translateLanguage(lang, englishFlat, opts, config);
      totalTranslated += result.translated;
      totalErrors += result.errors.length;
    } catch (err) {
      console.error(`\n[${lang}] Fatal error: ${(err as Error).message}`);
      totalErrors++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(
    `Done. ${totalTranslated} key(s) translated across ${languages.length} language(s).`
  );
  if (totalErrors > 0) {
    console.warn(`${totalErrors} warning(s)/error(s) encountered.`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
