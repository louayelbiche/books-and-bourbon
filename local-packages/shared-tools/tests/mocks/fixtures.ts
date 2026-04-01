import type { LLMClient } from '../../src/llm-client/types.js';
import { vi } from 'vitest';

export function createMockLLMClient(response: string): LLMClient {
  return {
    generate: vi.fn().mockResolvedValue(response),
  };
}

export const MOCK_BRAND_RESPONSE = JSON.stringify({
  companyName: 'Test Corp',
  brandVoice: {
    tone: 'professional',
    personality: ['innovative', 'reliable'],
    dos: ['Use data-driven language'],
    donts: ['Avoid jargon'],
  },
  brandValues: ['innovation', 'quality'],
  products: [{ name: 'Widget Pro', description: 'Premium widget' }],
  targetAudience: 'SMB owners',
  confidence: 0.85,
});

export const MOCK_VOICE_RESPONSE = JSON.stringify({
  companyName: 'Test Corp',
  industry: 'Technology',
  mainOfferings: ['SaaS Platform', 'Consulting'],
  brandVoice: 'Professional and data-driven with emphasis on ROI',
});
