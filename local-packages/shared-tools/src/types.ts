// Re-export detection types at package root for convenience
export type {
  BusinessType,
  BusinessSignals,
  ContactMethods,
  Tone,
  ScrapedPageInput,
} from './detection/types.js';

export { createDefaultSignals, getDefaultTone } from './detection/types.js';
