/**
 * JSON file I/O utilities for locale files and hash files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { FlatTranslations, HashFile } from './types.js';

/**
 * Read and parse a JSON file. Returns empty object if not found.
 */
export function readJsonFile<T = Record<string, unknown>>(
  filePath: string
): T {
  if (!existsSync(filePath)) {
    return {} as T;
  }
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

/**
 * Write a JSON file with 2-space indentation and trailing newline.
 */
export function writeJsonFile(
  filePath: string,
  data: unknown
): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Get the hash file path for a given language.
 * Hash files are stored alongside locale files as .translation-hashes-{lang}.json
 */
export function getHashFilePath(localesDir: string, lang: string): string {
  return join(localesDir, `.translation-hashes-${lang}.json`);
}

/**
 * Read previous hashes for a language. Returns empty if no hash file exists.
 */
export function readHashes(localesDir: string, lang: string): HashFile {
  return readJsonFile<HashFile>(getHashFilePath(localesDir, lang));
}

/**
 * Write updated hashes for a language.
 */
export function writeHashes(
  localesDir: string,
  lang: string,
  hashes: HashFile
): void {
  writeJsonFile(getHashFilePath(localesDir, lang), hashes);
}

/**
 * Read a locale file. Returns empty object if not found.
 */
export function readLocaleFile(
  localesDir: string,
  lang: string
): Record<string, unknown> {
  return readJsonFile<Record<string, unknown>>(
    join(localesDir, `${lang}.json`)
  );
}

/**
 * Write a locale file.
 */
export function writeLocaleFile(
  localesDir: string,
  lang: string,
  data: Record<string, unknown>
): void {
  writeJsonFile(join(localesDir, `${lang}.json`), data);
}

/**
 * Merge translated flat keys into an existing nested locale object.
 * Preserves manually-added keys that aren't in the English source.
 */
export function mergeTranslations(
  existing: FlatTranslations,
  newTranslations: FlatTranslations
): FlatTranslations {
  return { ...existing, ...newTranslations };
}
