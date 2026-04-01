/**
 * Cost tracking logger for Cloudflare /crawl browser rendering usage.
 *
 * Appends one JSONL line per rendered crawl (browserSecondsUsed > 0).
 * Provides a monthly summary of total browser seconds consumed.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const COST_FILE = join(homedir(), '.cache', 'runwell-scraper', 'crawl-costs.jsonl');

export interface CostEntry {
  timestamp: string;
  url: string;
  jobId: string;
  browserSeconds: number;
  render: boolean;
  pages: number;
}

export interface CostSummary {
  month: string;
  totalBrowserSeconds: number;
  crawlCount: number;
}

/**
 * Log a crawl cost entry. Only logs if browserSeconds > 0 (rendered crawls).
 */
export function logCost(entry: {
  url: string;
  jobId: string;
  browserSeconds: number;
  render: boolean;
  pages: number;
}): void {
  if (entry.browserSeconds <= 0) return;

  const dir = dirname(COST_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const line: CostEntry = {
    timestamp: new Date().toISOString(),
    url: entry.url,
    jobId: entry.jobId,
    browserSeconds: entry.browserSeconds,
    render: entry.render,
    pages: entry.pages,
  };

  appendFileSync(COST_FILE, JSON.stringify(line) + '\n', 'utf-8');
}

/**
 * Read the JSONL cost log and return a summary for the current month.
 */
export function getCostSummary(): CostSummary {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = now.getMonth(); // 0-indexed
  const monthLabel = `${year}-${String(monthNum + 1).padStart(2, '0')}`;

  let totalBrowserSeconds = 0;
  let crawlCount = 0;

  if (!existsSync(COST_FILE)) {
    return { month: monthLabel, totalBrowserSeconds: 0, crawlCount: 0 };
  }

  const content = readFileSync(COST_FILE, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const entry: CostEntry = JSON.parse(line);
      const entryDate = new Date(entry.timestamp);
      if (entryDate.getFullYear() === year && entryDate.getMonth() === monthNum) {
        totalBrowserSeconds += entry.browserSeconds;
        crawlCount++;
      }
    } catch {
      // Skip malformed lines
    }
  }

  return { month: monthLabel, totalBrowserSeconds, crawlCount };
}
