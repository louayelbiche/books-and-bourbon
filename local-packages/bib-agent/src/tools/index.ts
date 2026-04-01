/**
 * Tools Barrel Export
 *
 * Exports the BibTool interface, adapter, registry, and all core tools.
 */

// Types
export type { BibTool, BibToolContext, ToolParameter, ToolParameterSchema } from './types.js';

// Adapter
export { toBibAgentTool } from './adapter.js';
export type { BibToolContextProvider } from './adapter.js';

// Registry
export {
  ToolRegistry,
  ToolNotFoundError,
  DuplicateToolError,
} from './registry.js';
export type { CoreToolName } from './registry.js';

// Core tools
export {
  // Business data tools
  getBusinessInfoTool,
  getBusinessHoursTool,
  getServicesTool,
  getFaqsTool,
  getProductsTool,
  businessDataTools,
  // Brand tools
  fetchWebsiteTool,
  analyzeBrandTool,
  getBrandVoiceTool,
  brandTools,
  // Sanitize
  sanitizeContentTool,
  sanitizeContent,
  // All core tools
  allCoreTools,
} from './core/index.js';
