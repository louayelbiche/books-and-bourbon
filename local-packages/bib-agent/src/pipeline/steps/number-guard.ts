/**
 * NumberGuardStep — Pipeline Step (Order 50, Opt-in)
 *
 * Detects potentially hallucinated numbers in response text.
 * Numbers that appear in `ctx.allowedValues` are considered legitimate
 * (sourced from tool results). All other numbers are flagged and
 * replaced with "[data unavailable]".
 *
 * Safe patterns (always allowed): ordinals, years, times, dates,
 * and small integers (0-10) in non-financial context.
 *
 * STANDALONE implementation — does NOT import from @runwell/bib-ai-advisor.
 *
 * @see spec TASK-033
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from '../types.js';

// =============================================================================
// Constants
// =============================================================================

/** Safe patterns that are always allowed */
const SAFE_PATTERNS: RegExp[] = [
  /\b(?:1st|2nd|3rd|\d+th)\b/,         // ordinals
  /\b\d{4}\b/,                           // years (4-digit)
  /\b\d{1,2}:\d{2}\b/,                  // times
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,     // dates
  /\b\d{1,2}\s+(?:am|pm)\b/i,           // time with am/pm
];

/**
 * Patterns to find numbers in text, ordered from most specific to least.
 * More specific patterns are checked first. Once a range is claimed by a
 * more specific pattern, less specific patterns skip that range.
 */
const NUMBER_PATTERNS: RegExp[] = [
  /\$[\d,]+(?:\.\d+)?/g,                 // currency ($500, $1,234.56)
  /[\d,]+(?:\.\d+)?%/g,                  // percentage (56.78%, 100%)
  /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g,  // formatted number with commas (12,345)
  /\b\d+\.\d+\b/g,                       // decimal (56.78)
  /\b\d+\b/g,                            // plain integer
];

// =============================================================================
// Match with position tracking
// =============================================================================

interface NumberMatch {
  text: string;
  start: number;
  end: number;
}

// =============================================================================
// NumberGuardStep Implementation
// =============================================================================

export class NumberGuardStep implements PipelineStep {
  name = 'number-guard';
  order = 50;

  process(text: string, ctx: PipelineContext): PipelineResult {
    const flags: PipelineFlag[] = [];
    let result = text;

    // Find all numbers with position tracking (specific → general, no overlaps)
    const matches = this.findNumbers(text);

    // Process from end to start so replacements don't shift indices
    const sortedMatches = [...matches].sort((a, b) => b.start - a.start);

    for (const match of sortedMatches) {
      if (this.isSafe(match.text)) continue;
      if (this.isAllowed(match.text, ctx.allowedValues)) continue;

      // Hallucinated number — flag and replace
      flags.push({
        step: this.name,
        severity: 'critical',
        message: `Potentially hallucinated number: ${match.text}`,
        original: match.text,
        replacement: '[data unavailable]',
      });

      result =
        result.substring(0, match.start) +
        '[data unavailable]' +
        result.substring(match.end);
    }

    return { text: result, flags };
  }

  /**
   * Find all number-like strings in text with position tracking.
   * More specific patterns take priority — overlapping sub-matches are skipped.
   */
  private findNumbers(text: string): NumberMatch[] {
    const claimed: NumberMatch[] = [];

    for (const pattern of NUMBER_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;

      while ((m = regex.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;

        // Skip if this range overlaps with an already-claimed range
        const overlaps = claimed.some(
          (c) => start < c.end && end > c.start
        );

        if (!overlaps) {
          claimed.push({ text: m[0], start, end });
        }
      }
    }

    return claimed;
  }

  /**
   * Check if a match is a safe pattern (always allowed).
   */
  private isSafe(match: string): boolean {
    for (const pattern of SAFE_PATTERNS) {
      if (pattern.test(match)) return true;
    }

    // Small integers (0-10) in non-financial context
    const num = parseFloat(match.replace(/[$%,]/g, ''));
    if (!isNaN(num) && num >= 0 && num <= 10 && !match.includes('$') && !match.includes('%')) {
      return true;
    }

    return false;
  }

  /**
   * Check if a match appears in allowed values (from tool results).
   * Tries exact match, comma-stripped, and symbol-stripped variations.
   */
  private isAllowed(match: string, allowedValues: Set<string>): boolean {
    if (allowedValues.has(match)) return true;

    const normalized = match.replace(/,/g, '');
    if (allowedValues.has(normalized)) return true;

    const stripped = normalized.replace(/[$%+]/g, '');
    if (allowedValues.has(stripped)) return true;

    return false;
  }
}
