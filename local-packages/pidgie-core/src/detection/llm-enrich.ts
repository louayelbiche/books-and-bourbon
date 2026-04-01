/**
 * LLM-Based Signal Enrichment
 *
 * Uses Gemini Flash to analyze scraped website content and extract structured
 * business intelligence. This replaces brittle regex patterns with real
 * language understanding.
 *
 * The regex-based detection in signals.ts stays as a zero-cost baseline.
 * This module enriches those signals with LLM-extracted data:
 * - primaryOfferings: what the business actually sells or offers
 * - industryKeywords: accurate industry classification
 * - businessType: confirmed or corrected business type
 */

import { getGeminiClient } from '@runwell/agent-core/llm';
import type { BusinessSignals, BusinessType } from './types.js';
import { calculateConfidence } from './signals.js';

interface LLMSignalResult {
  businessType: BusinessType;
  primaryOfferings: string[];
  industryKeywords: string[];
}

const ENRICHMENT_PROMPT = `You are a business analyst. Analyze this scraped website content and extract structured information about the business.

Return ONLY valid JSON with these fields:
{
  "businessType": one of "ecommerce", "services", "saas", "local", "portfolio", "b2b", "other",
  "primaryOfferings": array of 3-8 strings describing the main product categories or service lines (NOT individual product names; use category-level descriptions like "Athletic Wear", "Personal Training", "Web Design"),
  "industryKeywords": array of 2-5 industry classification keywords (like "fitness", "technology", "healthcare", "food service")
}

Rules:
- primaryOfferings should be CATEGORY-LEVEL, not individual items. For ecommerce, use product categories. For services, use service lines.
- If the business sells clothing, the offerings are categories like "Men's Activewear", "Women's Leggings", "Accessories", NOT individual product names.
- industryKeywords should be broad industry terms, not brand-specific words.
- If you cannot determine something, use empty array [] rather than guessing.
- Do NOT include any markdown formatting, code fences, or explanation. Return pure JSON only.

Website content:
`;

/**
 * Enrich business signals using Gemini Flash analysis of scraped content.
 *
 * Falls back gracefully to the original signals if the LLM call fails
 * (no API key, rate limit, network error, malformed response, etc.).
 */
export async function enrichSignalsWithLLM(
  signals: BusinessSignals,
  combinedContent: string,
): Promise<BusinessSignals> {
  // Skip if no content to analyze
  if (!combinedContent || combinedContent.length < 100) {
    return signals;
  }

  try {
    const client = getGeminiClient();

    // Truncate content to stay within token limits while preserving useful info.
    // First 6000 chars typically covers homepage + key pages.
    const truncated = combinedContent.slice(0, 6000);

    const result = await client.generateContent(
      ENRICHMENT_PROMPT + truncated,
      { temperature: 0.1 },
    );

    const parsed = parseResponse(result.text);
    if (!parsed) return signals;

    // Merge LLM results into signals, preferring LLM data when available
    const enriched = {
      ...signals,
      businessType: isValidBusinessType(parsed.businessType)
        ? parsed.businessType
        : signals.businessType,
      primaryOfferings: parsed.primaryOfferings.length > 0
        ? parsed.primaryOfferings.slice(0, 10)
        : signals.primaryOfferings,
      industryKeywords: parsed.industryKeywords.length > 0
        ? parsed.industryKeywords.slice(0, 8)
        : signals.industryKeywords,
    };

    // Recalculate confidence now that offerings and keywords are enriched
    return { ...enriched, confidence: calculateConfidence(enriched) };
  } catch (err) {
    // Graceful fallback: LLM enrichment is optional.
    // Missing API key, rate limits, network errors, etc. should never
    // break the scraping pipeline.
    console.warn('[SignalEnrich] LLM enrichment failed, using regex signals:', (err as Error).message);
    return signals;
  }
}

function parseResponse(text: string): LLMSignalResult | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (
      typeof parsed !== 'object' ||
      !parsed ||
      !Array.isArray(parsed.primaryOfferings) ||
      !Array.isArray(parsed.industryKeywords)
    ) {
      console.warn('[SignalEnrich] Malformed LLM response structure');
      return null;
    }

    return {
      businessType: String(parsed.businessType || 'other') as BusinessType,
      primaryOfferings: parsed.primaryOfferings
        .filter((s: unknown) => typeof s === 'string' && s.length > 1 && s.length < 100)
        .map((s: string) => s.trim()),
      industryKeywords: parsed.industryKeywords
        .filter((s: unknown) => typeof s === 'string' && s.length > 1 && s.length < 50)
        .map((s: string) => s.trim().toLowerCase()),
    };
  } catch {
    console.warn('[SignalEnrich] Failed to parse LLM response as JSON');
    return null;
  }
}

const VALID_TYPES: Set<string> = new Set([
  'ecommerce', 'services', 'saas', 'local', 'portfolio', 'b2b', 'other',
]);

function isValidBusinessType(type: string): type is BusinessType {
  return VALID_TYPES.has(type);
}
