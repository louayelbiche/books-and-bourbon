/**
 * Prompt Builder Module
 *
 * Builds dynamic system prompts for the Pidgie agent.
 *
 * @example
 * ```typescript
 * import { buildSystemPrompt } from '@runwell/pidgie-core/prompt';
 *
 * const prompt = buildSystemPrompt({
 *   website: scrapedWebsite,
 *   config: { tone: 'friendly' },
 * });
 * ```
 */

export {
  buildSystemPrompt,
  buildSystemPromptLegacy,
  getToneInstructions,
  getBusinessTypeDescription,
  getProactiveToolGuidelines,
  getLanguageRules,
  getSecurityRules,
  getDemoModeFragment,
} from './prompt-builder.js';

export type {
  AgentConfig,
  SystemPromptContext,
  PromptBuilderOptions,
} from './types.js';
