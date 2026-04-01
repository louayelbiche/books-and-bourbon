/**
 * Builds the translation prompt for Claude CLI.
 * Assembles glossary, style guide, few-shot examples, and input keys.
 */

import type {
  FlatTranslations,
  TranslationConfig,
  TranslationBatch,
} from './types.js';

const PLURAL_SUFFIXES = ['_zero', '_one', '_other'];

/**
 * Detect if a language needs _zero plural form (Arabic, etc.)
 */
function needsZeroPlural(lang: string): boolean {
  return ['ar'].includes(lang);
}

/**
 * Build the full prompt for a translation batch.
 */
export function buildPrompt(
  lang: string,
  langName: string,
  batch: TranslationBatch,
  config: TranslationConfig,
  existingTranslations: FlatTranslations
): string {
  const parts: string[] = [];

  // System instruction
  parts.push(
    `You are a professional translator for a tech product UI. Translate English → ${langName} (${lang}).`
  );
  parts.push('');

  // Rules
  parts.push('RULES:');
  parts.push('1. Return ONLY valid JSON. No markdown fences, no explanation, no commentary.');
  parts.push('2. Output must have the exact same keys as the input.');
  parts.push('3. Preserve all {{variable}} tokens exactly as they appear (do not translate them).');
  parts.push('4. Preserve brand names exactly: "Runwell", "Runwell Systems".');
  parts.push('5. Never use em dashes or en dashes in any response. Rewrite: period for separate thoughts, semicolon for related clauses, colon for explanations, comma for light pauses.');

  // Plural rules
  const hasPluralKeys = Object.keys(batch.keys).some((k) =>
    PLURAL_SUFFIXES.some((s) => k.endsWith(s))
  );
  if (hasPluralKeys) {
    parts.push(
      '5. For plural keys (_one, _other), translate each form naturally for the target language.'
    );
    if (needsZeroPlural(lang)) {
      parts.push(
        `6. For keys ending in _one or _other, also generate a corresponding _zero key if one exists in the input. Arabic uses distinct zero forms.`
      );
    }
  }

  parts.push('');

  // Style guide
  const styleGuide = config.styleGuides[lang];
  if (styleGuide) {
    parts.push(`STYLE (${styleGuide.register}):`);
    for (const rule of styleGuide.rules) {
      parts.push(`- ${rule}`);
    }
    parts.push('');
  }

  // Glossary
  const glossary = config.glossary[lang];
  if (glossary && glossary.length > 0) {
    parts.push('GLOSSARY:');
    for (const entry of glossary) {
      const note = entry.note ? ` (${entry.note})` : '';
      parts.push(`- "${entry.en}" → "${entry.translated}"${note}`);
    }
    parts.push('');
  }

  // Few-shot examples
  const examples = config.examples[lang];
  if (examples && examples.length > 0) {
    parts.push('EXAMPLES (good vs bad):');
    for (const ex of examples) {
      parts.push(`  EN: "${ex.en}"`);
      parts.push(`  GOOD: "${ex.good}"`);
      parts.push(`  BAD: "${ex.bad}"`);
      parts.push(`  WHY: ${ex.why}`);
      parts.push('');
    }
  }

  // Existing translations as context (nearby keys not in batch)
  const contextKeys = Object.entries(existingTranslations)
    .filter(([k]) => !(k in batch.keys))
    .slice(0, 20);

  if (contextKeys.length > 0) {
    parts.push(
      'EXISTING TRANSLATIONS (reference only, for consistency; do not include in output):'
    );
    const contextObj: FlatTranslations = {};
    for (const [k, v] of contextKeys) {
      contextObj[k] = v;
    }
    parts.push(JSON.stringify(contextObj, null, 2));
    parts.push('');
  }

  // Batch info
  if (batch.totalBatches > 1) {
    parts.push(
      `BATCH ${batch.batchIndex + 1}/${batch.totalBatches} (${Object.keys(batch.keys).length} keys)`
    );
    parts.push('');
  }

  // Input
  parts.push('TRANSLATE THE FOLLOWING:');
  parts.push(JSON.stringify(batch.keys, null, 2));

  return parts.join('\n');
}

/**
 * Split flat translations into batches of at most `batchSize` keys.
 */
export function createBatches(
  keys: FlatTranslations,
  batchSize: number = 50
): TranslationBatch[] {
  const entries = Object.entries(keys);
  const batches: TranslationBatch[] = [];
  const totalBatches = Math.ceil(entries.length / batchSize);

  for (let i = 0; i < entries.length; i += batchSize) {
    const batchEntries = entries.slice(i, i + batchSize);
    const batchKeys: FlatTranslations = {};
    for (const [k, v] of batchEntries) {
      batchKeys[k] = v;
    }
    batches.push({
      keys: batchKeys,
      batchIndex: batches.length,
      totalBatches,
    });
  }

  return batches;
}
