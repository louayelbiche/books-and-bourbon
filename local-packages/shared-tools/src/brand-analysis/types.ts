/**
 * Brand analysis types shared between BIB agents and local skills.
 *
 * BrandProfile: Rich brand identity (used by sales-agent).
 * WebsiteAnalysis: Compact brand summary (used by social-agent).
 */

export interface BrandVoice {
  tone: string;
  personality: string[];
  dos: string[];
  donts: string[];
}

export interface BrandProduct {
  name: string;
  description: string;
}

/**
 * Full brand profile extracted from website analysis.
 * Source: sales-agent analyze-brand tool.
 */
export interface BrandProfile {
  companyName: string;
  brandVoice: BrandVoice;
  brandValues: string[];
  products: BrandProduct[];
  targetAudience: string;
  /** 0.0 to 1.0; clamped in parseBrandProfile */
  confidence: number;
}

/**
 * Compact website analysis for social content generation.
 * Source: social-agent brand voice extraction.
 */
export interface WebsiteAnalysis {
  companyName: string;
  industry: string;
  mainOfferings: string[];
  /** Single descriptive string (not the BrandVoice object) */
  brandVoice: string;
}
