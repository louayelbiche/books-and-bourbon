/**
 * Demo Pill Registry
 *
 * Per-agent, per-phase pill definitions for demo mode.
 * Deterministic — same pills every time for consistent demo journeys.
 */

import type { ActionPillTheme, PillTheme } from './config.js';

type AgentType = 'campaign' | 'engagement' | 'social' | 'pidgie' | 'marketing' | 'lead-scout' | 'reputation';

interface DemoPill {
  type: 'action' | 'message';
  label: string;
  payload: Record<string, unknown>;
}

interface DemoPhaseConfig {
  phase: string;
  pills: DemoPill[];
}

const CAMPAIGN_PHASES: DemoPhaseConfig[] = [
  {
    phase: 'brand-analysis',
    pills: [
      { type: 'action', label: 'Analyze my brand', payload: { action: 'analyze_brand' } },
      { type: 'message', label: 'What info do you need?', payload: { text: 'What info do you need?' } },
    ],
  },
  {
    phase: 'recipient-generation',
    pills: [
      { type: 'action', label: 'Generate recipients', payload: { action: 'generate_recipients' } },
      { type: 'message', label: 'How many recipients?', payload: { text: 'How many recipients should I target?' } },
    ],
  },
  {
    phase: 'email-drafting',
    pills: [
      { type: 'action', label: 'Draft emails', payload: { action: 'draft_emails' } },
      { type: 'message', label: 'Change the tone', payload: { text: 'Can you make the tone more casual?' } },
    ],
  },
  {
    phase: 'review',
    pills: [
      { type: 'action', label: 'Review campaign', payload: { action: 'list_campaigns' } },
      { type: 'message', label: 'Show me a preview', payload: { text: 'Show me a preview of the first email' } },
    ],
  },
];

const ENGAGEMENT_PHASES: DemoPhaseConfig[] = [
  {
    phase: 'persona-selection',
    pills: [
      { type: 'action', label: 'View subscribers', payload: { action: 'get_subscribers' } },
      { type: 'message', label: 'What personas are available?', payload: { text: 'What personas are available?' } },
    ],
  },
  {
    phase: 'subject-lines',
    pills: [
      { type: 'action', label: 'Browse templates', payload: { action: 'list_newsletters' } },
      { type: 'message', label: 'Make them catchier', payload: { text: 'Can you make them catchier?' } },
    ],
  },
  {
    phase: 'content-generation',
    pills: [
      { type: 'action', label: 'Write newsletter', payload: { action: 'generate_newsletter' } },
      { type: 'message', label: 'Add a section', payload: { text: 'Can you add a section about upcoming events?' } },
    ],
  },
  {
    phase: 'review',
    pills: [
      { type: 'action', label: 'Preview email', payload: { action: 'preview_email' } },
      { type: 'message', label: 'Schedule for Monday', payload: { text: 'Schedule this for Monday morning' } },
    ],
  },
];

const SOCIAL_PHASES: DemoPhaseConfig[] = [
  {
    phase: 'brand-analysis',
    pills: [
      { type: 'action', label: 'Analyze brand voice', payload: { action: 'get_brand_voice' } },
      { type: 'message', label: 'What will you analyze?', payload: { text: 'What aspects of my brand will you analyze?' } },
    ],
  },
  {
    phase: 'content-generation',
    pills: [
      { type: 'action', label: 'Generate posts', payload: { action: 'generate_linkedin_posts' } },
      { type: 'message', label: 'Focus on thought leadership', payload: { text: 'Focus on thought leadership content' } },
    ],
  },
  {
    phase: 'review',
    pills: [
      { type: 'action', label: 'Review all posts', payload: { action: 'list_content' } },
      { type: 'message', label: 'Adjust Day 3', payload: { text: 'Can you adjust the Day 3 post?' } },
    ],
  },
];

const MARKETING_PHASES: DemoPhaseConfig[] = [
  {
    phase: 'brand-analysis',
    pills: [
      { type: 'action', label: 'Analyze my brand', payload: { action: 'analyze_brand' } },
      { type: 'message', label: 'What do you need?', payload: { text: 'What information do you need to get started?' } },
    ],
  },
  {
    phase: 'research',
    pills: [
      { type: 'action', label: 'Research pain points', payload: { action: 'mine_pain_points' } },
      { type: 'message', label: 'Research competitors', payload: { text: 'Research competitor ads' } },
    ],
  },
  {
    phase: 'creative',
    pills: [
      { type: 'action', label: 'Generate ad briefs', payload: { action: 'generate_brief' } },
      { type: 'message', label: 'Create ad images', payload: { text: 'Create ad images for my campaign' } },
    ],
  },
  {
    phase: 'review',
    pills: [
      { type: 'action', label: 'Campaign summary', payload: { action: 'synthesize_campaign' } },
      { type: 'message', label: 'Export campaign', payload: { text: 'Export my campaign assets' } },
    ],
  },
];

const PIDGIE_PHASES: DemoPhaseConfig[] = [
  {
    phase: 'greeting',
    pills: [
      { type: 'message', label: 'What services do you offer?', payload: { text: 'What services do you offer?' } },
      { type: 'message', label: 'What are your hours?', payload: { text: 'What are your hours?' } },
    ],
  },
  {
    phase: 'exploration',
    pills: [
      { type: 'message', label: 'Show me products', payload: { text: 'Can you show me your products?' } },
      { type: 'message', label: 'Upcoming events?', payload: { text: 'Do you have any upcoming events?' } },
    ],
  },
];

const AGENT_PHASES: Record<AgentType, DemoPhaseConfig[]> = {
  campaign: CAMPAIGN_PHASES,
  engagement: ENGAGEMENT_PHASES,
  social: SOCIAL_PHASES,
  pidgie: PIDGIE_PHASES,
  marketing: MARKETING_PHASES,
  'lead-scout': [],
  reputation: [],
};

/**
 * Get demo pills for an agent at a specific phase.
 */
export function getDemoPills(agentType: AgentType, phase: string): DemoPill[] {
  const phases = AGENT_PHASES[agentType];
  if (!phases) return [];

  const phaseConfig = phases.find((p) => p.phase === phase);
  return phaseConfig?.pills ?? [];
}

/**
 * Get all phase names for an agent.
 */
export function getAgentPhases(agentType: AgentType): string[] {
  const phases = AGENT_PHASES[agentType];
  if (!phases) return [];
  return phases.map((p) => p.phase);
}

/**
 * Get the default action pill theme.
 */
export function getDefaultActionPillTheme(): ActionPillTheme {
  return { variant: 'solid', colorScheme: 'primary', borderRadius: 'md' };
}

/**
 * Get the default message pill theme.
 */
export function getDefaultMessagePillTheme(): PillTheme {
  return { variant: 'ghost', colorScheme: 'neutral', borderRadius: 'full' };
}
