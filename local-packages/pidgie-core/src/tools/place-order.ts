/**
 * Place Order Tool (D-02)
 *
 * Chatbot tool that creates a ProductOrder with reservation model (DEC-02).
 * Stock is RESERVED (not decremented) until the business owner confirms.
 * Language uses "reserved" not "ordered" or "purchased".
 *
 * SECURITY: Never expose cost, margin, or supplier data.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext } from '../types/index.js';

export const placeOrderTool: AgentTool = {
  name: 'place_order',
  description:
    'Reserve products for a customer. Creates a pending order that the business owner will confirm. ' +
    'Stock is reserved but not sold until confirmed. Requires customer name and at least one product.',
  parameters: {
    type: 'object',
    properties: {
      customer_name: {
        type: 'string',
        description: 'Full name of the customer placing the reservation',
      },
      customer_email: {
        type: 'string',
        description: 'Customer email address (used to link to customer profile)',
      },
      customer_phone: {
        type: 'string',
        description: 'Customer phone number',
      },
      items: {
        type: 'array',
        description: 'Products to reserve. Each item needs a product_id and quantity.',
        items: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'The product ID to reserve',
            },
            variant_id: {
              type: 'string',
              description: 'Optional variant ID if the product has variants',
            },
            quantity: {
              type: 'number',
              description: 'Number of units to reserve (default: 1)',
            },
          },
          required: ['product_id'],
        },
      },
      notes: {
        type: 'string',
        description: 'Customer notes or special requests for the order',
      },
    },
    required: ['customer_name', 'items'],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;

    // Validate we have a prisma client and tenantId
    if (!ctx.prisma || !ctx.tenantId) {
      return {
        success: false,
        message: 'Order placement is not available at this time.',
      };
    }

    const customerName = args.customer_name as string;
    const customerEmail = args.customer_email as string | undefined;
    const customerPhone = args.customer_phone as string | undefined;
    const items = args.items as Array<{ product_id: string; variant_id?: string; quantity?: number }>;
    const notes = args.notes as string | undefined;

    if (!items || items.length === 0) {
      return {
        success: false,
        message: 'Please specify at least one product to reserve.',
      };
    }

    // Check if store is in catalog mode
    const config = await ctx.prisma.storeConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });

    if (config?.catalogMode) {
      return {
        success: false,
        message: 'This store is currently in catalog-only mode. Ordering is not available. Please contact the business directly.',
      };
    }

    const currency = config?.currency || 'USD';

    try {
      // Use ProductOrderService via prisma transaction
      const orderItems = items.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity || 1,
      }));

      // Import and use the service
      const { ProductOrderService } = await import('@runwell/bib-store');
      const orderService = new ProductOrderService(ctx.prisma);

      const order = await orderService.createOrder(ctx.tenantId, {
        fulfillmentType: 'local_pickup',
        customerName,
        customerEmail,
        customerPhone,
        customerNotes: notes,
        conversationId: ctx.sessionId || undefined,
        visitorProfileId: ctx.visitorId || undefined,
        items: orderItems,
      });

      // Format items for the response
      const reservedItems = order.items.map((item: {
        name: string;
        quantity: number;
        unitPriceInCents: number;
        variant?: { name: string } | null;
      }) => ({
        name: item.name,
        variant: item.variant?.name || undefined,
        quantity: item.quantity,
        price: formatCents(item.unitPriceInCents, currency),
      }));

      return {
        success: true,
        orderNumber: order.orderNumber,
        status: 'reserved',
        items: reservedItems,
        total: formatCents(order.totalInCents, currency),
        message:
          `Your items have been reserved under order number ${order.orderNumber}. ` +
          'The business owner will review and confirm your reservation. ' +
          'Please note: these items are reserved for you but not yet purchased. ' +
          'The business will contact you to arrange pickup and payment.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // User-friendly error messages
      if (message.includes('Insufficient stock')) {
        return {
          success: false,
          message: 'Sorry, one or more items do not have enough stock available. Please try with a smaller quantity or check product availability.',
        };
      }

      if (message.includes('not found or inactive')) {
        return {
          success: false,
          message: 'Sorry, one or more products are no longer available. Please check the catalog for current products.',
        };
      }

      if (message.includes('catalog-only mode')) {
        return {
          success: false,
          message: 'This store is currently in catalog-only mode. Please contact the business directly to place an order.',
        };
      }

      return {
        success: false,
        message: 'I encountered an error while trying to reserve your items. Please try again or contact the business directly.',
      };
    }
  },
};

function formatCents(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
