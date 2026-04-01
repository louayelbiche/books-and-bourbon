/**
 * Suggestions Module
 *
 * Shared follow-up suggestion system for sales and Pidgie modes.
 *
 * @example
 * ```typescript
 * import {
 *   parseSuggestions,
 *   buildSuggestionPromptFragment,
 *   generateInitialSuggestions,
 * } from '@runwell/pidgie-core/suggestions';
 *
 * // Append to system prompt
 * const fragment = buildSuggestionPromptFragment('sales');
 * const systemPrompt = basePrompt + fragment.promptText;
 *
 * // Parse LLM response
 * const { cleanText, suggestions } = parseSuggestions(rawResponse);
 *
 * // Generate initial starters
 * const starters = generateInitialSuggestions({
 *   businessName: 'My Store',
 *   mode: 'sales',
 *   products: [{ name: 'T-Shirt', category: 'Apparel' }],
 * });
 * ```
 */

export { parseSuggestions } from './parser.js';
export { buildSuggestionPromptFragment, buildCardPromptFragment } from './prompt-fragment.js';
export { generateInitialSuggestions } from './initial.js';
export { parseStructuredResponse, parseMigrationAwareResponse } from '@runwell/card-system/parsers';

export type {
  SuggestionMode,
  SuggestionPerspective,
  SuggestionConfig,
  CardPromptConfig,
  InitialSuggestionContext,
  ParsedResponse,
} from './types.js';
