/**
 * Product Catalog Tools
 *
 * Tools for searching and viewing product information.
 * SECURITY: Only exposes public pricing - NEVER cost, margin, or supplier data.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext, Product, ProductImage } from '../types/index.js';

/**
 * Search products tool
 */
export const searchProductsTool: AgentTool = {
  name: 'search_products',
  description: 'Search products in the catalog by name, category, or tags. Returns product listings with prices.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find products by name or description',
      },
      category: {
        type: 'string',
        description: 'Filter by product category',
      },
      subcategory: {
        type: 'string',
        description: 'Filter by product subcategory',
      },
      tags: {
        type: 'array',
        items: { type: 'string', description: 'Tag value' },
        description: 'Filter by tags (e.g., ["vegan", "gluten-free"])',
      },
      available_only: {
        type: 'boolean',
        description: 'Only show available products (default: true)',
      },
      featured_only: {
        type: 'boolean',
        description: 'Only show featured products',
      },
      min_price: {
        type: 'number',
        description: 'Minimum price filter',
      },
      max_price: {
        type: 'number',
        description: 'Maximum price filter',
      },
      sort_by: {
        type: 'string',
        description: 'Sort by field (name, price_low, price_high, featured)',
        enum: ['name', 'price_low', 'price_high', 'featured'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of products to return (default: 10)',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    if (!business.products || business.products.length === 0) {
      return {
        products: [],
        totalCount: 0,
        message: 'No products available in the catalog.',
      };
    }

    let products = [...business.products];

    // Filter by availability (default: true)
    const availableOnly = args.available_only !== false;
    if (availableOnly) {
      products = products.filter((p) => p.available);
    }

    // Filter by featured
    if (args.featured_only) {
      products = products.filter((p) => p.featured);
    }

    // Filter by category
    if (args.category) {
      const category = (args.category as string).toLowerCase();
      products = products.filter(
        (p) => p.category?.toLowerCase() === category
      );
    }

    // Filter by subcategory
    if (args.subcategory) {
      const subcategory = (args.subcategory as string).toLowerCase();
      products = products.filter(
        (p) => p.subcategory?.toLowerCase() === subcategory
      );
    }

    // Filter by tags
    if (args.tags && Array.isArray(args.tags)) {
      const searchTags = (args.tags as string[]).map((t) => t.toLowerCase());
      products = products.filter((p) =>
        p.tags?.some((tag) => searchTags.includes(tag.toLowerCase()))
      );
    }

    // Filter by price range
    if (args.min_price !== undefined) {
      products = products.filter((p) => p.price.amount >= (args.min_price as number));
    }
    if (args.max_price !== undefined) {
      products = products.filter((p) => p.price.amount <= (args.max_price as number));
    }

    // Search by query
    if (args.query) {
      const query = (args.query as string).toLowerCase();
      products = products
        .map((product) => ({
          product,
          score: calculateProductRelevance(product, query),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.product);
    }

    // Sort
    const sortBy = args.sort_by as string;
    if (sortBy === 'name') {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price_low') {
      products.sort((a, b) => a.price.amount - b.price.amount);
    } else if (sortBy === 'price_high') {
      products.sort((a, b) => b.price.amount - a.price.amount);
    } else if (sortBy === 'featured') {
      products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (!sortBy) {
      // Default: available products first, then by relevance (already sorted above)
      products.sort((a, b) => {
        const aAvail = a.available ? 1 : 0;
        const bAvail = b.available ? 1 : 0;
        return bAvail - aAvail;
      });
    }

    // Apply limit
    const limit = (args.limit as number) || 10;
    const totalBeforeLimit = products.length;
    products = products.slice(0, limit);

    // Format for response - ONLY PUBLIC DATA
    const formattedProducts = products.map(formatProductForPublic);

    // Get unique categories for suggestions
    const categories = [
      ...new Set(business.products.map((p) => p.category).filter(Boolean)),
    ];

    return {
      products: formattedProducts,
      totalCount: products.length,
      totalMatching: totalBeforeLimit,
      hasMore: totalBeforeLimit > limit,
      categories: categories.length > 0 ? categories : undefined,
    };
  },
};

/**
 * Get product details tool
 */
export const getProductDetailsTool: AgentTool = {
  name: 'get_product_details',
  description: 'Get detailed information about a specific product including description, variants, and images.',
  parameters: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to look up',
      },
      product_name: {
        type: 'string',
        description: 'The product name to search for (if ID not known)',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    if (!business.products || business.products.length === 0) {
      return {
        found: false,
        message: 'No products available in the catalog.',
      };
    }

    let product: Product | undefined;

    // Find by ID first
    if (args.product_id) {
      product = business.products.find((p) => p.id === args.product_id);
    }

    // Fall back to name search
    if (!product && args.product_name) {
      const searchName = (args.product_name as string).toLowerCase();
      product = business.products.find(
        (p) => p.name.toLowerCase() === searchName
      );

      // Partial match if exact not found
      if (!product) {
        product = business.products.find((p) =>
          p.name.toLowerCase().includes(searchName)
        );
      }
    }

    if (!product) {
      return {
        found: false,
        message: 'Product not found. Try searching with different terms.',
      };
    }

    // Return detailed PUBLIC info only
    return {
      found: true,
      product: formatProductDetailedForPublic(product),
    };
  },
};

/**
 * Get promotions tool
 */
export const getPromotionsTool: AgentTool = {
  name: 'get_promotions',
  description: 'Get current promotions, discounts, and special offers.',
  parameters: {
    type: 'object',
    properties: {
      active_only: {
        type: 'boolean',
        description: 'Only show currently active promotions (default: true)',
      },
      category: {
        type: 'string',
        description: 'Filter promotions by applicable category',
      },
      product_id: {
        type: 'string',
        description: 'Get promotions applicable to a specific product',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business, timestamp } = ctx;

    if (!business.promotions || business.promotions.length === 0) {
      return {
        promotions: [],
        message: 'No promotions currently available.',
      };
    }

    let promotions = [...business.promotions];
    const now = timestamp;

    // Filter active only (default: true)
    const activeOnly = args.active_only !== false;
    if (activeOnly) {
      promotions = promotions.filter((p) => {
        if (!p.active) return false;
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return now >= start && now <= end;
      });
    }

    // Filter by category
    if (args.category) {
      const category = (args.category as string).toLowerCase();
      promotions = promotions.filter(
        (p) =>
          !p.applicableTo?.categories ||
          p.applicableTo.categories.some((c) => c.toLowerCase() === category)
      );
    }

    // Filter by product
    if (args.product_id) {
      promotions = promotions.filter(
        (p) =>
          !p.applicableTo?.products ||
          p.applicableTo.products.includes(args.product_id as string)
      );
    }

    // Format for response
    const formattedPromotions = promotions.map((promo) => ({
      name: promo.name,
      description: promo.description,
      type: promo.type,
      value: promo.value,
      code: promo.code,
      validUntil: promo.endDate,
      terms: promo.terms,
    }));

    return {
      promotions: formattedPromotions,
      totalCount: formattedPromotions.length,
    };
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate relevance score for product search
 */
function calculateProductRelevance(product: Product, query: string): number {
  let score = 0;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let matchedTermCount = 0;

  for (const term of terms) {
    let termMatched = false;

    // Name match (highest weight)
    if (product.name.toLowerCase().includes(term)) {
      score += 5;
      termMatched = true;
    }

    // Description match
    if (product.description.toLowerCase().includes(term)) {
      score += 2;
      termMatched = true;
    }

    // Category match
    if (product.category?.toLowerCase().includes(term)) {
      score += 3;
      termMatched = true;
    }

    // Tag match
    if (product.tags?.some((tag) => tag.toLowerCase().includes(term))) {
      score += 2;
      termMatched = true;
    }

    // Attribute match
    if (product.attributes) {
      for (const value of Object.values(product.attributes)) {
        if (value.toLowerCase().includes(term)) {
          score += 1;
          termMatched = true;
        }
      }
    }

    if (termMatched) matchedTermCount++;
  }

  // Bonus multiplier for products matching ALL terms
  if (terms.length > 1 && matchedTermCount === terms.length) {
    score = Math.ceil(score * 1.5);
  }

  return score;
}

/**
 * Format product for public display (listing)
 * SECURITY: Never include cost, margin, or internal data
 */
function formatProductForPublic(product: Product): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: product.id,
    name: product.name,
    description: truncateDescription(product.description, 150),
    price: formatPrice(product.price),
    available: product.available,
  };

  if (product.price.compareAt && product.price.compareAt > product.price.amount) {
    formatted.originalPrice = formatPrice({
      amount: product.price.compareAt,
      currency: product.price.currency,
    });
    formatted.discount = calculateDiscountPercent(
      product.price.compareAt,
      product.price.amount
    );
  }

  if (product.category) {
    formatted.category = product.category;
  }

  if (product.stockStatus) {
    formatted.stockStatus = product.stockStatus;
  }

  if (product.featured) {
    formatted.featured = true;
  }

  // Include primary image only
  const primaryImage = product.images?.find((img) => img.primary) || product.images?.[0];
  if (primaryImage) {
    formatted.image = {
      url: primaryImage.url,
      alt: primaryImage.alt || product.name,
    };
  }

  return formatted;
}

/**
 * Format product for detailed view
 * SECURITY: Never include cost, margin, or internal data
 */
function formatProductDetailedForPublic(product: Product): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: formatPrice(product.price),
    available: product.available,
    stockStatus: product.stockStatus || 'in_stock',
  };

  if (product.price.compareAt && product.price.compareAt > product.price.amount) {
    formatted.originalPrice = formatPrice({
      amount: product.price.compareAt,
      currency: product.price.currency,
    });
    formatted.savings = formatPrice({
      amount: product.price.compareAt - product.price.amount,
      currency: product.price.currency,
    });
    formatted.discountPercent = calculateDiscountPercent(
      product.price.compareAt,
      product.price.amount
    );
  }

  if (product.category) {
    formatted.category = product.category;
  }

  if (product.subcategory) {
    formatted.subcategory = product.subcategory;
  }

  if (product.tags && product.tags.length > 0) {
    formatted.tags = product.tags;
  }

  if (product.attributes && Object.keys(product.attributes).length > 0) {
    formatted.attributes = product.attributes;
  }

  // Include all images
  if (product.images && product.images.length > 0) {
    formatted.images = product.images.map((img) => ({
      url: img.url,
      alt: img.alt || product.name,
    }));
  }

  // Include variants
  if (product.variants && product.variants.length > 0) {
    formatted.variants = product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price ? formatPrice(v.price) : undefined,
      available: v.available,
      attributes: v.attributes,
    }));
  }

  return formatted;
}

/**
 * Format price for display
 */
function formatPrice(price: { amount: number; currency: string }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
  }).format(price.amount);
}

/**
 * Calculate discount percentage
 */
function calculateDiscountPercent(original: number, current: number): string {
  const percent = Math.round(((original - current) / original) * 100);
  return `${percent}% off`;
}

/**
 * Truncate description for listings
 */
function truncateDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
