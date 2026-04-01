/**
 * Exponential backoff polling for Cloudflare /crawl jobs.
 *
 * Intervals: 2s, 4s, 8s, 16s, 30s (capped).
 * Respects Retry-After header on 429 responses.
 * Cancels the job on timeout.
 */

import { cancelJob, getResults } from './client.js';
import type { CrawlRecord, CrawlJobStatus } from './types.js';

const INITIAL_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 30000;
const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Terminal statuses that mean the job is done (success or failure). */
const TERMINAL_STATUSES: CrawlJobStatus[] = [
  'completed',
  'cancelled_due_to_timeout',
  'cancelled_due_to_limits',
  'cancelled_by_user',
  'errored',
];

export interface PollResult {
  status: CrawlJobStatus;
  records: CrawlRecord[];
  totalPages: number;
  browserSecondsUsed: number;
}

/**
 * Poll a crawl job until terminal status or timeout.
 *
 * On completion, paginates through all result pages.
 * On timeout, cancels the job and throws.
 */
export async function pollUntilDone(
  jobId: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<PollResult> {
  const startTime = Date.now();
  let interval = INITIAL_INTERVAL_MS;

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      console.log(`[cloudflare-crawl] Timeout after ${Math.round(elapsed / 1000)}s. Cancelling job ${jobId}.`);
      await cancelJob(jobId);
      throw new Error(`Crawl job ${jobId} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }

    let result;
    try {
      result = await getResults(jobId);
    } catch (err: any) {
      if (err.retryAfter) {
        const waitMs = err.retryAfter * 1000;
        console.log(`[cloudflare-crawl] Rate limited. Waiting ${err.retryAfter}s before retry.`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    const { status, total, finished, records, browserSecondsUsed, cursor } = result.result;
    console.log(`[cloudflare-crawl] Job ${jobId}: status=${status}, finished=${finished}/${total}, records=${records.length}`);

    if (TERMINAL_STATUSES.includes(status)) {
      // Paginate to collect all records
      const allRecords: CrawlRecord[] = [...records];
      let nextCursor = cursor;

      while (nextCursor !== undefined) {
        console.log(`[cloudflare-crawl] Paginating results (cursor: ${nextCursor})`);
        const page = await getResults(jobId, nextCursor);
        allRecords.push(...page.result.records);
        nextCursor = page.result.cursor;
      }

      return {
        status,
        records: allRecords,
        totalPages: total,
        browserSecondsUsed: browserSecondsUsed ?? 0,
      };
    }

    // Still running; wait with exponential backoff
    await sleep(interval);
    interval = Math.min(interval * 2, MAX_INTERVAL_MS);
  }
}
