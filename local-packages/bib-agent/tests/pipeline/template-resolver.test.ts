/**
 * Tests for TemplateResolverStep pipeline step
 *
 * Verifies resolution of {{metric:id}} placeholders:
 * - Resolves from toolResults
 * - Replaces unresolved with "[data unavailable]" + warning (EC-04)
 * - Multiple placeholders in same text
 * - Text without placeholders passes through unchanged
 *
 * @see spec TASK-033
 */

import { describe, it, expect } from 'vitest';
import { TemplateResolverStep } from '../../src/pipeline/steps/template-resolver.js';
import { createTestPipelineContext } from './test-helpers.js';

const resolver = new TemplateResolverStep();

describe('TemplateResolverStep', () => {
  it('has correct name and order', () => {
    expect(resolver.name).toBe('template-resolver');
    expect(resolver.order).toBe(40);
  });

  // ---------------------------------------------------------------------------
  // Resolution from toolResults
  // ---------------------------------------------------------------------------

  describe('resolution', () => {
    it('resolves {{metric:revenue}} when value is in toolResults', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('revenue', '$12,345');

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        'Your total revenue is {{metric:revenue}}.',
        ctx
      );

      expect(result.text).toBe('Your total revenue is $12,345.');
      expect(result.flags).toHaveLength(0);
    });

    it('resolves numeric values from toolResults', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('order_count', 42);

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        'You have {{metric:order_count}} orders.',
        ctx
      );

      expect(result.text).toBe('You have 42 orders.');
    });

    it('resolves zero values from toolResults', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('pending', 0);

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        '{{metric:pending}} pending items.',
        ctx
      );

      expect(result.text).toBe('0 pending items.');
      expect(result.flags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Unresolved placeholders (EC-04)
  // ---------------------------------------------------------------------------

  describe('unresolved placeholders', () => {
    it('replaces unresolved placeholder with "[data unavailable]"', () => {
      const ctx = createTestPipelineContext();
      const result = resolver.process(
        'Your revenue is {{metric:unknown_metric}}.',
        ctx
      );

      expect(result.text).toBe('Your revenue is [data unavailable].');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('warning');
      expect(result.flags[0].message).toContain('unknown_metric');
      expect(result.flags[0].original).toBe('{{metric:unknown_metric}}');
      expect(result.flags[0].replacement).toBe('[data unavailable]');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple placeholders
  // ---------------------------------------------------------------------------

  describe('multiple placeholders', () => {
    it('resolves multiple placeholders in same text', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('revenue', '$5,000');
      toolResults.set('orders', 25);

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        'Revenue: {{metric:revenue}}, Orders: {{metric:orders}}.',
        ctx
      );

      expect(result.text).toBe('Revenue: $5,000, Orders: 25.');
      expect(result.flags).toHaveLength(0);
    });

    it('handles mix of resolved and unresolved', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('revenue', '$5,000');

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        'Revenue: {{metric:revenue}}, Profit: {{metric:profit}}.',
        ctx
      );

      expect(result.text).toBe('Revenue: $5,000, Profit: [data unavailable].');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].message).toContain('profit');
    });
  });

  // ---------------------------------------------------------------------------
  // No placeholders
  // ---------------------------------------------------------------------------

  describe('no placeholders', () => {
    it('passes through text without placeholders unchanged', () => {
      const ctx = createTestPipelineContext();
      const result = resolver.process('Hello, how can I help you?', ctx);

      expect(result.text).toBe('Hello, how can I help you?');
      expect(result.flags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Null values in toolResults
  // ---------------------------------------------------------------------------

  describe('null values', () => {
    it('treats null toolResult value as unresolved', () => {
      const toolResults = new Map<string, unknown>();
      toolResults.set('revenue', null);

      const ctx = createTestPipelineContext({ toolResults });
      const result = resolver.process(
        'Revenue: {{metric:revenue}}.',
        ctx
      );

      expect(result.text).toBe('Revenue: [data unavailable].');
      expect(result.flags).toHaveLength(1);
    });
  });
});
