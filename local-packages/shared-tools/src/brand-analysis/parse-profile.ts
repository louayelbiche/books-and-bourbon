import type { BrandProfile } from './types.js';

/**
 * Parse raw JSON text into a validated BrandProfile.
 *
 * Handles:
 * - Array-wrapped responses (takes first element)
 * - Missing fields (safe defaults)
 * - Confidence clamping to [0, 1]
 * - Array truncation (personality, dos, donts capped at 5)
 */
export function parseBrandProfile(jsonText: string): BrandProfile {
  const raw = JSON.parse(jsonText);
  if (Array.isArray(raw)) {
    if (raw.length === 0) throw new Error('Empty response array');
  }
  const parsed = Array.isArray(raw) ? raw[0] : raw;

  return {
    companyName: parsed.companyName || 'Unknown',
    brandVoice: {
      tone: parsed.brandVoice?.tone || 'professional',
      personality: Array.isArray(parsed.brandVoice?.personality)
        ? parsed.brandVoice.personality.slice(0, 5)
        : [],
      dos: Array.isArray(parsed.brandVoice?.dos)
        ? parsed.brandVoice.dos.slice(0, 5)
        : [],
      donts: Array.isArray(parsed.brandVoice?.donts)
        ? parsed.brandVoice.donts.slice(0, 5)
        : [],
    },
    brandValues: Array.isArray(parsed.brandValues) ? parsed.brandValues : [],
    products: Array.isArray(parsed.products)
      ? parsed.products.map((p: Record<string, string>) => ({
          name: p.name || 'Unknown',
          description: p.description || '',
        }))
      : [],
    targetAudience: parsed.targetAudience || 'General audience',
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
  };
}
