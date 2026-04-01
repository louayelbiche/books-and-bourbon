/**
 * Shared types for the contextual translation pipeline.
 */

/** Flat key-value map: { "home.title": "Pidgie Bot Demo" } */
export type FlatTranslations = Record<string, string>;

/** Per-key content hash for incremental translation */
export type HashFile = Record<string, string>;

/** CLI options parsed from argv */
export interface TranslateOptions {
  localesDir: string;
  lang?: string;
  all: boolean;
  force: boolean;
  dryRun: boolean;
}

/** Result of computing delta between English source and existing translations */
export interface TranslationDelta {
  /** Keys that need (re)translation */
  keysToTranslate: FlatTranslations;
  /** Keys removed from English source */
  removedKeys: string[];
  /** Updated hash map */
  newHashes: HashFile;
}

/** Glossary entry for a single language */
export interface GlossaryEntry {
  en: string;
  translated: string;
  note?: string;
}

/** Style guide for a single language */
export interface StyleGuide {
  register: string;
  rules: string[];
}

/** Few-shot example for a single language */
export interface TranslationExample {
  en: string;
  good: string;
  bad: string;
  why: string;
}

/** Translation config loaded from JSON files */
export interface TranslationConfig {
  glossary: Record<string, GlossaryEntry[]>;
  styleGuides: Record<string, StyleGuide>;
  examples: Record<string, TranslationExample[]>;
}

/** Batch of keys sent to Claude for translation */
export interface TranslationBatch {
  keys: FlatTranslations;
  batchIndex: number;
  totalBatches: number;
}

/** Result from a single Claude invocation */
export interface TranslationResult {
  translations: FlatTranslations;
  errors: string[];
}
