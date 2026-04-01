/**
 * Pidgie Tools Registry
 *
 * Central registry of all tools available to the Pidgie agent.
 */

import type { AgentTool } from '@runwell/agent-core';
import { businessInfoTool } from './business-info.js';
import { businessHoursTool } from './business-hours.js';
import { servicesTool } from './services.js';
import { faqsTool } from './faqs.js';
import { searchProductsTool, getProductDetailsTool, getPromotionsTool } from './products.js';
import { placeOrderTool } from './place-order.js';
import { checkAvailabilityTool, getBookingInfoTool } from './booking.js';
import { showProductCardTool, showServiceCardTool, showEventCardTool } from './show-card.js';
// Escalation and booking adapters are lazy-imported to avoid module-not-found
// errors in consumers that don't have these workspace packages installed
// (e.g., shopimate vendored copy).

/**
 * Creates the escalation tool configured for a specific tenant.
 * Call this at agent init time when tenantId and prisma are available.
 */
export async function createPidgieEscalationTool(config: {
  tenantId: string;
  prisma: unknown;
  sessionId?: string;
  businessName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notify?: any;
}) {
  const { createEscalationAgentTool, PrismaRequestStore } = await import('@runwell/request-escalation');
  return createEscalationAgentTool({
    store: new PrismaRequestStore(config.prisma),
    tenantId: config.tenantId,
    sessionId: config.sessionId,
    businessName: config.businessName,
    source: 'pidgie',
    notify: config.notify,
  });
}

/**
 * Creates booking tools configured for a specific tenant.
 * Returns both check_availability and create_booking tools.
 */
export async function createPidgieBookingTools(config: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: any;
  tenantId: string;
  sessionId?: string;
  businessName?: string;
}) {
  const { createCheckAvailabilityAgentTool, createBookingAgentTool } = await import('@runwell/booking-adapter');
  return [
    createCheckAvailabilityAgentTool({
      adapter: config.adapter,
      tenantId: config.tenantId,
      sessionId: config.sessionId,
      businessName: config.businessName,
      source: 'pidgie',
    }),
    createBookingAgentTool({
      adapter: config.adapter,
      tenantId: config.tenantId,
      sessionId: config.sessionId,
      businessName: config.businessName,
      source: 'pidgie',
    }),
  ];
}

/**
 * Core business data tools
 *
 * Basic tools for business info, hours, services, and FAQs.
 */
export const coreTools: AgentTool[] = [
  businessInfoTool,
  businessHoursTool,
  servicesTool,
  faqsTool,
];

/**
 * Product catalog tools
 *
 * Tools for searching and viewing products and promotions.
 * SECURITY: Only exposes public pricing - NEVER cost, margin, or supplier data.
 */
export const productTools: AgentTool[] = [
  searchProductsTool,
  getProductDetailsTool,
  getPromotionsTool,
  placeOrderTool,
];

/**
 * Booking tools
 *
 * Tools for checking availability and booking information.
 * SECURITY: Only exposes public booking info - no internal reservation data.
 */
export const bookingTools: AgentTool[] = [
  checkAvailabilityTool,
  getBookingInfoTool,
];

/**
 * Card display tools
 *
 * Tools for showing visual cards in the chat.
 * Cards are DB-validated — the LLM picks WHICH card, the DB provides WHAT it shows.
 */
export const cardTools: AgentTool[] = [
  showProductCardTool,
  showServiceCardTool,
  showEventCardTool,
];

/**
 * All Pidgie tools
 *
 * These are read-only tools that provide access to business data.
 * SECURITY: None of these tools have write access or can expose credentials.
 */
export const pidgieTools: AgentTool[] = [
  ...coreTools,
  ...productTools,
  ...bookingTools,
  ...cardTools,
];

/**
 * Tool names for quick reference
 */
export const pidgieToolNames = pidgieTools.map((t) => t.name);

