/**
 * Suggestion Parser
 *
 * Extracts inline [SUGGESTIONS: ...] tags from LLM responses.
 */

import type { ParsedResponse } from './types.js';

/**
 * Regex to match the suggestion tag at the end of a response.
 * Captures the pipe-separated suggestions inside the brackets.
 */
const SUGGESTION_TAG_REGEX = /\[SUGGESTIONS?:\s*([^\]]+)\]\s*$/i;

/**
 * Parse an LLM response to extract inline suggestions.
 *
 * Looks for a `[SUGGESTIONS: q1 | q2 | q3]` tag at the end of the text.
 * Returns clean text (tag removed) and extracted suggestions.
 *
 * If no tag is found, returns the original text with an empty suggestions array.
 */
export function parseSuggestions(rawText: string): ParsedResponse {
  const match = rawText.match(SUGGESTION_TAG_REGEX);

  if (!match) {
    return { cleanText: rawText, suggestions: [] };
  }

  const cleanText = rawText.slice(0, match.index).trimEnd();
  const suggestions = match[1]
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);

  return { cleanText, suggestions };
}
