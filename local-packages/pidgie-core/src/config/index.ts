/**
 * Brand configuration exports (server-safe, no React dependencies).
 *
 * Use this import path in server components and API routes:
 *   import { getBrandConfig } from '@runwell/pidgie-core/config';
 *
 * Do NOT import from '@runwell/pidgie-core' in server code;
 * the barrel export includes the widget which uses React hooks.
 */

export type { BrandSlug, BrandSlugAll, BrandConfig, BrandRegistry, DashboardTheme } from '../types/brand.js';
export { brandRegistry, getBrandConfig, isValidBrandSlug, getActiveBrandSlugs, getAllBrandSlugs } from './brand-utils.js';
export { generateWidgetTheme, generateWidgetThemes } from './brand-to-theme.js';
export type { GeneratedWidgetTheme } from './brand-to-theme.js';
