/**
 * Brand & Website Core Tools
 *
 * 3 core tools for brand analysis and website context:
 * - fetch_website — scrape and analyze a website (uses external deps)
 * - analyze_brand — extract brand identity from website content
 * - get_brand_voice — retrieve cached brand voice analysis
 *
 * Extracted from:
 * - packages/pidgie-core/src/tools/fetch-website.ts
 * - packages/campaign-agent/src/tools/analyze-brand.ts
 * - packages/social-agent/src/tools/get-brand-voice.ts
 *
 * Key differences from originals:
 * - fetch_website: Returns website data from DataContext (scraped field)
 *   rather than performing live scraping. The live scraping version
 *   remains in pidgie-core for the pidgie agent's fetch_website tool.
 *   This core version is a READ tool that surfaces pre-scraped data.
 * - analyze_brand: Reads from DataContext brand.identity instead of
 *   calling Gemini. The LLM-based analysis remains in campaign-agent.
 * - get_brand_voice: Reads from DataContext brand.voice instead of
 *   querying prisma for LinkedInGeneration records.
 */

import type { BibTool, BibToolContext } from '../types.js';

// =============================================================================
// fetch_website (read from DataContext)
// =============================================================================

export const fetchWebsiteTool: BibTool = {
  name: 'fetch_website',
  description:
    'Get the scraped website content and analysis. Returns the pre-scraped website data including business signals, contact info, and content summary.',
  parameters: {
    type: 'object',
    properties: {
      include_content: {
        type: 'boolean',
        description: 'Whether to include the full combined content text (default: false, returns summary only)',
      },
    },
    required: [],
  },
  tier: 'core',
  execute: async (args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    const { website } = dataContext;

    if (!website.scraped) {
      return {
        available: false,
        url: website.url,
        message:
          'No website has been scraped yet. Please scrape the website first from Settings.',
      };
    }

    const scraped = website.scraped;
    const result: Record<string, unknown> = {
      available: true,
      businessName: scraped.businessName,
      url: scraped.url,
      pagesScraped: scraped.pages.length,
      language: scraped.language || null,
    };

    // Include page summaries
    if (scraped.pages.length > 0) {
      result.pages = scraped.pages.map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        headingCount: p.headings.length,
      }));
    }

    // Optionally include full content
    if (args.include_content) {
      result.combinedContent = scraped.combinedContent;
    } else {
      // Return a truncated excerpt of the homepage
      const homepage = scraped.pages[0];
      if (homepage) {
        result.homepageExcerpt = homepage.bodyText.slice(0, 3000);
      }
    }

    return result;
  },
};

// =============================================================================
// analyze_brand (read from DataContext)
// =============================================================================

export const analyzeBrandTool: BibTool = {
  name: 'analyze_brand',
  description:
    'Get the brand identity analysis including colors, fonts, tagline, and values. Returns cached brand identity from website analysis.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  tier: 'core',
  execute: async (_args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    const { brand, website } = dataContext;

    if (!brand.identity && !brand.voice) {
      return {
        available: false,
        message:
          'No brand analysis available. Please analyze the website first from Settings.',
        hasWebsite: !!website.scraped,
      };
    }

    const result: Record<string, unknown> = {
      available: true,
    };

    if (brand.identity) {
      result.identity = {
        colors: brand.identity.colors,
        fonts: brand.identity.fonts,
        logoUrl: brand.identity.logoUrl,
        tagline: brand.identity.tagline,
        values: brand.identity.values,
      };
    }

    if (brand.voice) {
      result.voice = {
        companyName: brand.voice.companyName,
        industry: brand.voice.industry,
        mainOfferings: brand.voice.mainOfferings,
        brandVoice: brand.voice.brandVoice,
      };
    }

    return result;
  },
};

// =============================================================================
// get_brand_voice (read from DataContext)
// =============================================================================

export const getBrandVoiceTool: BibTool = {
  name: 'get_brand_voice',
  description:
    'Get the brand voice analysis including company name, industry, main offerings, and tone/style description.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  tier: 'core',
  execute: async (_args: Record<string, unknown>, ctx: BibToolContext) => {
    const { dataContext } = ctx;
    const { brand } = dataContext;

    if (!brand.voice) {
      return {
        source: 'none',
        message:
          'No brand voice data available. Generate LinkedIn posts first — the brand voice will be extracted automatically.',
      };
    }

    return {
      source: 'data_context',
      brandAnalysis: {
        companyName: brand.voice.companyName,
        industry: brand.voice.industry,
        mainOfferings: brand.voice.mainOfferings,
        brandVoice: brand.voice.brandVoice,
      },
      message: `Brand voice: ${brand.voice.brandVoice}`,
    };
  },
};

// =============================================================================
// All brand tools
// =============================================================================

export const brandTools: BibTool[] = [
  fetchWebsiteTool,
  analyzeBrandTool,
  getBrandVoiceTool,
];
