/**
 * DataContext — Phase 1
 *
 * Typed business data manifest with explicit nulls.
 * Includes DataContext loader and meta computation.
 */

export type { DataContext, DataContextMeta } from './types.js';
export { computeMeta } from './meta.js';
export { loadDataContext, TenantNotFoundError } from './context-loader.js';
export type { BusinessProfile, BusinessProfileSignals, ExtractedMetadata } from './business-profile.js';
export { buildBusinessProfile, parseBusinessProfile, extractMetadataFromSignals, resolveBusinessContext } from './business-profile.js';
