/**
 * ResponsePipeline — Post-generation verification chain
 *
 * Orchestrates PipelineSteps in order, chaining text between steps
 * and collecting flags from all steps.
 *
 * Error handling (ERR-04): If a step throws, the error is caught,
 * a warning flag is added, and processing continues with the
 * previous text (before the failing step).
 *
 * @see spec TASK-025
 */

import type { PipelineStep, PipelineContext, PipelineResult, PipelineFlag } from './types.js';

export class ResponsePipeline {
  private steps: PipelineStep[];

  constructor(steps: PipelineStep[] = []) {
    this.steps = [...steps].sort((a, b) => a.order - b.order);
  }

  /**
   * Process text through all steps in order.
   *
   * Each step receives the output of the previous step.
   * Flags are collected from all steps.
   * If a step throws, a warning flag is added and processing continues.
   */
  process(text: string, ctx: PipelineContext): PipelineResult {
    let currentText = text;
    const allFlags: PipelineFlag[] = [];

    for (const step of this.steps) {
      try {
        const result = step.process(currentText, ctx);
        currentText = result.text;
        allFlags.push(...result.flags);
      } catch (error) {
        // ERR-04: step error — skip, add flag, continue with previous text
        allFlags.push({
          step: step.name,
          severity: 'warning',
          message: `Step "${step.name}" failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return { text: currentText, flags: allFlags };
  }

  /**
   * Add a step to the pipeline. Steps are re-sorted by order.
   */
  addStep(step: PipelineStep): void {
    this.steps.push(step);
    this.steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Remove a step by name.
   */
  removeStep(name: string): void {
    this.steps = this.steps.filter((s) => s.name !== name);
  }

  /**
   * Get ordered list of step names.
   */
  getSteps(): string[] {
    return this.steps.map((s) => s.name);
  }
}
