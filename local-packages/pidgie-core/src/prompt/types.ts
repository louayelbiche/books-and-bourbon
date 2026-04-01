/**
 * Prompt Builder Types
 *
 * Types for the system prompt builder.
 */

import type { Tone } from '../detection/index.js';
import type { ScrapedWebsite } from '../scraper/index.js';

/**
 * Agent configuration for prompt building.
 */
export interface AgentConfig {
  /** Communication tone */
  tone: Tone;
  /** Custom instructions to add to the prompt */
  customInstructions?: string;
  /** Channel the bot is running on. Affects contact capture behavior. */
  channel?: 'whatsapp' | 'web';
  /** How to handle multiple search results: 'auto' | 'present_all' | 'ask_clarify'. */
  disambiguationStrategy?: 'auto' | 'present_all' | 'ask_clarify';
}

/**
 * Context for building a system prompt.
 */
export interface SystemPromptContext {
  /** Scraped website data */
  website: ScrapedWebsite;
  /** Agent configuration */
  config: AgentConfig;
}

/**
 * Options for customizing prompt building.
 */
export interface PromptBuilderOptions {
  /** Include website content section (default: true) */
  includeContent?: boolean;
  /** Include security rules section (default: true) */
  includeSecurity?: boolean;
  /** Include intent examples section (default: true) */
  includeIntentExamples?: boolean;
  /** Maximum content length in characters (default: no limit) */
  maxContentLength?: number;
}
