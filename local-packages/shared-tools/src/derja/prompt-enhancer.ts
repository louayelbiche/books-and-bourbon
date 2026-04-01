/**
 * Derja-aware prompt enhancement utilities.
 *
 * Injects Tunisian Arabic (Derja) specific instructions into system prompts
 * so that LLM agents respond in Derja when the visitor writes in Derja,
 * rather than defaulting to Modern Standard Arabic.
 */

import type { DerjaPromptConfig } from './types.js';

// =============================================================================
// Prompt sections
// =============================================================================

const DERJA_RULES_FULL = `## TUNISIAN ARABIC (DERJA) RULES
When the visitor writes in Tunisian Arabic (Derja), you MUST respond in Tunisian Derja, NOT Modern Standard Arabic (MSA/Fusha).

### How to detect Derja
Derja markers include:
- Words: باش (besh), فما (famma), برشا (barsha), كيفاش (kifesh), علاش (alesh), توا (tawa), ياسر (yaser)
- Negation pattern: ما...ش wrapping verbs (e.g. ما فهمتش, ما نجمش)
- French loanwords in Arabic script: نورمال, ميرسي, بونجور
- Arabizi (Latin-script): bech, 5ater, 7ata, barsha, 9a3ed

### Key differences from MSA
- "I want" = نحب (nheb) in Derja vs. أريد (urid) in MSA
- "There is" = فما (famma) in Derja vs. يوجد (yujad) in MSA
- "Now" = توا (tawa) in Derja vs. الآن (al-aan) in MSA
- "A lot" = برشا (barsha) / ياسر (yaser) in Derja vs. كثيرا (kathiran) in MSA
- "How" = كيفاش (kifesh) in Derja vs. كيف (kayf) in MSA
- "Why" = علاش (alesh) in Derja vs. لماذا (limadha) in MSA

### Rules
1. If the visitor writes in Derja, respond entirely in Derja
2. If the visitor writes in MSA, respond in MSA
3. If unsure whether input is Derja or MSA, match the visitor's style as closely as possible
4. Never mix MSA formal structures with Derja vocabulary
5. Derja visitors may also use French words; this is normal and acceptable`;

const DERJA_RULES_COMPACT = `## TUNISIAN ARABIC (DERJA) RULES
When the visitor writes in Tunisian Derja, respond in Derja, NOT Modern Standard Arabic.
Derja markers: باش, فما, برشا, كيفاش, ما...ش negation, French loanwords in Arabic script.
If unsure whether input is Derja or MSA, match the visitor's style.`;

const DERJA_EXAMPLES = `

### Example Derja phrases
- "أحكيلي على الخدمات متاعكم" (Tell me about your services)
- "كيفاش نجم نحجز موعد؟" (How can I book an appointment?)
- "شحال الثمن؟" (How much does it cost?)
- "فما عروض خاصة توا؟" (Are there special offers now?)`;

// =============================================================================
// Public API
// =============================================================================

/**
 * Get Derja-specific language rules for injection into a system prompt.
 *
 * @param config - Optional configuration. Defaults to enabled with full examples.
 * @returns A prompt section string with Derja instructions.
 */
export function getDerjaLanguageRules(config?: DerjaPromptConfig): string {
  const enabled = config?.enableDerja ?? true;
  if (!enabled) return '';

  let rules = config?.derjaExamples === false ? DERJA_RULES_COMPACT : DERJA_RULES_FULL;

  if (config?.derjaExamples !== false) {
    rules += DERJA_EXAMPLES;
  }

  return rules;
}

/**
 * Enhance a base system prompt with Derja-aware language instructions.
 *
 * If the prompt already contains a generic Arabic language rule, the Derja
 * section is appended after it to refine the behavior. The generic rule
 * is NOT removed; the Derja section adds specificity on top.
 *
 * @param basePrompt - The original system prompt string.
 * @param config - Optional Derja configuration.
 * @returns The enhanced prompt with Derja instructions appended.
 */
export function enhancePromptWithDerja(
  basePrompt: string,
  config?: DerjaPromptConfig
): string {
  const derjaRules = getDerjaLanguageRules(config);
  if (!derjaRules) return basePrompt;

  // Insert after the LANGUAGE RULES section if it exists
  const languageRulesEnd = basePrompt.indexOf('## LANGUAGE RULES (MANDATORY)');
  if (languageRulesEnd !== -1) {
    // Find the end of the language rules section (next ## heading or end of string)
    const nextSection = basePrompt.indexOf('\n## ', languageRulesEnd + 1);
    const insertPoint = nextSection !== -1 ? nextSection : basePrompt.length;
    return basePrompt.slice(0, insertPoint) + '\n\n' + derjaRules + basePrompt.slice(insertPoint);
  }

  // No language rules section found; append at the end
  return basePrompt + '\n\n' + derjaRules;
}
