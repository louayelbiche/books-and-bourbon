import type { LLMClient } from '../llm-client/types.js';
import type { BrandProfile } from './types.js';
import { parseBrandProfile } from './parse-profile.js';

const MAX_CONTENT_LENGTH = 15_000;

const BRAND_ANALYSIS_PROMPT = (content: string) => `
You are a brand strategist AI. Analyze website content to extract brand identity.

Website content:
${content}

Extract and return as JSON:
{
  "companyName": "string",
  "brandVoice": {
    "tone": "string (e.g., professional, casual, authoritative, friendly)",
    "personality": ["string (3-5 adjectives)"],
    "dos": ["string (communication approaches that fit)"],
    "donts": ["string (things to avoid)"]
  },
  "brandValues": ["string (core values)"],
  "products": [{"name": "string", "description": "string"}],
  "targetAudience": "string (who the brand serves)",
  "confidence": 0.0-1.0
}

Rules:
- Extract from evidence, don't invent
- If information is sparse, set confidence < 0.5 and note uncertainty
- personality should be 3-5 adjectives
- dos/donts should be 3-5 items each
- products should include all identifiable offerings
`;

/**
 * Analyze website content to extract a full BrandProfile.
 *
 * Content is truncated to 15K chars before sending to the LLM.
 * On parse failure, returns a minimal profile with confidence 0.
 */
export async function analyzeBrand(
  llm: LLMClient,
  content: string,
): Promise<BrandProfile> {
  const truncated = content.slice(0, MAX_CONTENT_LENGTH);
  const prompt = BRAND_ANALYSIS_PROMPT(truncated);

  const responseText = await llm.generate({
    prompt,
    options: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseFormat: 'json',
    },
  });

  return parseBrandProfile(responseText);
}
