/**
 * Brand Registry Types
 *
 * Defines the structure for chatbot brand configurations.
 * Active brands: Pidgie, Receptia, Runwell, Shopimate.
 * Archived: Noir Dore (former Concierge brand, decommissioned 2026-03).
 */

/** Active chatbot brands (GTM channels for the same product) */
export type BrandSlug = 'pidgie' | 'receptia' | 'runwell' | 'shopimate';

/** All brand slugs including archived */
export type BrandSlugAll = BrandSlug | 'noir-dore';

/** Office dashboard theme names (maps to data-theme attribute in globals.css) */
export type DashboardTheme = 'office' | 'nest' | 'reception' | 'shopimate';

export interface BrandConfig {
  /** Display name for the brand */
  displayName: string;

  /** Primary brand color used on the website (hex) */
  primaryColor: string;
  /** Secondary brand color: accent or background contrast (hex) */
  secondaryColor: string;
  /** Color used for the chat widget FAB, header, and user bubbles (hex). May differ from primaryColor. */
  widgetPrimary: string;

  /** Office dashboard theme name (maps to data-theme attribute) */
  dashboardTheme: DashboardTheme;
  /** Dashboard brand-primary color (hex). Must match the website primary. Only Runwell has light/dark mode. */
  dashboardPrimary: string;

  /** URL to brand logo SVG */
  logoUrl: string;
  /** URL to chat avatar image */
  avatarUrl: string;
  /** Footer text shown in widget */
  footerText: string;
  /** URL to favicon */
  faviconUrl: string;

  /** Whether this brand is archived (kept for reference only) */
  _archived?: boolean;
  /** Design notes: fonts, color naming, architecture */
  _designNotes?: string;
}

export type BrandRegistry = Record<BrandSlugAll, BrandConfig>;
