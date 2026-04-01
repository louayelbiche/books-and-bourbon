/**
 * Agent Card Configuration
 *
 * Per-app and per-agent configuration for the card system.
 * Controls panel behavior, pill styling, progressive rendering, and feature flags.
 */

import type { AgentCardType } from './types.js';

/**
 * Theme for action pills (heavy visual weight, triggers operations).
 */
export interface ActionPillTheme {
  variant: 'solid' | 'outline';
  colorScheme: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Theme for message pills (light, sends conversational text).
 */
export interface PillTheme {
  variant: 'ghost' | 'subtle';
  colorScheme: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Per-agent card configuration.
 * Extends the base CardConfig with panel, pill, and rendering settings.
 */
export interface AgentCardConfig {
  /** Enable side panel for this agent */
  enablePanel: boolean;
  /** Panel position on desktop */
  panelPosition: 'right' | 'bottom';
  /** Card types that should always be in the panel */
  panelDefaultItems?: AgentCardType[];
  /** Maximum items in the panel stack */
  maxPanelItems: number;
  /** Action pill styling */
  actionPillStyle: ActionPillTheme;
  /** Message pill styling */
  messagePillStyle: PillTheme;
  /** Enable progressive rendering (cards stream in as DB records are created) */
  enableProgressiveRendering: boolean;
  /** Feature flag — master switch for agent cards */
  enabled: boolean;
}

/**
 * Default configuration for agents.
 */
export const DEFAULT_AGENT_CARD_CONFIG: AgentCardConfig = {
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
