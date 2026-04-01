/**
 * DataSource Module
 *
 * Interface for dynamic data fetching, enabling large product catalogs
 * and real-time data access.
 *
 * @example
 * ```typescript
 * import { DataSource, createStaticDataSource } from '@runwell/pidgie-core/datasource';
 *
 * // For small/static data:
 * const staticSource = createStaticDataSource(businessData);
 *
 * // For Shopify (implement DataSource interface):
 * class ShopifyDataSource implements DataSource {
 *   async searchProducts(query, filters) {
 *     // Vector search against product embeddings
 *     return await vectorSearch(this.shopId, query, filters);
 *   }
 *   // ... other methods
 * }
 *
 * // Use with PidgieAgent:
 * const agent = new PidgieAgent({
 *   businessData: minimalInfo,
 *   dataSource: shopifyDataSource,
 * });
 * ```
 */

// Static implementation
export { createStaticDataSource } from './static.js';

// Types
export type {
  // Core interface
  DataSource,
  StaticDataSource,

  // Filters and results
  ProductFilters,
  SearchResult,
  InventoryLevel,

  // Cart and orders
  Cart,
  CartItem,
  OrderInfo,
} from './types.js';
