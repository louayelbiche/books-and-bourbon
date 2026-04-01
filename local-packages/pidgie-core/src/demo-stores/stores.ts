/**
 * Curated pool of example stores for demo pages.
 *
 * Each store is tagged with its preview support:
 * - `iframe`: site allows embedding (no X-Frame-Options)
 * - `screenshot`: site blocks iframes (X-Frame-Options: DENY/SAMEORIGIN)
 *
 * Last verified: 2026-02-07
 */

export type PreviewSupport = "iframe" | "screenshot";

export interface ExampleStore {
  /** Display domain (e.g. "glossier.com") */
  domain: string;
  /** Full URL for scraping */
  url: string;
  /** Whether the site supports iframe embedding */
  preview: PreviewSupport;
  /** Short label for the store */
  label: string;
}

/** Stores that allow iframe embedding (no X-Frame-Options) */
export const EMBEDDABLE_STORES: ExampleStore[] = [
  { domain: "glossier.com", url: "https://www.glossier.com", preview: "iframe", label: "Glossier" },
  { domain: "ridgewallet.com", url: "https://www.ridgewallet.com", preview: "iframe", label: "Ridge Wallet" },
  { domain: "mejuri.com", url: "https://www.mejuri.com", preview: "iframe", label: "Mejuri" },
  { domain: "olipop.com", url: "https://www.olipop.com", preview: "iframe", label: "Olipop" },
  { domain: "deathwishcoffee.com", url: "https://www.deathwishcoffee.com", preview: "iframe", label: "Death Wish Coffee" },
  { domain: "ruggable.com", url: "https://www.ruggable.com", preview: "iframe", label: "Ruggable" },
  { domain: "skims.com", url: "https://www.skims.com", preview: "iframe", label: "SKIMS" },
];

/** Stores that block iframes (X-Frame-Options: DENY) */
export const SCREENSHOT_STORES: ExampleStore[] = [
  { domain: "allbirds.com", url: "https://www.allbirds.com", preview: "screenshot", label: "Allbirds" },
  { domain: "gymshark.com", url: "https://www.gymshark.com", preview: "screenshot", label: "Gymshark" },
  { domain: "bombas.com", url: "https://www.bombas.com", preview: "screenshot", label: "Bombas" },
  { domain: "brooklinen.com", url: "https://www.brooklinen.com", preview: "screenshot", label: "Brooklinen" },
  { domain: "kyliecosmetics.com", url: "https://www.kyliecosmetics.com", preview: "screenshot", label: "Kylie Cosmetics" },
  { domain: "drsquatch.com", url: "https://www.drsquatch.com", preview: "screenshot", label: "Dr. Squatch" },
];
