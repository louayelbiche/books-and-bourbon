import { SuggestionConfig } from '@runwell/pidgie-core/suggestions';

/**
 * Standard knowledge source for any bot.
 * Bots can derive this from scraped content, locale files, CMS, or hardcoded data.
 */
interface KnowledgeSource {
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
interface BotBehaviorConfig {
    role: string;
    toneInstructions: string;
    suggestions: SuggestionConfig;
    securityRules?: string;
    customInstructions?: string;
}

/**
 * Generic system prompt assembler.
 *
 * Takes a KnowledgeSource + BotBehaviorConfig and returns a complete system prompt string.
 * Existing bots (pidgie-core prompt builder, ShopimateAgent) are NOT required to use this.
 * it's for new bots and optional adoption.
 */
declare function buildPrompt(knowledge: KnowledgeSource, behavior: BotBehaviorConfig): string;

export { type BotBehaviorConfig, type KnowledgeSource, buildPrompt };
