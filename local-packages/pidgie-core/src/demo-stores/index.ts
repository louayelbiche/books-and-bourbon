/**
 * Demo Stores Module
 *
 * Curated pool of example Shopify stores for demo pages.
 * Rotates every 2 hours, always showing 3 embeddable + 2 screenshot-only stores.
 *
 * @example
 * ```typescript
 * import { getExampleStores, getExampleDomains } from '@runwell/pidgie-core/demo-stores';
 *
 * const stores = getExampleStores(); // 5 stores, rotated
 * const domains = getExampleDomains(); // ["glossier.com", "allbirds.com", ...]
 * ```
 */

export { getExampleStores, getExampleDomains } from "./rotation.js";
export {
  EMBEDDABLE_STORES,
  SCREENSHOT_STORES,
  type ExampleStore,
  type PreviewSupport,
} from "./stores.js";
