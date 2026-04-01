/**
 * Configurable knowledge prompt builder.
 * Concatenates base prompt with knowledge context, using the business's
 * corpus label instead of hardcoded domain references.
 */
export class KnowledgePromptBuilder {
  /**
   * Build the full system prompt with optional knowledge context.
   * @param basePrompt - The existing system prompt (business info, security rules, etc.)
   * @param knowledgeContext - XML source tags from PreSearch
   * @param corpusLabel - Human-readable label for the knowledge source (e.g. "Company Handbook", "Product Documentation")
   * @param citationInstruction - Optional custom citation instruction. Defaults to generic.
   */
  static build(
    basePrompt: string,
    knowledgeContext?: string,
    corpusLabel?: string,
    citationInstruction?: string,
  ): string {
    if (!knowledgeContext) return basePrompt;

    const label = corpusLabel || 'knowledge base';
    const citation = citationInstruction ||
      'When referencing this material, cite the section or title so the user can look it up.';

    return `${basePrompt}\n\n## REFERENCE MATERIAL\nBelow are excerpts from the ${label} provided as <source> tags. Each tag has a \`section\` attribute and a \`title\` attribute. ${citation} If they contain information related to the topic, provide that information. Only say you cannot answer if the sources are completely unrelated to the question.\n\n${knowledgeContext}`;
  }
}
