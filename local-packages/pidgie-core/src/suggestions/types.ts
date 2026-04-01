/**
 * Suggestion System Types
 */

/**
 * Mode determines the suggestion style and intent.
 * - 'sales': Guide toward purchase (Shopimate)
 * - 'pidgie': Follow conversation role (Pidgie)
 */
export type SuggestionMode = 'sales' | 'pidgie';

/**
 * Perspective determines whose voice the suggestions are written in.
 * - 'user-asks-bot': Suggestions are questions the user would ask (default)
 * - 'bot-asks-user': Suggestions are questions the bot asks the user
 */
export type SuggestionPerspective = 'user-asks-bot' | 'bot-asks-user';

/**
 * Full suggestion configuration, backward-compatible with plain SuggestionMode.
 */
export interface SuggestionConfig {
  mode: SuggestionMode;
  perspective?: SuggestionPerspective;
  customGuidance?: string;
  /** Max characters per suggestion. Default 40 (web). WhatsApp: 20. */
  maxSuggestionLength?: number;
}

/**
 * Context for generating initial (pre-conversation) suggestions.
 */
export interface InitialSuggestionContext {
  businessName: string;
  mode: SuggestionMode;
  /** Product info for sales mode */
  products?: Array<{
    name: string;
    category?: string | null;
    inStock?: boolean;
    discountCode?: string | null;
  }>;
  /** Business signals for Pidgie mode */
  signals?: {
    hasProducts?: boolean;
    hasServices?: boolean;
    hasBooking?: boolean;
    hasPricing?: boolean;
    hasFaq?: boolean;
    businessType?: string;
  };
  /** Website language for locale-aware suggestions (e.g., 'fr', 'en', 'ar') */
  locale?: string;
}

/**
 * Result of parsing LLM response for inline suggestions.
 */
export interface ParsedResponse {
  /** Clean text with suggestion tag removed */
  cleanText: string;
  /** Extracted suggestions (up to 3) */
  suggestions: string[];
}

/**
 * Configuration for card-aware prompt generation.
 * Extends SuggestionConfig with card-specific options.
 */
export interface CardPromptConfig extends SuggestionConfig {
  enableCards: boolean;
  cardTypes: ('product' | 'event' | 'service' | 'page')[];
  enableActions: boolean;
  maxCards?: number;
  /** When true, instructs LLM to use absolute URLs (https://store.com/...) instead of relative paths. Use for bots hosted on a different domain than the store. */
  absoluteUrls?: boolean;
}

