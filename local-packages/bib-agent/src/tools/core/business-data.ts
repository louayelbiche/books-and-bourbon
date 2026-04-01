/**
 * Business Data Core Tools
 *
 * 5 core tools that read from DataContext (no DB queries):
 * - get_business_info
 * - get_business_hours
 * - get_services
 * - get_faqs
 * - get_products
 *
 * Extracted from:
 * - packages/pidgie-core/src/tools/business-info.ts
 * - packages/pidgie-core/src/tools/business-hours.ts
 * - packages/pidgie-core/src/tools/services.ts
 * - packages/pidgie-core/src/tools/faqs.ts
 * - packages/pidgie-core/src/tools/products.ts
 *
 * Key difference from originals: These read from DataContext (typed manifest
 * with explicit nulls) instead of the PidgieContext business object.
 */

import type { BibTool, BibToolContext } from '../types.js';
import type { FAQ, Product, Service, DayHours } from '../../context/types.js';

// =============================================================================
// get_business_info
// =============================================================================

export const getBusinessInfoTool: BibTool = {
  name: 'get_business_info',
  description:
    'Get basic information about the business including name, description, address, and contact details',
  parameters: {
    type: 'object',
    properties: {
      include_address: {
        type: 'boolean',
        description: 'Whether to include the physical address',
      },
      include_contact: {
        type: 'boolean',
        description: 'Whether to include contact information',
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    const includeAddress = args.include_address !== false;
    const includeContact = args.include_contact !== false;

    const info: Record<string, unknown> = {
      name: dataContext.business.name,
      description: dataContext.business.description,
      category: dataContext.business.category,
    };

    if (includeAddress && dataContext.contact.address) {
      const addr = dataContext.contact.address;
      info.address = {
        formatted: formatAddress(addr),
      };
    }

    if (includeContact) {
      info.contact = {
        phone: dataContext.contact.phone,
        email: dataContext.contact.email,
      };

      if (dataContext.contact.socialMedia) {
        info.socialMedia = Object.fromEntries(
          Object.entries(dataContext.contact.socialMedia).filter(([, v]) => v)
        );
      }
    }

    return info;
  },
};

function formatAddress(address: {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}): string {
  const parts = [
    address.street,
    address.city,
    address.state ? `${address.state} ${address.zip || ''}`.trim() : address.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

// =============================================================================
// get_business_hours
// =============================================================================

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const getBusinessHoursTool: BibTool = {
  name: 'get_business_hours',
  description:
    'Get the business operating hours. Returns the weekly schedule based on configured hours.',
  parameters: {
    type: 'object',
    properties: {
      day: {
        type: 'string',
        description:
          'Specific day to check (monday, tuesday, etc.). If not provided, returns full weekly schedule.',
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    const hours = dataContext.hours;

    if (!hours || hours.length === 0) {
      return {
        configured: false,
        message: 'Business hours have not been configured yet.',
      };
    }

    const result: Record<string, unknown> = {
      configured: true,
    };

    if (args.day) {
      const dayName = (args.day as string).toLowerCase();
      const dayIndex = DAY_NAMES.findIndex((d) => d.toLowerCase() === dayName);
      if (dayIndex === -1) {
        return { error: `Unknown day: ${args.day}` };
      }

      const dayHours = hours.filter((h) => h.dayOfWeek === dayIndex && h.isActive);
      result.day = args.day;
      result.hours =
        dayHours.length > 0
          ? dayHours.map((h) => formatDayHoursEntry(h))
          : 'Closed';
    } else {
      // Full weekly schedule
      const schedule: Record<string, string | Array<{ start: string; end: string }>> = {};
      for (let i = 0; i < 7; i++) {
        const dayHours = hours.filter((h) => h.dayOfWeek === i && h.isActive);
        const name = DAY_NAMES[i].toLowerCase();
        schedule[name] =
          dayHours.length > 0
            ? dayHours.map((h) => formatDayHoursEntry(h))
            : 'Closed';
      }
      result.weeklySchedule = schedule;
    }

    return result;
  },
};

function formatDayHoursEntry(h: DayHours): { start: string; end: string } {
  return {
    start: h.startTime,
    end: h.endTime,
  };
}

// =============================================================================
// get_services
// =============================================================================

export const getServicesTool: BibTool = {
  name: 'get_services',
  description:
    'Get information about services offered by the business. Can search by name or filter by category.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term to find services by name or description',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of services to return (default: 10)',
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    let services = [...dataContext.services];

    if (services.length === 0) {
      return {
        services: [],
        totalCount: 0,
        message: 'No services have been configured.',
      };
    }

    // Search by name/description
    if (args.search) {
      const searchTerm = (args.search as string).toLowerCase();
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm) ||
          (s.description && s.description.toLowerCase().includes(searchTerm))
      );
    }

    // Sort by sortOrder
    services.sort((a, b) => a.sortOrder - b.sortOrder);

    // Apply limit
    const limit = (args.limit as number) || 10;
    const totalBeforeLimit = services.length;
    services = services.slice(0, limit);

    // Format for response
    const formattedServices = services.map(formatService);

    return {
      services: formattedServices,
      totalCount: services.length,
      hasMore: totalBeforeLimit > limit,
    };
  },
};

function formatService(service: Service): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: service.id,
    name: service.name,
    description: service.description,
  };

  if (service.priceInCents > 0) {
    formatted.price = formatCentsToPrice(service.priceInCents);
  }

  if (service.durationMinutes > 0) {
    formatted.duration = formatDuration(service.durationMinutes);
  }

  return formatted;
}

function formatCentsToPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// =============================================================================
// get_faqs
// =============================================================================

export const getFaqsTool: BibTool = {
  name: 'get_faqs',
  description:
    'Get frequently asked questions and their answers. Can search by keyword or filter by category.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term to find relevant FAQs',
      },
      category: {
        type: 'string',
        description: 'Filter FAQs by category',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of FAQs to return (default: 5)',
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    let faqs = [...dataContext.faqs];

    if (faqs.length === 0) {
      return {
        faqs: [],
        totalCount: 0,
        message: 'No FAQs have been configured.',
      };
    }

    // Filter by category
    if (args.category) {
      const category = (args.category as string).toLowerCase();
      faqs = faqs.filter((f) => f.category?.toLowerCase() === category);
    }

    // Search by keywords
    if (args.search) {
      const searchTerm = (args.search as string).toLowerCase();
      faqs = faqs
        .map((faq) => ({
          faq,
          score: calculateFaqRelevance(faq, searchTerm),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.faq);
    } else {
      // Sort by sortOrder when no search
      faqs.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Apply limit
    const limit = (args.limit as number) || 5;
    faqs = faqs.slice(0, limit);

    // Format for response
    const formattedFaqs = faqs.map(formatFaq);

    // Get unique categories
    const categories = [...new Set(dataContext.faqs.map((f) => f.category).filter(Boolean))];

    return {
      faqs: formattedFaqs,
      totalCount: faqs.length,
      categories: categories.length > 0 ? categories : undefined,
    };
  },
};

function calculateFaqRelevance(faq: FAQ, searchTerm: string): number {
  let score = 0;
  const terms = searchTerm.toLowerCase().split(/\s+/);

  for (const term of terms) {
    if (faq.question.toLowerCase().includes(term)) {
      score += 3;
    }
    if (faq.answer.toLowerCase().includes(term)) {
      score += 1;
    }
  }

  return score;
}

function formatFaq(faq: FAQ): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
  };

  if (faq.category) {
    formatted.category = faq.category;
  }

  return formatted;
}

// =============================================================================
// get_products
// =============================================================================

export const getProductsTool: BibTool = {
  name: 'get_products',
  description:
    'Search and browse products in the catalog. Can filter by name, tags, featured status, and price range.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query to find products by name or description',
      },
      featured_only: {
        type: 'boolean',
        description: 'Only show featured products',
      },
      min_price: {
        type: 'number',
        description: 'Minimum price filter (in cents)',
      },
      max_price: {
        type: 'number',
        description: 'Maximum price filter (in cents)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of products to return (default: 10)',
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    let products = [...dataContext.products];

    if (products.length === 0) {
      return {
        products: [],
        totalCount: 0,
        message: 'No products available in the catalog.',
      };
    }

    // Filter by featured
    if (args.featured_only) {
      products = products.filter((p) => p.isFeatured);
    }

    // Filter by price range
    if (args.min_price !== undefined) {
      products = products.filter((p) => p.priceInCents >= (args.min_price as number));
    }
    if (args.max_price !== undefined) {
      products = products.filter((p) => p.priceInCents <= (args.max_price as number));
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

    // Apply limit
    const limit = (args.limit as number) || 10;
    const totalBeforeLimit = products.length;
    products = products.slice(0, limit);

    // Format for response (PUBLIC data only)
    const formattedProducts = products.map(formatProductPublic);

    // Get unique categories
    const categories = [
      ...new Set(dataContext.products.map((p) => p.categoryName).filter(Boolean)),
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

function calculateProductRelevance(product: Product, query: string): number {
  let score = 0;
  const terms = query.toLowerCase().split(/\s+/);

  for (const term of terms) {
    if (product.name.toLowerCase().includes(term)) {
      score += 5;
    }
    if (product.description?.toLowerCase().includes(term)) {
      score += 2;
    }
    if (product.categoryName?.toLowerCase().includes(term)) {
      score += 3;
    }
    if (product.tags?.some((tag) => tag.toLowerCase().includes(term))) {
      score += 2;
    }
  }

  return score;
}

function formatProductPublic(product: Product): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description
      ? truncateDescription(product.description, 150)
      : null,
    price: formatCentsToPrice(product.priceInCents),
    priceInCents: product.priceInCents,
  };

  if (product.comparePriceInCents && product.comparePriceInCents > product.priceInCents) {
    formatted.originalPrice = formatCentsToPrice(product.comparePriceInCents);
    formatted.discount = calculateDiscountPercent(
      product.comparePriceInCents,
      product.priceInCents
    );
  }

  if (product.categoryName) {
    formatted.category = product.categoryName;
  }

  if (product.isFeatured) {
    formatted.featured = true;
  }

  if (product.images && product.images.length > 0) {
    formatted.image = product.images[0];
  }

  return formatted;
}

function calculateDiscountPercent(original: number, current: number): string {
  const percent = Math.round(((original - current) / original) * 100);
  return `${percent}% off`;
}

function truncateDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// =============================================================================
// All business data tools
// =============================================================================

export const businessDataTools: BibTool[] = [
  getBusinessInfoTool,
  getBusinessHoursTool,
  getServicesTool,
  getFaqsTool,
  getProductsTool,
];
