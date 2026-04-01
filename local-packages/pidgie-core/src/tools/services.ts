/**
 * Services Tool
 *
 * Returns information about services offered by the business.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext, Service } from '../types/index.js';

export const servicesTool: AgentTool = {
  name: 'get_services',
  description: 'Get information about services offered by the business. Can list all services, search by name, or filter by category.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term to find services by name or description',
      },
      category: {
        type: 'string',
        description: 'Filter services by category',
      },
      available_only: {
        type: 'boolean',
        description: 'Only return currently available services',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of services to return (default: 10)',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    let services = [...business.services];

    // Filter by availability
    if (args.available_only) {
      services = services.filter((s) => s.available);
    }

    // Filter by category
    if (args.category) {
      const category = (args.category as string).toLowerCase();
      services = services.filter(
        (s) => s.category?.toLowerCase() === category
      );
    }

    // Search by name/description
    if (args.search) {
      const searchTerm = (args.search as string).toLowerCase();
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm) ||
          s.description.toLowerCase().includes(searchTerm)
      );
    }

    // Apply limit
    const limit = (args.limit as number) || 10;
    services = services.slice(0, limit);

    // Format for response
    const formattedServices = services.map(formatService);

    // Get unique categories for filtering suggestions
    const categories = [...new Set(business.services.map((s) => s.category).filter(Boolean))];

    return {
      services: formattedServices,
      totalCount: services.length,
      categories: categories.length > 0 ? categories : undefined,
      hasMore: business.services.length > limit,
    };
  },
};

/**
 * Format a service for display
 */
function formatService(service: Service): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    name: service.name,
    description: service.description,
    available: service.available,
  };

  if (service.price) {
    formatted.price = formatPrice(service.price);
  }

  if (service.duration) {
    formatted.duration = formatDuration(service.duration);
  }

  if (service.category) {
    formatted.category = service.category;
  }

  return formatted;
}

/**
 * Format price for display
 */
function formatPrice(price: { amount: number; currency: string; unit?: string }): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
  }).format(price.amount);

  return price.unit ? `${formatted} ${price.unit}` : formatted;
}

/**
 * Format duration for display
 */
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
