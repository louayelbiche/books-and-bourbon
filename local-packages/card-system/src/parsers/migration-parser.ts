/**
 * Migration-Aware Response Parser
 *
 * When CARD_TOOL_MIGRATION is enabled:
 *   - Extracts only [SUGGESTIONS:] from LLM text
 *   - Ignores [CARDS] and [ACTIONS] tags (cards come from DB via tools)
 *   - Any [CARDS]/[ACTIONS] tags left in text are stripped but not parsed
 *
 * When CARD_TOOL_MIGRATION is disabled:
 *   - Full parseStructuredResponse behavior (extracts cards, actions, suggestions)
 */

import type { StructuredChatResponse } from '../types.js';
import { parseStructuredResponse } from './card-parser.js';
import { isCardToolMigrationEnabled, toMigrationFallbackEvent } from '../validation/migration-flag.js';

const CARDS_TAG_REGEX = /\[CARDS\]\s*[\s\S]*?\s*\[\/CARDS\]/i;
const ACTIONS_TAG_REGEX = /\[ACTIONS\]\s*[\s\S]*?\s*\[\/ACTIONS\]/i;
const SUGGESTIONS_TAG_REGEX = /\[SUGGESTIONS?:\s*([^\]]+)\]\s*$/i;

/**
 * Parse LLM response with migration awareness.
 *
 * @param rawText - Raw LLM response text
 * @param agentType - Agent type for EVT-07 tracking (optional)
 * @param onFallback - Callback fired when legacy path is used (EVT-07)
 */
export function parseMigrationAwareResponse(
  rawText: string,
  agentType?: string,
  onFallback?: (event: ReturnType<typeof toMigrationFallbackEvent>) => void,
): StructuredChatResponse {
  if (isCardToolMigrationEnabled()) {
    // Migration ON: only extract suggestions, strip any lingering [CARDS]/[ACTIONS] tags
    let text = rawText;

    // Strip [CARDS] tags if LLM generated them despite not being instructed to
    text = text.replace(CARDS_TAG_REGEX, '').trim();
    text = text.replace(ACTIONS_TAG_REGEX, '').trim();

    // Extract suggestions
    let suggestions: string[] = [];
    const suggestionsMatch = text.match(SUGGESTIONS_TAG_REGEX);
    if (suggestionsMatch) {
      text = text.replace(SUGGESTIONS_TAG_REGEX, '').trim();
      suggestions = suggestionsMatch[1]
        .split('|')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    return { text, cards: [], actions: [], suggestions };
  }

  // Migration OFF: full legacy parsing
  if (onFallback && agentType) {
    onFallback(toMigrationFallbackEvent(agentType, 'flag_off'));
  }

  return parseStructuredResponse(rawText);
}
