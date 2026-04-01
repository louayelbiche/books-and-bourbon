// Demo mode module
// Only used when isDemo=true (pidgie-demo, shopimate landing)

export { enrichForDemo } from './enricher.js';
export type {
  EnrichedProduct,
  GeneratedSlot,
  DemoEnrichment,
  EnrichOptions,
} from './enricher.js';

export {
  createDemoTools,
  createDemoSessionState,
  createDemoAddToCartTool,
  createDemoViewCartTool,
  createDemoRemoveFromCartTool,
  createDemoEscalationTool,
} from './tools.js';
export type {
  CartItem,
  DemoSessionState,
} from './tools.js';

export { getDemoModePromptFragment } from './prompt.js';
