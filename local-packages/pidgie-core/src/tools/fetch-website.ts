/**
 * Fetch Website Tool
 *
 * Mid-conversation tool that scrapes a website, extracts structured
 * business signals, and generates a Gemini Flash summary.
 *
 * Returns a compact result (~1800 tokens) combining:
 * - Structured fields (signals, contact, offerings)
 * - Narrative summary (Gemini Flash)
 * - Homepage excerpt (fallback raw text)
 */

import { getGeminiClient } from '@runwell/agent-core';
import { scrapeWebsite, normalizeUrl } from '../scraper/index.js';
import { detectBusinessSignals } from '../detection/index.js';
import type { ProductEntry, FAQEntry, BlogEntry } from '../detection/index.js';
import { isBlockedUrl } from '../security/ssrf.js';

/**
 * Tool interface compatible with BaseDemoAgent.DemoAgentTool.
 * Defined locally to avoid circular dependency (pidgie-shared → pidgie-core).
 * TypeScript structural typing ensures compatibility.
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      { type: string; description: string; enum?: string[] }
    >;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface FetchWebsiteResult {
  businessName: string;
  url: string;
  businessType: string;
  confidence: number;

  // Structured (from signal detection)
  hasProducts: boolean;
  hasServices: boolean;
  hasPricing: boolean;
  hasBooking: boolean;
  primaryOfferings: string[];
  industryKeywords: string[];
  contact: {
    email: string | null;
    phone: string | null;
    form: boolean;
    social: string[];
  };

  // Extracted entries (real data, never fabricated)
  productEntries?: ProductEntry[];
  faqEntries?: FAQEntry[];
  blogEntries?: BlogEntry[];

  // Narrative (from Gemini Flash)
  summary: string;

  // Fallback raw (homepage only, truncated)
  homepageExcerpt: string;

  // Meta
  pagesScraped: number;
  scrapedAt: string;
}

export interface FetchWebsiteToolOptions {
  /** Max internal pages to scrape (default: 5) */
  maxPages?: number;
  /** Max chars for homepage excerpt (default: 3000) */
  maxHomepageExcerpt?: number;
  /** Max chars of combined content to send to summarizer (default: 15000) */
  maxSummaryInput?: number;
}

const SUMMARY_PROMPT = `Analyze this website content and provide a concise business summary.

Include:
- What the company does (core services/products)
- Target market and industries served
- Pricing model if visible (free tier, enterprise, custom, etc.)
- Key differentiators and competitive advantages
- Partnership or collaboration opportunities
- Notable clients or case studies mentioned

Be specific — use actual service names, price points, and industry terms found in the content.
Max 500 words. Do not use markdown formatting.

Website content:
`;

/**
 * Summarize scraped content using Gemini Flash.
 */
async function summarizeContent(
  combinedContent: string,
  maxInput: number
): Promise<string> {
  try {
    const client = getGeminiClient();
    const truncated = combinedContent.slice(0, maxInput);
    const result = await client.generateContent(
      `${SUMMARY_PROMPT}${truncated}`,
      {
        temperature: 0.3,
        maxOutputTokens: 1024,
      }
    );
    return result.text;
  } catch (error) {
    console.error(
      '[fetch-website] Summary generation failed:',
      error instanceof Error ? error.message : error
    );
    return 'Summary generation failed. Use the structured data and homepage excerpt below.';
  }
}

/**
 * Create a fetch_website tool for mid-conversation website analysis.
 */
export function createFetchWebsiteTool(
  options?: FetchWebsiteToolOptions
): ToolDefinition {
  const maxPages = options?.maxPages ?? 5;
  const maxHomepageExcerpt = options?.maxHomepageExcerpt ?? 3000;
  const maxSummaryInput = options?.maxSummaryInput ?? 15000;

  return {
    name: 'fetch_website',
    description:
      'Fetch and analyze a website to understand what a company offers, their services, pricing, and how they could help. Use this when the user mentions a website URL or asks about a specific company.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The website URL to fetch and analyze',
        },
      },
      required: ['url'],
    },
    execute: async (
      args: Record<string, unknown>
    ): Promise<FetchWebsiteResult | { error: string }> => {
      const rawUrl = args.url as string;
      if (!rawUrl) {
        return { error: 'URL is required' };
      }

      // Normalize URL (add https:// if needed)
      const url = normalizeUrl(rawUrl);
      if (!url) {
        return { error: `Invalid URL: ${rawUrl}` };
      }

      // SSRF check — block private/internal URLs (uses canonical implementation)
      if (isBlockedUrl(url)) {
        return { error: 'Cannot fetch internal/private URLs' };
      }

      try {
        // 1. Scrape (shallow — mid-conversation, not full crawl)
        console.log(`[fetch-website] Scraping ${url} (max ${maxPages} pages)`);
        const website = await scrapeWebsite(url, undefined, {
          maxInternalPages: maxPages,
          maxExternalPages: 0,
          followExternalLinks: false,
          maxContentChars: 50000,
        });

        // 2. Detect business signals (regex-based, instant)
        const signals = detectBusinessSignals(website.pages);

        // 3. Summarize with Gemini Flash
        const summary = await summarizeContent(
          website.combinedContent,
          maxSummaryInput
        );

        // 4. Build result
        const homepage = website.pages[0];
        const homepageExcerpt = homepage
          ? homepage.bodyText.slice(0, maxHomepageExcerpt)
          : '';

        return {
          businessName: website.businessName,
          url: website.url,
          businessType: signals.businessType,
          confidence: signals.confidence,

          hasProducts: signals.hasProducts,
          hasServices: signals.hasServices,
          hasPricing: signals.hasPricing,
          hasBooking: signals.hasBooking,
          primaryOfferings: signals.primaryOfferings,
          industryKeywords: signals.industryKeywords,
          ...(signals.productEntries && { productEntries: signals.productEntries }),
          ...(signals.faqEntries && { faqEntries: signals.faqEntries }),
          ...(signals.blogEntries && { blogEntries: signals.blogEntries }),
          contact: {
            email: signals.contactMethods.email,
            phone: signals.contactMethods.phone,
            form: signals.contactMethods.form,
            social: signals.contactMethods.social,
          },

          summary,
          homepageExcerpt,

          pagesScraped: website.pages.length,
          scrapedAt: new Date().toISOString(),
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        // Surface 403 errors clearly
        if (message.includes('403')) {
          return {
            error: `Site blocked access (403). This website has bot protection and cannot be scraped: ${url}`,
          };
        }

        console.error('[fetch-website] Scrape failed:', message);
        return { error: `Failed to fetch website: ${message}` };
      }
    },
  };
}
