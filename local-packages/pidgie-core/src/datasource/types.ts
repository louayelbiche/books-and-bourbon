/**
 * DataSource Types
 *
 * Interface for dynamic data fetching, enabling large catalogs
 * and real-time data that can't be loaded statically.
 */

import type {
  BusinessData,
  Product,
  Service,
  FAQ,
  Promotion,
  AvailabilitySlot,
} from '../types/index.js';

/**
 * Product search filters
 */
export interface ProductFilters {
  /** Category to filter by */
  category?: string;
  /** Subcategory to filter by */
  subcategory?: string;
  /** Minimum price */
  minPrice?: number;
  /** Maximum price */
  maxPrice?: number;
  /** Only in-stock items */
  inStock?: boolean;
  /** Only featured items */
  featured?: boolean;
  /** Filter by tags */
  tags?: string[];
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Inventory level for a product variant
 */
export interface InventoryLevel {
  /** Variant ID */
  variantId: string;
  /** Product ID */
  productId: string;
  /** Available quantity */
  available: number;
  /** Whether the item is in stock */
  inStock: boolean;
  /** Low stock threshold */
  lowStockThreshold?: number;
  /** Whether this is the last item */
  isLastItem?: boolean;
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult<T> {
  /** The result item */
  item: T;
  /** Relevance score (0-1) */
  score: number;
  /** Matched keywords/terms */
  matches?: string[];
}

/**
 * Order information for tracking
 */
export interface OrderInfo {
  /** Order ID/number */
  id: string;
  /** Order number (display) */
  orderNumber: string;
  /** Order status */
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  /** Status display text */
  statusText: string;
  /** Tracking number if shipped */
  trackingNumber?: string;
  /** Tracking URL if available */
  trackingUrl?: string;
  /** Estimated delivery date */
  estimatedDelivery?: Date;
  /** Line items summary */
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  /** Order total */
  total: number;
  /** Currency */
  currency: string;
}

/**
 * Cart item
 */
export interface CartItem {
  /** Variant ID */
  variantId: string;
  /** Product ID */
  productId: string;
  /** Product title */
  title: string;
  /** Variant title (e.g., "Size: M") */
  variantTitle?: string;
  /** Quantity */
  quantity: number;
  /** Unit price */
  price: number;
  /** Line total */
  lineTotal: number;
  /** Image URL */
  imageUrl?: string;
}

/**
 * Shopping cart
 */
export interface Cart {
  /** Cart ID */
  id: string;
  /** Cart items */
  items: CartItem[];
  /** Subtotal */
  subtotal: number;
  /** Currency */
  currency: string;
  /** Number of items */
  itemCount: number;
  /** Checkout URL */
  checkoutUrl?: string;
}

/**
 * DataSource interface for dynamic data fetching
 *
 * Implementations can fetch from:
 * - Shopify Admin/Storefront API
 * - Database with vector search
 * - Static data (for testing)
 * - Any other backend
 */
export interface DataSource {
  /**
   * Get basic business information
   * This is typically cached/static
   */
  getBusinessInfo(): Promise<Pick<BusinessData, 'id' | 'name' | 'description' | 'category' | 'contact'>>;

  /**
   * Search products by query and filters
   * For large catalogs, this uses vector similarity search
   */
  searchProducts(
    query: string,
    filters?: ProductFilters
  ): Promise<SearchResult<Product>[]>;

  /**
   * Get detailed product information
   */
  getProductDetails(productId: string): Promise<Product | null>;

  /**
   * Get inventory level for a variant
   */
  getInventory(variantId: string): Promise<InventoryLevel | null>;

  /**
   * Search FAQs and policies
   */
  searchFAQs(query: string, limit?: number): Promise<SearchResult<FAQ>[]>;

  /**
   * Get active promotions
   */
  getPromotions(): Promise<Promotion[]>;

  /**
   * Get services (if applicable)
   */
  getServices(): Promise<Service[]>;

  /**
   * Get order status by order number and email
   */
  getOrderStatus?(orderNumber: string, email?: string): Promise<OrderInfo | null>;

  /**
   * Get current cart for a session
   */
  getCart?(cartId: string): Promise<Cart | null>;

  /**
   * Add item to cart (write operation)
   */
  addToCart?(cartId: string, variantId: string, quantity: number): Promise<Cart>;

  /**
   * Check availability for booking (if applicable)
   */
  checkAvailability?(
    resourceId: string,
    date: Date,
    duration?: number
  ): Promise<AvailabilitySlot[]>;
}

/**
 * Static data source that wraps BusinessData
 * for backward compatibility
 */
export interface StaticDataSource extends DataSource {
  /** The underlying business data */
  readonly businessData: BusinessData;
}
