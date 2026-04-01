/**
 * computeMeta — DataContext field classification
 *
 * Walks all DataContext fields and classifies them into:
 * - availableFields: non-null scalar fields and non-empty arrays
 * - missingFields: null fields
 * - emptyCollections: arrays with length 0
 * - lastUpdated: current ISO-8601 timestamp
 *
 * @see spec TASK-014
 */

import type { DataContext, DataContextMeta } from './types.js';

/**
 * Compute metadata for a DataContext by classifying all fields.
 *
 * @param ctx - DataContext without _meta (to avoid circular reference)
 * @returns DataContextMeta with field classifications
 */
export function computeMeta(ctx: Omit<DataContext, '_meta'>): DataContextMeta {
  const availableFields: string[] = [];
  const missingFields: string[] = [];
  const emptyCollections: string[] = [];

  // ── Top-level scalars ───────────────────────────────────────────────────
  classifyScalar('tenantId', ctx.tenantId, availableFields, missingFields);
  classifyScalar('tenantName', ctx.tenantName, availableFields, missingFields);

  // ── Business nested scalars ─────────────────────────────────────────────
  classifyScalar('business.name', ctx.business?.name, availableFields, missingFields);
  classifyScalar('business.category', ctx.business?.category, availableFields, missingFields);
  classifyScalar('business.description', ctx.business?.description, availableFields, missingFields);
  classifyScalar('business.industry', ctx.business?.industry, availableFields, missingFields);

  // ── Contact ─────────────────────────────────────────────────────────────
  classifyScalar('contact.phone', ctx.contact?.phone, availableFields, missingFields);
  classifyScalar('contact.email', ctx.contact?.email, availableFields, missingFields);
  classifyScalar('contact.address', ctx.contact?.address, availableFields, missingFields);
  classifyScalar('contact.socialMedia', ctx.contact?.socialMedia, availableFields, missingFields);

  // ── Hours (null = missing, [] = emptyCollection, populated = available) ─
  if (ctx.hours === null || ctx.hours === undefined) {
    missingFields.push('hours');
  } else if (Array.isArray(ctx.hours) && ctx.hours.length === 0) {
    emptyCollections.push('hours');
  } else {
    availableFields.push('hours');
  }

  // ── Collections ─────────────────────────────────────────────────────────
  classifyCollection('services', ctx.services, availableFields, emptyCollections);
  classifyCollection('products', ctx.products, availableFields, emptyCollections);
  classifyCollection('faqs', ctx.faqs, availableFields, emptyCollections);
  classifyCollection('promotions', ctx.promotions, availableFields, emptyCollections);

  // ── Configs ─────────────────────────────────────────────────────────────
  classifyScalar('booking', ctx.booking, availableFields, missingFields);
  classifyScalar('ordering', ctx.ordering, availableFields, missingFields);

  // ── Website ─────────────────────────────────────────────────────────────
  classifyScalar('website.scraped', ctx.website?.scraped, availableFields, missingFields);
  classifyScalar('website.url', ctx.website?.url, availableFields, missingFields);
  classifyScalar('website.publishStatus', ctx.website?.publishStatus, availableFields, missingFields);

  // ── Brand ───────────────────────────────────────────────────────────────
  classifyScalar('brand.voice', ctx.brand?.voice, availableFields, missingFields);
  classifyScalar('brand.identity', ctx.brand?.identity, availableFields, missingFields);

  // _extensions is intentionally excluded from meta classification.
  // It's an optional extensibility field, not business data to guard.

  return {
    availableFields,
    missingFields,
    emptyCollections,
    lastUpdated: new Date().toISOString(),
  };
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Classify a scalar field as available or missing.
 */
function classifyScalar(
  path: string,
  value: unknown,
  available: string[],
  missing: string[]
): void {
  if (value === null || value === undefined) {
    missing.push(path);
  } else {
    available.push(path);
  }
}

/**
 * Classify a collection (array) field as available or empty.
 * Arrays are never "missing" — they are either populated or empty.
 */
function classifyCollection(
  path: string,
  value: unknown[] | undefined | null,
  available: string[],
  empty: string[]
): void {
  if (!value || value.length === 0) {
    empty.push(path);
  } else {
    available.push(path);
  }
}
