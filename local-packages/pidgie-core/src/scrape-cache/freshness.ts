import type { StoredWebsite } from "./db.js";
import { hashContent } from "./hash.js";
import { isBlockedUrl } from '@runwell/scraper';

export interface FreshnessResult {
  fresh: boolean;
  action: "none" | "update_metadata" | "rescrape";
  newETag?: string | null;
  newLastModified?: string | null;
  homepageHtml?: string;
}

/**
 * Check if a cached website is still fresh.
 *
 * Strategy:
 * 1. HEAD request with If-None-Match / If-Modified-Since
 * 2. If 304, content unchanged
 * 3. Otherwise, fetch full page and compare content hash
 * 4. If hash matches, just update metadata
 * 5. If hash differs, needs full rescrape
 */
export async function checkFreshness(
  url: string,
  stored: StoredWebsite
): Promise<FreshnessResult> {
  try {
    // Re-validate URL against SSRF blocklist (URL comes from DB, could be tampered)
    if (isBlockedUrl(url)) {
      return { fresh: false, action: "rescrape" };
    }

    // Step 1: HEAD request with conditional headers
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; RunwellBot/1.0)",
    };

    if (stored.etag) {
      headers["If-None-Match"] = stored.etag;
    }
    if (stored.last_modified) {
      headers["If-Modified-Since"] = stored.last_modified;
    }

    const headResponse = await fetch(url, {
      method: "HEAD",
      headers,
      redirect: "follow",
    });

    if (headResponse.status === 304) {
      return { fresh: true, action: "none" };
    }

    // Step 2: Fetch full page and compare hash
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RunwellBot/1.0)",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.warn(`[freshness] Failed to fetch ${url}: ${response.status}`);
      return { fresh: true, action: "none" };
    }

    const html = await response.text();
    const newHash = hashContent(html);

    const newETag = response.headers.get("etag");
    const newLastModified = response.headers.get("last-modified");

    if (stored.homepage_hash && newHash === stored.homepage_hash) {
      return {
        fresh: true,
        action: "update_metadata",
        newETag,
        newLastModified,
      };
    }

    return {
      fresh: false,
      action: "rescrape",
      newETag,
      newLastModified,
      homepageHtml: html,
    };
  } catch (error) {
    console.error("[freshness] Check failed:", error);
    return { fresh: true, action: "none" };
  }
}
