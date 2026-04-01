/**
 * Per-domain last-crawl timestamp tracker for incremental crawling.
 *
 * Stores timestamps in a single JSON file keyed by domain name.
 * Used to automatically set modifiedSince on repeat crawls.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const TIMESTAMPS_FILE = join(homedir(), '.cache', 'runwell-scraper', 'domain-timestamps.json');

type TimestampMap = Record<string, number>;

function ensureDir(): void {
  const dir = dirname(TIMESTAMPS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readTimestamps(): TimestampMap {
  if (!existsSync(TIMESTAMPS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(TIMESTAMPS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeTimestamps(map: TimestampMap): void {
  ensureDir();
  writeFileSync(TIMESTAMPS_FILE, JSON.stringify(map, null, 2), 'utf-8');
}

/**
 * Extract the domain from a URL string.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Get the last-crawl Unix timestamp (seconds) for a domain.
 * Returns undefined if no previous crawl is recorded.
 */
export function getDomainTimestamp(url: string): number | undefined {
  const domain = extractDomain(url);
  const map = readTimestamps();
  return map[domain];
}

/**
 * Update the last-crawl timestamp for a domain to the current time.
 */
export function setDomainTimestamp(url: string): void {
  const domain = extractDomain(url);
  const map = readTimestamps();
  map[domain] = Math.floor(Date.now() / 1000);
  writeTimestamps(map);
}
