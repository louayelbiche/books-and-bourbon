/**
 * Card Retrieval Tools
 *
 * Tools that let the agent show visual cards for products, services, and events.
 * Each tool validates the record ID, queries business data, and returns a
 * DB-validated card. The LLM decides WHEN/WHICH card — the DB decides WHAT it contains.
 *
 * SECURITY: Only exposes public data. No cost, margin, or internal fields.
 */

import type { AgentTool } from '@runwell/agent-core';
import { buildCardFromDB, type CardQueryFn, type CardValidationLogger } from '@runwell/card-system/validation';
import type { PidgieContext } from '../types/index.js';

/**
 * Extract a CardValidationLogger from the agent context metadata, if provided.
 * Consuming apps (e.g. BIB web) can inject a logger via agentContext.metadata.cardLogger.
 */
function getLogger(ctx: PidgieContext): CardValidationLogger | undefined {
  return (ctx as unknown as { metadata?: { cardLogger?: CardValidationLogger } }).metadata?.cardLogger;
}

/**
 * Creates a CardQueryFn that looks up records from in-memory business data.
 */
function createBusinessQueryFn(ctx: PidgieContext): CardQueryFn {
  return async (type, recordId) => {
    switch (type) {
      case 'product':
        return ctx.business.products?.find((p) => p.id === recordId) ?? null;
      case 'service':
        return ctx.business.services.find((s) => s.id === recordId) ?? null;
      case 'event': {
        // Events may come from booking resources or metadata
        const resource = ctx.business.booking?.resources?.find((r) => r.id === recordId);
        if (resource) return resource;
        // Check metadata for events
        const events = ctx.business.metadata?.events as any[] | undefined;
        return events?.find((e) => e.id === recordId) ?? null;
      }
      default:
        return null;
    }
  };
}

/**
 * Show a product card in the chat
 */
export const showProductCardTool: AgentTool = {
  name: 'show_product_card',
  description:
    'Display a visual product card in the chat. Use this when the user asks about a specific product and you want to show it with image, price, and availability.',
  parameters: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to display as a card',
      },
    },
    required: ['product_id'],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const productId = args.product_id as string;
    const queryFn = createBusinessQueryFn(ctx);

    const result = await buildCardFromDB(
      'product',
      productId,
      ctx.business.id,
      queryFn,
      getLogger(ctx),
    );

    if (!result.success) {
      return {
        error: true,
        reason: result.reason,
        message: 'Could not display product card. The product may not be available.',
      };
    }

    return {
      card: result.card,
      displayed: true,
    };
  },
};

/**
 * Show a service card in the chat
 */
export const showServiceCardTool: AgentTool = {
  name: 'show_service_card',
  description:
    'Display a visual service card in the chat. Use this when the user asks about a specific service and you want to show it with pricing and duration.',
  parameters: {
    type: 'object',
    properties: {
      service_id: {
        type: 'string',
        description: 'The service ID to display as a card',
      },
    },
    required: ['service_id'],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const serviceId = args.service_id as string;
    const queryFn = createBusinessQueryFn(ctx);

    const result = await buildCardFromDB(
      'service',
      serviceId,
      ctx.business.id,
      queryFn,
      getLogger(ctx),
    );

    if (!result.success) {
      return {
        error: true,
        reason: result.reason,
        message: 'Could not display service card. The service may not be available.',
      };
    }

    return {
      card: result.card,
      displayed: true,
    };
  },
};

/**
 * Show an event card in the chat
 */
export const showEventCardTool: AgentTool = {
  name: 'show_event_card',
  description:
    'Display a visual event card in the chat. Use this when the user asks about a specific event and you want to show it with date, time, and details.',
  parameters: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'The event ID to display as a card',
      },
    },
    required: ['event_id'],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const eventId = args.event_id as string;
    const queryFn = createBusinessQueryFn(ctx);

    const result = await buildCardFromDB(
      'event',
      eventId,
      ctx.business.id,
      queryFn,
      getLogger(ctx),
    );

    if (!result.success) {
      return {
        error: true,
        reason: result.reason,
        message: 'Could not display event card. The event may not be available.',
      };
    }

    return {
      card: result.card,
      displayed: true,
    };
  },
};
