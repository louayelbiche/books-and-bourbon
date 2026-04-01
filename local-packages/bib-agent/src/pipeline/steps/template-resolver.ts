/**
 * TemplateResolverStep — Pipeline Step (Order 40, Opt-in)
 *
 * Resolves {{metric:metricId}} placeholders in response text.
 * Looks up values in toolResults by metricId key.
 * Unresolved placeholders are replaced with "[data unavailable]"
 * and a warning flag is raised.
 *
 * STANDALONE implementation — does NOT import from @runwell/bib-ai-advisor
 * to avoid circular dependencies.
 *
 * @see spec TASK-033
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Constants
// =============================================================================

const PLACEHOLDER_REGEX = /\{\{metric:([a-zA-Z0-9_]+)\}\}/g;

// =============================================================================
// TemplateResolverStep Implementation
// =============================================================================

export class TemplateResolverStep implements PipelineStep {
  name = 'template-resolver';
  order = 40;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];

    const resolved = text.replace(PLACEHOLDER_REGEX, (match, metricId: string) => {
      // Check toolResults for the metric value
      const value = ctx.toolResults.get(metricId);
      if (value !== undefined && value !== null) {
        return String(value);
      }

      // Unresolved — replace with fallback and flag
      flags.push({
        step: this.name,
        severity: 'warning',
        message: `Unresolved placeholder: {{metric:${metricId}}}`,
        original: match,
        replacement: '[data unavailable]',
      });
      return '[data unavailable]';
    });

    return { text: resolved, flags };
  }
}
