import type { LLMClient } from '../llm-client/types.js';
import type { WebsiteAnalysis } from './types.js';

const MAX_CONTENT_LENGTH = 15_000;

const SYSTEM_PROMPT = `You are a brand analyst. Analyze website content and extract the brand's voice and positioning. Return valid JSON only.`;

const EXTRACT_VOICE_PROMPT = (content: string) => `Analyze this website content and extract the brand identity:

${content}

Return JSON:
{
  "companyName": "string",
  "industry": "string (e.g., Technology, Food & Beverage, Healthcare)",
  "mainOfferings": ["string (top 3-5 products or services)"],
  "brandVoice": "string (one sentence describing the brand's communication style)"
}

Rules:
- companyName: extract the actual business name
- industry: pick the most specific category
- mainOfferings: list concrete products/services, not vague categories
- brandVoice: describe tone, style, and personality in one natural sentence
`;

/**
 * Extract a compact WebsiteAnalysis (brand voice summary).
 *
 * Uses system + user prompt pattern. Content truncated to 15K chars.
 * On parse failure, returns minimal defaults.
 */
export async function extractBrandVoice(
  llm: LLMClient,
  content: string,
): Promise<WebsiteAnalysis> {
  const truncated = content.slice(0, MAX_CONTENT_LENGTH);

  const responseText = await llm.generate({
    systemPrompt: SYSTEM_PROMPT,
    prompt: EXTRACT_VOICE_PROMPT(truncated),
    options: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseFormat: 'json',
    },
  });

  return parseWebsiteAnalysis(responseText);
}

function parseWebsiteAnalysis(jsonText: string): WebsiteAnalysis {
  const raw = JSON.parse(jsonText);
  const parsed = Array.isArray(raw) ? raw[0] : raw;

  return {
    companyName: parsed.companyName || 'Unknown',
    industry: parsed.industry || 'General',
    mainOfferings: Array.isArray(parsed.mainOfferings) ? parsed.mainOfferings : [],
    brandVoice: typeof parsed.brandVoice === 'string' ? parsed.brandVoice : 'Professional',
  };
}
