/**
 * Low-level Cloudflare Browser Rendering /crawl API client.
 *
 * Auth via CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_BROWSER_RENDERING_TOKEN env vars.
 * Uses native fetch (Node 20+).
 */

import type { CrawlJobResponse, CrawlOptions, CrawlResult } from './types.js';

function getCredentials(): { accountId: string; token: string } {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_BROWSER_RENDERING_TOKEN;

  if (!accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID environment variable');
  }
  if (!token) {
    throw new Error('Missing CLOUDFLARE_BROWSER_RENDERING_TOKEN environment variable');
  }

  return { accountId, token };
}

function crawlUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/crawl`;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Build the API request body from CrawlOptions.
 * Maps our option names to the exact Cloudflare field names.
 */
function buildRequestBody(url: string, options: CrawlOptions = {}): Record<string, unknown> {
  const body: Record<string, unknown> = { url };

  body.limit = options.limit ?? 10;
  body.render = options.render ?? false;
  body.formats = options.formats ?? ['markdown'];
  body.rejectResourceTypes = options.rejectResourceTypes ?? ['image', 'font', 'media'];

  if (options.depth !== undefined) body.depth = options.depth;
  if (options.source) body.source = options.source;
  if (options.maxAge !== undefined) body.maxAge = options.maxAge;
  if (options.modifiedSince !== undefined) body.modifiedSince = options.modifiedSince;
  if (options.options) body.options = options.options;
  if (options.waitForSelector) body.waitForSelector = options.waitForSelector;
  if (options.userAgent) body.userAgent = options.userAgent;

  return body;
}

/**
 * Create a crawl job.
 *
 * @returns The job ID string
 */
export async function createJob(
  url: string,
  options: CrawlOptions = {},
): Promise<string> {
  const { accountId, token } = getCredentials();
  const body = buildRequestBody(url, options);

  console.log(`[cloudflare-crawl] Creating job for ${url} (limit: ${body.limit}, render: ${body.render})`);

  const response = await fetch(crawlUrl(accountId), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare /crawl POST failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as CrawlJobResponse;
  if (!data.success || !data.result) {
    throw new Error(`Cloudflare /crawl POST returned unexpected response: ${JSON.stringify(data)}`);
  }

  const jobId = data.result;
  console.log(`[cloudflare-crawl] Job created: ${jobId}`);
  return jobId;
}

/**
 * Get crawl results (with optional pagination cursor).
 */
export async function getResults(
  jobId: string,
  cursor?: number,
): Promise<CrawlResult> {
  const { accountId, token } = getCredentials();

  let endpoint = `${crawlUrl(accountId)}/${jobId}`;
  if (cursor !== undefined) {
    endpoint += `?cursor=${cursor}`;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    if (response.status === 429 && retryAfter) {
      const error = new Error(`Rate limited. Retry after ${retryAfter}s`);
      (error as any).retryAfter = parseInt(retryAfter, 10);
      throw error;
    }
    const text = await response.text();
    throw new Error(`Cloudflare /crawl GET failed (${response.status}): ${text}`);
  }

  return (await response.json()) as CrawlResult;
}

/**
 * Cancel a crawl job.
 */
export async function cancelJob(jobId: string): Promise<void> {
  const { accountId, token } = getCredentials();

  console.log(`[cloudflare-crawl] Cancelling job: ${jobId}`);

  const response = await fetch(`${crawlUrl(accountId)}/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`[cloudflare-crawl] Cancel failed (${response.status}): ${text}`);
  } else {
    console.log(`[cloudflare-crawl] Job cancelled: ${jobId}`);
  }
}
