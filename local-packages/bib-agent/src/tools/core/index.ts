/**
 * Core Tools Barrel Export
 *
 * Re-exports all 9 core tools and their registration helper.
 */

// Business data tools (5)
export {
  getBusinessInfoTool,
  getBusinessHoursTool,
  getServicesTool,
  getFaqsTool,
  getProductsTool,
  businessDataTools,
} from './business-data.js';

// Brand tools (3)
export {
  fetchWebsiteTool,
  analyzeBrandTool,
  getBrandVoiceTool,
  brandTools,
} from './brand-tools.js';

// Sanitize tool (1)
export {
  sanitizeContentTool,
  sanitizeContent,
} from './sanitize.js';

// Escalation tool (1)
export { escalationTool } from './escalation.js';

// Booking tools (2)
export { checkAvailabilityTool, createBookingTool, bookingTools } from './booking.js';

// =============================================================================
// All core tools combined
// =============================================================================

import { businessDataTools } from './business-data.js';
import { brandTools } from './brand-tools.js';
import { sanitizeContentTool } from './sanitize.js';
import { escalationTool } from './escalation.js';
import { bookingTools } from './booking.js';
import type { BibTool } from '../types.js';

/**
 * All 12 core tools in a single array.
 * Used by ToolRegistry to register all core tools at once.
 */
export const allCoreTools: BibTool[] = [
  ...businessDataTools,
  ...brandTools,
  sanitizeContentTool,
  escalationTool,
  ...bookingTools,
];
