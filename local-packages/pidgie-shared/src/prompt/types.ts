import type { SuggestionConfig } from '@runwell/pidgie-core/suggestions';

/**
 * Standard knowledge source for any bot.
 * Bots can derive this from scraped content, locale files, CMS, or hardcoded data.
 */
export interface KnowledgeSource {
  identity: {
    name: string;
    description: string;
    positioning?: string;
  };
  contentSections?: Array<{
    heading: string;
    content: string;
    priority?: number;
  }>;
  rawContent?: string;
  maxContentLength?: number;
}

/**
 * Behavioral configuration for a bot.
 */
export interface BotBehaviorConfig {
  role: string;
  toneInstructions: string;
  suggestions: SuggestionConfig;
  securityRules?: string;
  customInstructions?: string;
}
