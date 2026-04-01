/**
 * Pidgie Tools
 *
 * Read-only tools for the Pidgie agent to access business data.
 * All tools must only return public information - NEVER credentials or internal data.
 */

// Business data tools
export { businessInfoTool } from './business-info.js';
export { businessHoursTool } from './business-hours.js';
export { servicesTool } from './services.js';
export { faqsTool } from './faqs.js';

// Product catalog tools
export { searchProductsTool, getProductDetailsTool, getPromotionsTool } from './products.js';

// Booking tools
export { checkAvailabilityTool, getBookingInfoTool } from './booking.js';

// Card display tools (DB-validated visual cards)
export { showProductCardTool, showServiceCardTool, showEventCardTool } from './show-card.js';
export { registerPidgieCardMappers } from './card-mappers.js';

// Re-export all tools as array for registration
export {
  pidgieTools,
  pidgieToolNames,
  productTools,
  bookingTools,
  cardTools,
  createPidgieEscalationTool,
  createPidgieBookingTools,
} from './registry.js';

// Website fetch tool (mid-conversation scraping + analysis)
export { createFetchWebsiteTool, type FetchWebsiteResult } from './fetch-website.js';
export type { FetchWebsiteToolOptions } from './fetch-website.js';

// Write tool support
export {
  isWriteTool,
  createWriteTool,
  PendingOperationsStore,
  type WriteTool,
  type WriteToolResult,
  type PendingWriteOperation,
  type WriteToolExecutor,
} from './write-tool.js';
