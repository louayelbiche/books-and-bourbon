/**
 * Business Info Tool
 *
 * Returns basic public business information.
 * SECURITY: Only returns data that is safe for public consumption.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext } from '../types/index.js';

export const businessInfoTool: AgentTool = {
  name: 'get_business_info',
  description: 'Get basic information about the business including name, description, address, and contact details',
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
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    const includeAddress = args.include_address !== false;
    const includeContact = args.include_contact !== false;

    // Build response with ONLY public data
    const info: Record<string, unknown> = {
      name: business.name,
      description: business.description,
      category: business.category,
    };

    if (includeAddress && business.address) {
      info.address = {
        formatted: business.address.formatted || formatAddress(business.address),
      };
    }

    if (includeContact) {
      info.contact = {
        phone: business.contact.phone,
        email: business.contact.email,
        website: business.contact.website,
      };

      // Include social media if available
      if (business.contact.socialMedia) {
        info.socialMedia = Object.fromEntries(
          Object.entries(business.contact.socialMedia).filter(([, v]) => v)
        );
      }
    }

    return info;
  },
};

/**
 * Format address into a single string
 */
function formatAddress(address: {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
}
