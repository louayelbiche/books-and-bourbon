/**
 * Tests for ResponsePipeline orchestrator
 *
 * Verifies:
 * - Steps execute in order by `order` field
 * - Text chains between steps (EC-08)
 * - Flags collected from all steps
 * - Step error handled (ERR-04)
 * - addStep() / removeStep() / getSteps()
 * - Empty pipeline returns text unchanged
 *
 * @see spec TASK-025
 */

import { describe, it, expect } from 'vitest';
import { ResponsePipeline } from '../../src/pipeline/response-pipeline.js';
import type { PipelineStep, PipelineContext, PipelineResult } from '../../src/pipeline/types.js';
import { createTestPipelineContext } from './test-helpers.js';

// =============================================================================
// Mock Steps
// =============================================================================

function createMockStep(
  name: string,
  order: number,
  transform: (text: string) => string = (t) => t,
  flags: { severity: 'info' | 'warning' | 'critical'; message: string }[] = []
): PipelineStep {
  return {
    name,
    order,
    process(text: string, ctx: PipelineContext): PipelineResult {
      return {
        text: transform(text),
        flags: flags.map((f) => ({ step: name, ...f })),
      };
    },
  };
}

function createThrowingStep(name: string, order: number, errorMsg: string): PipelineStep {
  return {
    name,
    order,
    process(): PipelineResult {
      throw new Error(errorMsg);
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ResponsePipeline', () => {
  // ---------------------------------------------------------------------------
  // Step execution order
  // ---------------------------------------------------------------------------

  describe('step execution order', () => {
    it('executes steps in ascending order by `order` field', () => {
      const order: string[] = [];
      const stepA = createMockStep('step-a', 30, (t) => { order.push('a'); return t + '[a]'; });
      const stepB = createMockStep('step-b', 10, (t) => { order.push('b'); return t + '[b]'; });
      const stepC = createMockStep('step-c', 20, (t) => { order.push('c'); return t + '[c]'; });

      const pipeline = new ResponsePipeline([stepA, stepB, stepC]);
      const result = pipeline.process('start', createTestPipelineContext());

      expect(order).toEqual(['b', 'c', 'a']);
      expect(result.text).toBe('start[b][c][a]');
    });

    it('handles steps with same order (stable order)', () => {
      const stepA = createMockStep('step-a', 10, (t) => t + '[a]');
      const stepB = createMockStep('step-b', 10, (t) => t + '[b]');

      const pipeline = new ResponsePipeline([stepA, stepB]);
      const result = pipeline.process('start', createTestPipelineContext());

      // Both should execute; order among same-order is insertion order
      expect(result.text).toContain('[a]');
      expect(result.text).toContain('[b]');
    });
  });

  // ---------------------------------------------------------------------------
  // Text chaining (EC-08)
  // ---------------------------------------------------------------------------

  describe('text chaining (EC-08)', () => {
    it('chains text output from step A as input to step B', () => {
      const stepA = createMockStep('upper', 10, (t) => t.toUpperCase());
      const stepB = createMockStep('append', 20, (t) => t + '!');

      const pipeline = new ResponsePipeline([stepA, stepB]);
      const result = pipeline.process('hello', createTestPipelineContext());

      expect(result.text).toBe('HELLO!');
    });
  });

  // ---------------------------------------------------------------------------
  // Flag collection
  // ---------------------------------------------------------------------------

  describe('flag collection', () => {
    it('collects flags from all steps', () => {
      const stepA = createMockStep('step-a', 10, (t) => t, [
        { severity: 'info', message: 'Info from A' },
      ]);
      const stepB = createMockStep('step-b', 20, (t) => t, [
        { severity: 'warning', message: 'Warning from B' },
        { severity: 'critical', message: 'Critical from B' },
      ]);

      const pipeline = new ResponsePipeline([stepA, stepB]);
      const result = pipeline.process('text', createTestPipelineContext());

      expect(result.flags).toHaveLength(3);
      expect(result.flags[0]).toMatchObject({ step: 'step-a', severity: 'info' });
      expect(result.flags[1]).toMatchObject({ step: 'step-b', severity: 'warning' });
      expect(result.flags[2]).toMatchObject({ step: 'step-b', severity: 'critical' });
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling (ERR-04)
  // ---------------------------------------------------------------------------

  describe('error handling (ERR-04)', () => {
    it('catches step error, adds warning flag, continues with previous text', () => {
      const stepA = createMockStep('step-a', 10, (t) => t + '[a]');
      const stepFail = createThrowingStep('step-fail', 20, 'boom');
      const stepC = createMockStep('step-c', 30, (t) => t + '[c]');

      const pipeline = new ResponsePipeline([stepA, stepFail, stepC]);
      const result = pipeline.process('start', createTestPipelineContext());

      // Text should be from step-a output, then step-c (step-fail skipped)
      expect(result.text).toBe('start[a][c]');

      // Should have a warning flag for the failure
      const failFlag = result.flags.find((f) => f.step === 'step-fail');
      expect(failFlag).toBeDefined();
      expect(failFlag!.severity).toBe('warning');
      expect(failFlag!.message).toContain('boom');
    });

    it('handles non-Error thrown values', () => {
      const step: PipelineStep = {
        name: 'string-thrower',
        order: 10,
        process(): PipelineResult {
          throw 'raw string error';
        },
      };

      const pipeline = new ResponsePipeline([step]);
      const result = pipeline.process('text', createTestPipelineContext());

      expect(result.text).toBe('text');
      expect(result.flags[0].message).toContain('raw string error');
    });
  });

  // ---------------------------------------------------------------------------
  // addStep
  // ---------------------------------------------------------------------------

  describe('addStep()', () => {
    it('adds step and sorts by order', () => {
      const pipeline = new ResponsePipeline([
        createMockStep('first', 10),
        createMockStep('third', 30),
      ]);

      pipeline.addStep(createMockStep('second', 20));

      expect(pipeline.getSteps()).toEqual(['first', 'second', 'third']);
    });
  });

  // ---------------------------------------------------------------------------
  // removeStep
  // ---------------------------------------------------------------------------

  describe('removeStep()', () => {
    it('removes step by name', () => {
      const pipeline = new ResponsePipeline([
        createMockStep('keep', 10),
        createMockStep('remove-me', 20),
        createMockStep('also-keep', 30),
      ]);

      pipeline.removeStep('remove-me');

      expect(pipeline.getSteps()).toEqual(['keep', 'also-keep']);
    });

    it('does nothing if name not found', () => {
      const pipeline = new ResponsePipeline([createMockStep('a', 10)]);
      pipeline.removeStep('nonexistent');
      expect(pipeline.getSteps()).toEqual(['a']);
    });
  });

  // ---------------------------------------------------------------------------
  // getSteps
  // ---------------------------------------------------------------------------

  describe('getSteps()', () => {
    it('returns ordered step names', () => {
      const pipeline = new ResponsePipeline([
        createMockStep('c', 30),
        createMockStep('a', 10),
        createMockStep('b', 20),
      ]);

      expect(pipeline.getSteps()).toEqual(['a', 'b', 'c']);
    });
  });

  // ---------------------------------------------------------------------------
  // Empty pipeline
  // ---------------------------------------------------------------------------

  describe('empty pipeline', () => {
    it('returns text unchanged with no flags', () => {
      const pipeline = new ResponsePipeline();
      const result = pipeline.process('hello world', createTestPipelineContext());

      expect(result.text).toBe('hello world');
      expect(result.flags).toEqual([]);
    });
  });
});
