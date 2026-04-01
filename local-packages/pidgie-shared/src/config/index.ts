/**
 * Product configuration types for pidgie-powered demo apps.
 *
 * Each product (pidgie-demo, shopimate-landing) provides its own config
 * implementing these interfaces to customize behavior.
 */

import type { CardTheme } from '@runwell/card-system/types';

export interface ChatWidgetTheme {
  fab: { bg: string; hover: string; icon: string };
  panel: { bg: string; border: string; width: string; height: string };
  header: { bg: string; text: string; subtext: string };
  userBubble: { bg: string; text: string; radius: string };
  assistantBubble: { bg: string; text: string; border: string; radius: string };
  suggestion: { bg: string; text: string; border: string; hoverBg: string; hoverText: string };
  input: { bg: string; border: string; text: string; placeholder: string; focusBorder: string };
  sendButton: { bg: string; text: string; disabledBg: string; disabledText: string };
  typingDot: string;
  linkColor: string;
  /** Optional: minimized preview card (defaults derived from panel + assistantBubble if omitted) */
  minimizedPreview?: { bg: string; text: string; border: string };
  /** Optional: card theme for interactive cards (defaults applied if omitted) */
  card?: CardTheme;
}

export type SuggestionMode = 'pidgie' | 'sales';

export interface ProductConfig {
  /** Product name displayed in headers */
  name: string;
  /** Suggestion mode passed to pidgie-core */
  suggestionMode: SuggestionMode;
  /** Chat widget theme */
  theme: ChatWidgetTheme;
  /** Voice API path (relative) */
  voiceApiPath: string;
  /** Chat API path (relative) */
  chatApiPath: string;
  /** Session API path (relative) */
  sessionApiPath: string;
  /** Scrape API path (relative) */
  scrapeApiPath: string;
  /** Label shown under assistant name */
  poweredByLabel: string;
  /** Empty state message */
  emptyStateMessage: (businessName: string) => string;
}
