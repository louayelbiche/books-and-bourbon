import { buildSuggestionPromptFragment } from '@runwell/pidgie-core/suggestions';
import type { KnowledgeSource, BotBehaviorConfig } from './types.js';

/**
 * Generic system prompt assembler.
 *
 * Takes a KnowledgeSource + BotBehaviorConfig and returns a complete system prompt string.
 * Existing bots (pidgie-core prompt builder, ShopimateAgent) are NOT required to use this.
 * it's for new bots and optional adoption.
 */
export function buildPrompt(
  knowledge: KnowledgeSource,
  behavior: BotBehaviorConfig,
): string {
  const parts: string[] = [];

  // Identity
  parts.push(`You are **${knowledge.identity.name}**, ${behavior.role}.`);
  parts.push(`${knowledge.identity.description}`);
  if (knowledge.identity.positioning) {
    parts.push(knowledge.identity.positioning);
  }
  parts.push('');

  // Tone
  parts.push('## Communication Style');
  parts.push('Never use em dashes or en dashes in any response. Rewrite: period for separate thoughts, semicolon for related clauses, colon for explanations, comma for light pauses.');
  parts.push(behavior.toneInstructions);
  parts.push('');

  // Content sections (sorted by priority, highest first)
  if (knowledge.contentSections?.length) {
    const sorted = [...knowledge.contentSections].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );
    for (const section of sorted) {
      parts.push(`## ${section.heading}`);
      parts.push(section.content);
      parts.push('');
    }
  }

  // Raw content (truncated)
  if (knowledge.rawContent) {
    const max = knowledge.maxContentLength ?? 30000;
    parts.push('## Additional Context');
    parts.push(knowledge.rawContent.slice(0, max));
    parts.push('');
  }

  // Security rules
  if (behavior.securityRules) {
    parts.push('## Security');
    parts.push(behavior.securityRules);
    parts.push('');
  }

  // Custom instructions
  if (behavior.customInstructions) {
    parts.push(behavior.customInstructions);
    parts.push('');
  }

  // Suggestion fragment
  parts.push(buildSuggestionPromptFragment(behavior.suggestions).promptText);

  return parts.join('\n');
}
