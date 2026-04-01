/**
 * Per-Agent Card Configurations
 *
 * Each agent has its own card config specifying panel behavior,
 * pill styling, and card type settings.
 */

import type { AgentCardConfig } from './config.js';
import type { AgentCardType } from './types.js';

export const CAMPAIGN_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: [],
  maxPanelItems: 10,
  actionPillStyle: {
    variant: 'solid',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'ghost',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: true,
  enabled: true,
};

export const ENGAGEMENT_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: [],
  maxPanelItems: 8,
  actionPillStyle: {
    variant: 'solid',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'subtle',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: true,
  enabled: true,
};

export const SOCIAL_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: [],
  maxPanelItems: 10,
  actionPillStyle: {
    variant: 'solid',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'ghost',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: true,
  enabled: true,
};

export const PIDGIE_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: ['business-breakdown' as AgentCardType],
  maxPanelItems: 5,
  actionPillStyle: {
    variant: 'outline',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'ghost',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: false,
  enabled: true,
};

export const MARKETING_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: [],
  maxPanelItems: 10,
  actionPillStyle: {
    variant: 'solid',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'ghost',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: true,
  enabled: true,
};

export const ADVISOR_CARD_CONFIG: AgentCardConfig = {
  enablePanel: true,
  panelPosition: 'right',
  panelDefaultItems: [],
  maxPanelItems: 10,
  actionPillStyle: {
    variant: 'solid',
    colorScheme: 'primary',
    borderRadius: 'md',
  },
  messagePillStyle: {
    variant: 'ghost',
    colorScheme: 'neutral',
    borderRadius: 'full',
  },
  enableProgressiveRendering: true,
  enabled: true,
};

type AgentType = 'campaign' | 'engagement' | 'social' | 'pidgie' | 'advisor' | 'marketing';

const AGENT_CONFIGS: Record<AgentType, AgentCardConfig> = {
  campaign: CAMPAIGN_CARD_CONFIG,
  engagement: ENGAGEMENT_CARD_CONFIG,
  social: SOCIAL_CARD_CONFIG,
  pidgie: PIDGIE_CARD_CONFIG,
  advisor: ADVISOR_CARD_CONFIG,
  marketing: MARKETING_CARD_CONFIG,
};

/**
 * Get the card config for an agent type.
 */
export function getAgentCardConfig(agentType: string): AgentCardConfig {
  return AGENT_CONFIGS[agentType as AgentType] ?? PIDGIE_CARD_CONFIG;
}
