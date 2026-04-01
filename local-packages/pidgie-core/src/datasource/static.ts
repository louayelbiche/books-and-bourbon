/**
 * Static Data Source
 *
 * Wraps static BusinessData for backward compatibility.
 * Used when all data is known at initialization time.
 */

import type {
  BusinessData,
  Product,
  FAQ,
  Promotion,
  Service,
} from '../types/index.js';
import type {
  DataSource,
  StaticDataSource,
  ProductFilters,
  SearchResult,
  InventoryLevel,
} from './types.js';

/**
 * Simple text matching for search
 */
function textMatch(text: string, query: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const words = normalizedQuery.split(/\s+/);

  let matches = 0;
  for (const word of words) {
    if (normalizedText.includes(word)) {
      matches++;
    }
  }

  return words.length > 0 ? matches / words.length : 0;
}

/**
 * Create a static data source from BusinessData
 */
export function createStaticDataSource(
  businessData: BusinessData
): StaticDataSource {
  return {
    businessData,

    async getBusinessInfo() {
      return {
        id: businessData.id,
        name: businessData.name,
        description: businessData.description,
        category: businessData.category,
        contact: businessData.contact,
      };
    },

    async searchProducts(
      query: string,
      filters?: ProductFilters
    ): Promise<SearchResult<Product>[]> {
      const products = businessData.products ?? [];

      // Filter products
      let filtered = products.filter((product) => {
        if (filters?.category && product.category !== filters.category) {
          return false;
        }
        if (filters?.subcategory && product.subcategory !== filters.subcategory) {
          return false;
        }
        if (filters?.minPrice && product.price.amount < filters.minPrice) {
          return false;
        }
        if (filters?.maxPrice && product.price.amount > filters.maxPrice) {
          return false;
        }
        if (filters?.inStock && !product.available) {
          return false;
        }
        if (filters?.featured && !product.featured) {
          return false;
        }
        if (filters?.tags?.length) {
          const productTags = product.tags ?? [];
          if (!filters.tags.some((tag) => productTags.includes(tag))) {
            return false;
          }
        }
        return true;
      });

      // Score by text match
      const scored: SearchResult<Product>[] = filtered
        .map((product) => {
          const searchText = [
            product.name,
            product.description,
            product.category ?? '',
            ...(product.tags ?? []),
          ].join(' ');

          return {
            item: product,
            score: textMatch(searchText, query),
            matches: [],
          };
        })
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score);

      // Apply limit/offset
      const offset = filters?.offset ?? 0;
      const limit = filters?.limit ?? 10;

      return scored.slice(offset, offset + limit);
    },

    async getProductDetails(productId: string): Promise<Product | null> {
      const products = businessData.products ?? [];
      return products.find((p) => p.id === productId) ?? null;
    },

    async getInventory(variantId: string): Promise<InventoryLevel | null> {
      // For static data, we use the stockStatus field
      const products = businessData.products ?? [];

      for (const product of products) {
        if (product.variants) {
          const variant = product.variants.find((v) => v.id === variantId);
          if (variant) {
            return {
              variantId,
              productId: product.id,
              available: variant.available ? 10 : 0, // Placeholder
              inStock: variant.available,
            };
          }
        }

        // Check if variantId matches product id (no variants)
        if (product.id === variantId) {
          const stockMap: Record<string, number> = {
            in_stock: 10,
            low_stock: 2,
            out_of_stock: 0,
          };

          return {
            variantId,
            productId: product.id,
            available: stockMap[product.stockStatus ?? 'in_stock'] ?? 0,
            inStock: product.available,
            isLastItem: product.stockStatus === 'low_stock',
          };
        }
      }

      return null;
    },

    async searchFAQs(query: string, limit = 5): Promise<SearchResult<FAQ>[]> {
      const faqs = businessData.faqs ?? [];

      const scored: SearchResult<FAQ>[] = faqs
        .map((faq) => {
          const searchText = [
            faq.question,
            faq.answer,
            ...(faq.keywords ?? []),
          ].join(' ');

          return {
            item: faq,
            score: textMatch(searchText, query),
            matches: [],
          };
        })
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored.slice(0, limit);
    },

    async getPromotions(): Promise<Promotion[]> {
      const now = new Date();
      const promotions = businessData.promotions ?? [];

      return promotions.filter((promo) => {
        if (!promo.active) return false;
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);
        return now >= start && now <= end;
      });
    },

    async getServices(): Promise<Service[]> {
      return businessData.services ?? [];
    },
  };
}
