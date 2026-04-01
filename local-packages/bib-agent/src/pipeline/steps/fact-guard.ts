/**
 * FactGuard — Pipeline Step (Order 10, Mandatory)
 *
 * Detects fabricated claims about missing business data.
 * For each field in _meta.missingFields, checks if the response text
 * makes claims that imply the data exists. If found, replaces the
 * matched portion with "[not available yet]" and raises a critical flag.
 *
 * Bypass (EC-12): If the matched text also appears within a tool result
 * string, it is considered legitimate and skipped.
 *
 * @see spec TASK-029
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Claim Patterns by Field
// =============================================================================

/**
 * Maps DataContext field paths to regex patterns that indicate
 * fabricated claims about that field.
 */
const FIELD_CLAIM_PATTERNS: Record<string, RegExp[]> = {
  hours: [
    /(?:open|closed?)\s+(?:at|from|every|on|daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  ],
  'contact.phone': [/(?:\(\d{3}\)|\d{3}[-.])\s*\d{3}/],
  'contact.address': [/(?:located at|find us at|our address is|we'?re at)\s+\d+/i],
  services: [/(?:we offer|our services include|we provide|our services are)\b/i],
  products: [/(?:our menu includes|we serve|we carry|our products include)\b/i],
  'brand.voice': [/(?:our values are|our mission is|we believe in)\b/i],
  'brand.identity': [/(?:our brand (?:is|represents)|our logo|our colors are)\b/i],
};

// =============================================================================
// FactGuard Implementation
// =============================================================================

export class FactGuard implements PipelineStep {
  name = 'fact-guard';
  order = 10;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];
    let result = text;
    const toolStrings = getToolResultStrings(ctx.toolResults);
    const missingFields = ctx.dataContext._meta.missingFields;

    for (const field of missingFields) {
      const patterns = this.getPatternsForField(field);
      if (!patterns || patterns.length === 0) continue;

      for (const pattern of patterns) {
        const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
        let match: RegExpExecArray | null;

        // Reset regex state
        regex.lastIndex = 0;

        while ((match = regex.exec(result)) !== null) {
          const matched = match[0];

          // EC-12: bypass if the matched text appears in tool results
          if (isInToolResults(matched, toolStrings)) {
            continue;
          }

          flags.push({
            step: this.name,
            severity: 'critical',
            message: `Fabricated claim about missing field "${field}": "${matched}"`,
            original: matched,
            replacement: '[not available yet]',
          });

          result = result.replace(matched, '[not available yet]');
          // Reset regex since string changed
          regex.lastIndex = 0;
        }
      }
    }

    return { text: result, flags };
  }

  /**
   * Get patterns for a field, including parent path matching.
   * e.g., "contact.phone" matches patterns for both "contact.phone" and "contact"
   */
  private getPatternsForField(field: string): RegExp[] {
    const patterns: RegExp[] = [];

    // Exact match
    if (FIELD_CLAIM_PATTERNS[field]) {
      patterns.push(...FIELD_CLAIM_PATTERNS[field]);
    }

    // Parent path match (e.g., "contact" for "contact.phone")
    const parts = field.split('.');
    if (parts.length > 1) {
      const parent = parts[0];
      if (FIELD_CLAIM_PATTERNS[parent]) {
        patterns.push(...FIELD_CLAIM_PATTERNS[parent]);
      }
    }

    return patterns;
  }
}

// =============================================================================
// Tool Result String Extraction (EC-12 Bypass)
// =============================================================================

/**
 * Extract all string values from tool results for bypass checking.
 */
function getToolResultStrings(toolResults: Map<string, unknown>): Set<string> {
  const strings = new Set<string>();
  for (const result of toolResults.values()) {
    extractStrings(result, strings);
  }
  return strings;
}

/**
 * Recursively extract string values from objects/arrays.
 */
function extractStrings(value: unknown, strings: Set<string>): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    strings.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractStrings(item, strings);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      extractStrings(v, strings);
    }
  }
}

/**
 * Check if a matched text appears within any tool result string.
 */
function isInToolResults(matched: string, toolStrings: Set<string>): boolean {
  for (const str of toolStrings) {
    if (str.includes(matched)) {
      return true;
    }
  }
  return false;
}
