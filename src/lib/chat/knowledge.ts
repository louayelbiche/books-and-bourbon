/**
 * Cached CMS knowledge provider (Approach C).
 *
 * Fetches content from BIB CMS, caches it in memory, and serves it
 * instantly for subsequent sessions. When CMS content changes, the
 * webhook at /api/cms/push calls invalidateKnowledge() so the next
 * session gets fresh data.
 *
 * For non-CMS client deployments, replace this file with one that
 * reads from the client's content source (files, DB, etc.).
 * The interface is the same: getKnowledge() returns a string.
 */

import { fetchEvents, fetchBooks, fetchFAQs } from '@/lib/cms';
import type { CMSEvent, CMSBook, CMSFAQ } from '@/lib/cms';
import { saveSnapshot, loadSnapshot } from '@runwell/cms-snapshot';
import { createLogger, logError } from '@runwell/logger';

const logger = createLogger('knowledge');

// ── Cache ──────────────────────────────────────────────────────────

let cachedKnowledge: { text: string; fetchedAt: number } | null = null;
let inflightFetch: Promise<string> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (safety net; webhook handles real-time)

/**
 * Returns cached knowledge or fetches fresh from CMS.
 * ~0ms on cache hit, 200-500ms on cache miss.
 * Deduplicates concurrent fetches on cold cache.
 */
export async function getKnowledge(): Promise<string> {
  if (cachedKnowledge && Date.now() - cachedKnowledge.fetchedAt < CACHE_TTL_MS) {
    return cachedKnowledge.text;
  }

  // Dedup: if a fetch is already in flight, return the same promise
  if (inflightFetch) return inflightFetch;

  inflightFetch = fetchAndCache();
  try {
    return await inflightFetch;
  } finally {
    inflightFetch = null;
  }
}

async function fetchAndCache(): Promise<string> {
  try {
    const text = await buildKnowledgeFromCMS();
    // Don't cache empty/fallback results — CMS might be temporarily down
    if (text !== CMS_EMPTY_FALLBACK) {
      cachedKnowledge = { text, fetchedAt: Date.now() };
      saveSnapshot('knowledge', text);
    }
    return text;
  } catch (error) {
    logger.error('CMS fetch failed', logError(error));
    // Return stale cache if available, then filesystem snapshot, then fallback
    if (cachedKnowledge) return cachedKnowledge.text;
    return loadSnapshot<string>('knowledge') ?? CMS_EMPTY_FALLBACK;
  }
}

/**
 * Clears the knowledge cache. Called by the CMS webhook
 * when content changes so the next session gets fresh data.
 */
export function invalidateKnowledge(): void {
  cachedKnowledge = null;
  logger.info('Cache invalidated');
}

// ── CMS → Knowledge String ────────────────────────────────────────

const CMS_EMPTY_FALLBACK = 'No content is currently available from the CMS.';

async function buildKnowledgeFromCMS(): Promise<string> {
  const [events, books, faqs] = await Promise.all([
    fetchEvents(),
    fetchBooks(),
    fetchFAQs(),
  ]);

  const sections: string[] = [];

  // Events
  const upcoming = events.filter((e) => e.status === 'scheduled');
  const recorded = events.filter((e) => e.status === 'recorded');

  if (upcoming.length > 0) {
    sections.push(formatUpcomingEvents(upcoming));
  }
  if (recorded.length > 0) {
    sections.push(formatRecordedEvents(recorded));
  }

  // Books
  if (books.length > 0) {
    sections.push(formatBooks(books));
  }

  // FAQs
  if (faqs.length > 0) {
    sections.push(formatFAQs(faqs));
  }

  if (sections.length === 0) {
    return CMS_EMPTY_FALLBACK;
  }

  return sections.join('\n\n');
}

function formatUpcomingEvents(events: CMSEvent[]): string {
  const items = events.map((e) => {
    const parts = [`- "${e.title}"`];
    if (e.eventDate) parts.push(`on ${new Date(e.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    if (e.startTime) parts.push(`at ${e.startTime}`);
    if (e.authorName) parts.push(`featuring ${e.authorName}`);
    if (e.bookTitle) parts.push(`discussing "${e.bookTitle}"`);
    if (e.location) parts.push(`| Location: ${e.location}`);
    if (e.description) parts.push(`\n  ${e.description}`);
    return parts.join(' ');
  });

  return `## Upcoming Events\n${items.join('\n')}`;
}

function formatRecordedEvents(events: CMSEvent[]): string {
  const items = events.slice(0, 10).map((e) => {
    const parts = [`- "${e.title}"`];
    if (e.authorName) parts.push(`with ${e.authorName}`);
    if (e.bookTitle) parts.push(`on "${e.bookTitle}"`);
    if (e.videoUrl) parts.push('(recording available)');
    return parts.join(' ');
  });

  return `## Past Events (Recordings Available)\n${items.join('\n')}`;
}

function formatBooks(books: CMSBook[]): string {
  const featured = books.filter((b) => b.isFeatured);
  const others = books.filter((b) => !b.isFeatured);

  const items: string[] = [];

  if (featured.length > 0) {
    items.push('### Featured Books');
    for (const b of featured) {
      const parts = [`- "${b.title}"`];
      if (b.author) parts.push(`by ${b.author}`);
      if (b.genre) parts.push(`(${b.genre})`);
      if (b.description) parts.push(`\n  ${b.description}`);
      items.push(parts.join(' '));
    }
  }

  if (others.length > 0) {
    items.push('### All Books');
    for (const b of others) {
      const parts = [`- "${b.title}"`];
      if (b.author) parts.push(`by ${b.author}`);
      if (b.genre) parts.push(`(${b.genre})`);
      items.push(parts.join(' '));
    }
  }

  return `## Book Catalog\n${items.join('\n')}`;
}

function formatFAQs(faqs: CMSFAQ[]): string {
  const items = faqs
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`);

  return `## Frequently Asked Questions\n${items.join('\n\n')}`;
}
