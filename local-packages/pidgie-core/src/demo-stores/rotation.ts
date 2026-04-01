import {
  EMBEDDABLE_STORES,
  SCREENSHOT_STORES,
  type ExampleStore,
} from "./stores.js";

const ROTATION_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const EMBEDDABLE_COUNT = 3;
const SCREENSHOT_COUNT = 2;

/**
 * Get the current time bucket index for rotation.
 * Changes every 2 hours.
 */
function getTimeBucket(): number {
  return Math.floor(Date.now() / ROTATION_INTERVAL_MS);
}

/**
 * Pick `count` items from an array starting at a rotating offset.
 */
function rotatingPick<T>(items: T[], count: number, seed: number): T[] {
  if (items.length <= count) return [...items];
  const offset = seed % items.length;
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(items[(offset + i) % items.length]);
  }
  return result;
}

/**
 * Get the current set of 5 example stores (3 embeddable + 2 screenshot).
 * The selection rotates every 2 hours.
 */
export function getExampleStores(): ExampleStore[] {
  const bucket = getTimeBucket();
  const embeddable = rotatingPick(EMBEDDABLE_STORES, EMBEDDABLE_COUNT, bucket);
  const screenshot = rotatingPick(SCREENSHOT_STORES, SCREENSHOT_COUNT, bucket);
  return [...embeddable, ...screenshot];
}

/**
 * Get just the domains for display (e.g. ["glossier.com", "allbirds.com"]).
 */
export function getExampleDomains(): string[] {
  return getExampleStores().map((s) => s.domain);
}
