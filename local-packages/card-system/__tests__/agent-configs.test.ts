/**
 * Agent Card Config Tests
 *
 * Tests for per-agent configuration and getAgentCardConfig.
 */

import { describe, it, expect } from 'vitest';
import {
  getAgentCardConfig,
  CAMPAIGN_CARD_CONFIG,
  ENGAGEMENT_CARD_CONFIG,
  SOCIAL_CARD_CONFIG,
  PIDGIE_CARD_CONFIG,
  ADVISOR_CARD_CONFIG,
} from '../src/validation/agent-configs.js';
import { DEFAULT_AGENT_CARD_CONFIG } from '../src/validation/config.js';

describe('getAgentCardConfig', () => {
  it('returns campaign config', () => {
    const config = getAgentCardConfig('campaign');
    expect(config).toBe(CAMPAIGN_CARD_CONFIG);
    expect(config.enabled).toBe(true);
    expect(config.enablePanel).toBe(true);
  });

  it('returns engagement config', () => {
    const config = getAgentCardConfig('engagement');
    expect(config).toBe(ENGAGEMENT_CARD_CONFIG);
    expect(config.maxPanelItems).toBe(8);
  });

  it('returns social config', () => {
    const config = getAgentCardConfig('social');
    expect(config).toBe(SOCIAL_CARD_CONFIG);
    expect(config.enableProgressiveRendering).toBe(true);
  });

  it('returns pidgie config with default panel items', () => {
    const config = getAgentCardConfig('pidgie');
    expect(config).toBe(PIDGIE_CARD_CONFIG);
    expect(config.panelDefaultItems).toContain('business-breakdown');
    expect(config.enableProgressiveRendering).toBe(false);
  });

  it('returns advisor config', () => {
    const config = getAgentCardConfig('advisor');
    expect(config).toBe(ADVISOR_CARD_CONFIG);
  });

  it('returns pidgie config for unknown agent type', () => {
    const config = getAgentCardConfig('unknown-agent');
    expect(config).toBe(PIDGIE_CARD_CONFIG);
  });
});

describe('AgentCardConfig structure', () => {
  const configs = [
    CAMPAIGN_CARD_CONFIG,
    ENGAGEMENT_CARD_CONFIG,
    SOCIAL_CARD_CONFIG,
    PIDGIE_CARD_CONFIG,
    ADVISOR_CARD_CONFIG,
  ];

  configs.forEach((config, i) => {
    it(`config ${i} has all required fields`, () => {
      expect(config).toHaveProperty('enablePanel');
      expect(config).toHaveProperty('panelPosition');
      expect(config).toHaveProperty('maxPanelItems');
      expect(config).toHaveProperty('actionPillStyle');
      expect(config).toHaveProperty('messagePillStyle');
      expect(config).toHaveProperty('enableProgressiveRendering');
      expect(config).toHaveProperty('enabled');
    });

    it(`config ${i} has valid pill themes`, () => {
      expect(['solid', 'outline']).toContain(config.actionPillStyle.variant);
      expect(['ghost', 'subtle']).toContain(config.messagePillStyle.variant);
    });
  });
});
