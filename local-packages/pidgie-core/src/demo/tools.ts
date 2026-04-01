/**
 * Demo-only tools: cart and escalation that work in-memory.
 * Registered only when isDemo=true.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { EnrichedProduct, GeneratedSlot } from './enricher.js';

// ─── Demo Cart State (per session) ───────────────────────────────────

export interface CartItem {
  productName: string;
  variant: string | null;
  quantity: number;
  unitPrice: number;
}

export interface DemoSessionState {
  cart: CartItem[];
  escalations: { question: string; context: string; timestamp: Date }[];
  enrichedProducts: EnrichedProduct[];
  generatedSlots: GeneratedSlot[];
  disclaimerShown: {
    stock: boolean;
    booking: boolean;
    cart: boolean;
    escalation: boolean;
  };
}

export function createDemoSessionState(
  products: EnrichedProduct[],
  slots: GeneratedSlot[]
): DemoSessionState {
  return {
    cart: [],
    escalations: [],
    enrichedProducts: products,
    generatedSlots: slots,
    disclaimerShown: {
      stock: false,
      booking: false,
      cart: false,
      escalation: false,
    },
  };
}

// ─── Demo Cart Tools ─────────────────────────────────────────────────

export function createDemoAddToCartTool(
  getState: () => DemoSessionState
): AgentTool {
  return {
    name: 'add_to_cart',
    description: 'Add a product to the shopping cart. Works in demo mode with simulated inventory.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Product name to add' },
        variant: { type: 'string', description: 'Variant (size, color) if applicable' },
        quantity: { type: 'number', description: 'Quantity (default 1)' },
      },
      required: ['product_name'],
    },
    execute: async (args) => {
      const state = getState();
      const quantity = Number(args.quantity) || 1;
      const productName = args.product_name as string;
      const variant = (args.variant as string) || null;

      // Find enriched product for price
      const product = state.enrichedProducts.find(
        (p) => p.name.toLowerCase().includes(productName.toLowerCase())
      );
      const price = product?.salePrice ?? product?.price ?? 0;

      // Check if already in cart
      const existing = state.cart.find(
        (item) => item.productName === productName && item.variant === variant
      );

      if (existing) {
        existing.quantity += quantity;
      } else {
        state.cart.push({ productName, variant, quantity, unitPrice: price });
      }

      const cartTotal = state.cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity, 0
      );
      const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

      const disclaimer = !state.disclaimerShown.cart
        ? ' (Note: this is a demo cart. In production, this connects to your store checkout.)'
        : '';
      state.disclaimerShown.cart = true;

      return {
        success: true,
        message: `Added ${quantity}x ${productName}${variant ? ` (${variant})` : ''} to cart.${disclaimer}`,
        cartSummary: {
          items: cartCount,
          total: Math.round(cartTotal * 100) / 100,
          contents: state.cart.map((item) => ({
            product: item.productName,
            variant: item.variant,
            quantity: item.quantity,
            subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
          })),
        },
      };
    },
  };
}

export function createDemoViewCartTool(
  getState: () => DemoSessionState
): AgentTool {
  return {
    name: 'view_cart',
    description: 'View current shopping cart contents and total.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      const state = getState();

      if (state.cart.length === 0) {
        return { empty: true, message: 'Your cart is empty.' };
      }

      const cartTotal = state.cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity, 0
      );

      return {
        empty: false,
        items: state.cart.map((item) => ({
          product: item.productName,
          variant: item.variant,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: Math.round(item.unitPrice * item.quantity * 100) / 100,
        })),
        total: Math.round(cartTotal * 100) / 100,
        itemCount: state.cart.reduce((sum, item) => sum + item.quantity, 0),
      };
    },
  };
}

export function createDemoRemoveFromCartTool(
  getState: () => DemoSessionState
): AgentTool {
  return {
    name: 'remove_from_cart',
    description: 'Remove a product from the shopping cart.',
    parameters: {
      type: 'object',
      properties: {
        product_name: { type: 'string', description: 'Product name to remove' },
      },
      required: ['product_name'],
    },
    execute: async (args) => {
      const state = getState();
      const productName = (args.product_name as string).toLowerCase();

      const idx = state.cart.findIndex(
        (item) => item.productName.toLowerCase().includes(productName)
      );

      if (idx === -1) {
        return { success: false, message: 'Product not found in cart.' };
      }

      const removed = state.cart.splice(idx, 1)[0];
      return {
        success: true,
        message: `Removed ${removed.productName} from cart.`,
        remainingItems: state.cart.length,
      };
    },
  };
}

// ─── Demo Escalation Tool ────────────────────────────────────────────

export function createDemoEscalationTool(
  getState: () => DemoSessionState,
  businessName?: string
): AgentTool {
  const biz = businessName || 'our team';
  return {
    name: 'submit_request',
    description: `Submit a request when you cannot answer a question. Someone from ${biz} will follow up.`,
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question asked' },
        context: { type: 'string', description: 'What you already told them' },
        visitor_name: { type: 'string', description: 'Visitor name if shared' },
        visitor_email: { type: 'string', description: 'Visitor email if shared' },
      },
      required: ['question'],
    },
    execute: async (args) => {
      const state = getState();

      state.escalations.push({
        question: args.question as string,
        context: (args.context as string) || '',
        timestamp: new Date(),
      });

      const disclaimer = !state.disclaimerShown.escalation
        ? ` In the full version, this goes directly to your team's dashboard and you get notified immediately.`
        : '';
      state.disclaimerShown.escalation = true;

      return {
        status: 'success',
        request_id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
        message: `Your request has been submitted. Someone from ${biz} will follow up shortly.${disclaimer}`,
      };
    },
  };
}

// ─── Collect All Demo Tools ──────────────────────────────────────────

export function createDemoTools(
  getState: () => DemoSessionState,
  businessName?: string
): AgentTool[] {
  return [
    createDemoAddToCartTool(getState),
    createDemoViewCartTool(getState),
    createDemoRemoveFromCartTool(getState),
    createDemoEscalationTool(getState, businessName),
  ];
}
