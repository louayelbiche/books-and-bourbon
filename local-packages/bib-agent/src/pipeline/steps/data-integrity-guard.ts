/**
 * DataIntegrityGuard — Pipeline Step (Order 30, Mandatory)
 *
 * Catches implicit data claims that FactGuard might miss.
 * Looks for patterns like "we are closed" (when hours is null),
 * "we don't have any services" (when services is missing),
 * "we have 0 products" (when products is empty).
 *
 * Replaces matched text with a placeholder and raises critical flags.
 *
 * @see spec TASK-029
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Integrity Patterns
// =============================================================================

interface IntegrityPattern {
  pattern: RegExp;
  /** Field in missingFields or emptyCollections */
  field: string;
  /** Whether to check missingFields or emptyCollections */
  type: 'missing' | 'empty';
  /** Replacement text */
  replacement: string;
  /** Whether field uses a dynamic capture group */
  dynamicField?: boolean;
}

const INTEGRITY_PATTERNS: IntegrityPattern[] = [
  {
    pattern: /(?:we are |we're |currently )closed/i,
    field: 'hours',
    type: 'missing',
    replacement: '[hours not configured yet]',
  },
  {
    pattern: /(?:we (?:don'?t|do not) have (?:any )?)(services|products|faqs|promotions)/i,
    field: '$1',
    type: 'missing',
    replacement: '[not configured yet]',
    dynamicField: true,
  },
  {
    pattern: /(?:we have |there are )(?:0|zero) (services|products|items|faqs)/i,
    field: '$1',
    type: 'empty',
    replacement: '[none configured yet]',
    dynamicField: true,
  },
];

// =============================================================================
// DataIntegrityGuard Implementation
// =============================================================================

export class DataIntegrityGuard implements PipelineStep {
  name = 'data-integrity-guard';
  order = 30;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];
    let result = text;
    const { missingFields, emptyCollections } = ctx.dataContext._meta;

    for (const entry of INTEGRITY_PATTERNS) {
      const regex = new RegExp(entry.pattern.source, entry.pattern.flags + (entry.pattern.flags.includes('g') ? '' : 'g'));
      let match: RegExpExecArray | null;

      regex.lastIndex = 0;

      while ((match = regex.exec(result)) !== null) {
        // Resolve dynamic field from capture group
        const resolvedField = entry.dynamicField && match[1]
          ? match[1].toLowerCase()
          : entry.field;

        // Check if the field is in the appropriate list
        const fieldList = entry.type === 'missing' ? missingFields : emptyCollections;
        const isTriggered = fieldList.some(
          (f) => f === resolvedField || f.endsWith(`.${resolvedField}`)
        );

        if (!isTriggered) continue;

        const matched = match[0];

        flags.push({
          step: this.name,
          severity: 'critical',
          message: `Data integrity violation for "${resolvedField}": "${matched}"`,
          original: matched,
          replacement: entry.replacement,
        });

        result = result.replace(matched, entry.replacement);
        // Reset regex since string changed
        regex.lastIndex = 0;
      }
    }

    return { text: result, flags };
  }
}
