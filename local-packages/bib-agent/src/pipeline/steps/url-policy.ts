/**
 * UrlPolicyEnforcer — Pipeline Step (Order 60, Opt-in)
 *
 * Removes absolute URLs (http:// and https://) from response text.
 * Replaces them with "[link removed]" and raises an info flag.
 *
 * Relative paths (e.g., /about) are preserved.
 * mailto: and tel: links are preserved (they don't match the https? pattern).
 *
 * @see spec TASK-033
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Constants
// =============================================================================

const ABSOLUTE_URL_PATTERN = /https?:\/\/[^\s)]+/g;

// =============================================================================
// UrlPolicyEnforcer Implementation
// =============================================================================

export class UrlPolicyEnforcer implements PipelineStep {
  name = 'url-policy';
  order = 60;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];

    const result = text.replace(ABSOLUTE_URL_PATTERN, (match) => {
      flags.push({
        step: this.name,
        severity: 'info',
        message: `Absolute URL removed: ${match}`,
        original: match,
        replacement: '[link removed]',
      });
      return '[link removed]';
    });

    return { text: result, flags };
  }
}
