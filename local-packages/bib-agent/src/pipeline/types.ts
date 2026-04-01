/**
 * Pipeline Type Definitions
 *
 * Interfaces for the post-generation response verification chain.
 * PipelineSteps are ordered by `order` field and process text sequentially.
 *
 * @see spec TASK-025
 */

import type { DataContext } from '../context/types.js';

// =============================================================================
// Pipeline Step Interface
// =============================================================================

/**
 * A single step in the response pipeline.
 *
 * Steps are sorted by `order` (ascending) before execution.
 * Each step receives the current text and context, and returns
 * potentially modified text plus flags.
 */
export interface PipelineStep {
  /** Unique name for this step (used in flags and removeStep) */
  name: string;
  /** Execution order — lower runs first */
  order: number;
  /** Process the text and return result with flags */
  process(text: string, ctx: PipelineContext): PipelineResult;
}

// =============================================================================
// Pipeline Context
// =============================================================================

/**
 * Context passed to each pipeline step.
 *
 * Contains the DataContext (for field checks), tool results
 * (for bypass logic), allowed values (for NumberGuard), and
 * the original user message.
 */
export interface PipelineContext {
  /** The loaded business DataContext with _meta */
  dataContext: DataContext;
  /** Tool results captured during this chat turn (name → result) */
  toolResults: Map<string, unknown>;
  /** Set of allowed numeric string values from tool results */
  allowedValues: Set<string>;
  /** The original user message for this chat turn */
  originalMessage: string;
}

// =============================================================================
// Pipeline Result
// =============================================================================

/**
 * Result from a pipeline step or the full pipeline.
 */
export interface PipelineResult {
  /** The (potentially modified) text */
  text: string;
  /** Flags raised during processing */
  flags: PipelineFlag[];
}

// =============================================================================
// Pipeline Flag
// =============================================================================

/**
 * A flag raised by a pipeline step during processing.
 *
 * Severities:
 * - info: informational, no action needed (e.g., URL removed)
 * - warning: potential issue, text may or may not be modified (e.g., voice violation)
 * - critical: hallucination detected, text was modified (e.g., fabricated data replaced)
 */
export interface PipelineFlag {
  /** Name of the step that raised this flag */
  step: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Human-readable description of the issue */
  message: string;
  /** The original text that was flagged (if applicable) */
  original?: string;
  /** The replacement text (if applicable) */
  replacement?: string;
}
