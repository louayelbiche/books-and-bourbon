import type { CitationCheckResult, GroundedContext } from '../types/engine.js';

/**
 * Extract section references from an LLM response.
 * Handles patterns like:
 * - "Section 162(a)"
 * - "IRC Section 162"
 * - "Sec. 501(c)(3)"
 * - "per 162(a)"
 * - "under section 163"
 */
function extractSectionReferences(text: string): string[] {
  const patterns = [
    /(?:IRC\s+)?(?:Section|Sec\.?)\s+(\d+[A-Za-z]?(?:\([a-z0-9]+\))*)/gi,
    /(?:per|under|see)\s+(\d+[A-Za-z]?(?:\([a-z0-9]+\))+)/gi,
    /\u00A7\s*(\d+[A-Za-z]?(?:\([a-z0-9]+\))*)/g, // § symbol
  ];

  const refs = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      refs.add(normalizeSection(match[1]));
    }
  }

  return [...refs];
}

/**
 * Normalize a section reference for comparison.
 * Strips whitespace, lowercases subsection letters.
 */
function normalizeSection(section: string): string {
  return section.trim().replace(/\s+/g, '');
}

/**
 * Check whether a cited section matches any of the available sections.
 * Handles partial matches: "162" matches "162(a)".
 */
function sectionMatches(cited: string, available: string[]): boolean {
  const normalized = normalizeSection(cited);
  return available.some((a) => {
    const normA = normalizeSection(a);
    // Exact match
    if (normA === normalized) return true;
    // The cited section is a parent of an available section
    // e.g., cited "162" matches available "162(a)"
    if (normA.startsWith(normalized)) return true;
    // The cited section is a child of an available section
    // e.g., cited "162(a)(1)" matches available "162(a)"
    if (normalized.startsWith(normA)) return true;
    return false;
  });
}

/**
 * Verify that all citations in an LLM response match the retrieved context.
 * Returns which citations are valid, hallucinated, or unverifiable.
 */
export function verifyCitations(
  response: string,
  context: GroundedContext
): CitationCheckResult {
  const cited = extractSectionReferences(response);

  if (cited.length === 0) {
    return {
      valid: [],
      hallucinated: [],
      unverifiable: [],
      allValid: true,
    };
  }

  const valid: string[] = [];
  const hallucinated: string[] = [];
  const unverifiable: string[] = [];

  for (const ref of cited) {
    if (context.availableSections.length === 0) {
      // No sections in context; can't verify
      unverifiable.push(ref);
    } else if (sectionMatches(ref, context.availableSections)) {
      valid.push(ref);
    } else {
      hallucinated.push(ref);
    }
  }

  return {
    valid,
    hallucinated,
    unverifiable,
    allValid: hallucinated.length === 0,
  };
}
