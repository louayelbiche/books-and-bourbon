import type { BrandConfig, BrandSlug, BrandSlugAll, BrandRegistry } from '../types/brand.js';
import registry from './brand-registry.json';

export const brandRegistry: BrandRegistry = registry as BrandRegistry;

const VALID_SLUGS = new Set<string>(Object.keys(brandRegistry));

/**
 * Get brand configuration by slug.
 * Returns the matching brand config, or falls back to 'runwell' for unknown slugs.
 */
export function getBrandConfig(slug: string): BrandConfig {
  if (VALID_SLUGS.has(slug)) {
    return brandRegistry[slug as BrandSlugAll];
  }
  return brandRegistry.runwell;
}

/**
 * Check if a string is a valid brand slug (including archived).
 */
export function isValidBrandSlug(slug: string): slug is BrandSlugAll {
  return VALID_SLUGS.has(slug);
}

/**
 * Get all active (non-archived) brand slugs.
 */
export function getActiveBrandSlugs(): BrandSlug[] {
  return (Object.keys(brandRegistry) as BrandSlugAll[])
    .filter((slug) => !brandRegistry[slug]._archived) as BrandSlug[];
}

/**
 * Get all brand slugs including archived.
 */
export function getAllBrandSlugs(): BrandSlugAll[] {
  return Object.keys(brandRegistry) as BrandSlugAll[];
}
