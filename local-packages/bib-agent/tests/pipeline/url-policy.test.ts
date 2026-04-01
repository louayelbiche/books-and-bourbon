/**
 * Tests for UrlPolicyEnforcer pipeline step
 *
 * Verifies URL removal policy:
 * - Absolute URLs (https://...) replaced with "[link removed]"
 * - Multiple URLs in same text all removed
 * - Relative paths (/about) preserved
 * - mailto: links preserved
 * - tel: links preserved
 * - Text without URLs passes through unchanged
 *
 * @see spec TASK-033
 */

import { describe, it, expect } from 'vitest';
import { UrlPolicyEnforcer } from '../../src/pipeline/steps/url-policy.js';
import { createTestPipelineContext } from './test-helpers.js';

const enforcer = new UrlPolicyEnforcer();

describe('UrlPolicyEnforcer', () => {
  it('has correct name and order', () => {
    expect(enforcer.name).toBe('url-policy');
    expect(enforcer.order).toBe(60);
  });

  // ---------------------------------------------------------------------------
  // Absolute URL removal
  // ---------------------------------------------------------------------------

  describe('absolute URL removal', () => {
    it('replaces https:// URL with "[link removed]"', () => {
      const result = enforcer.process(
        'Visit https://example.com for more info.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Visit [link removed] for more info.');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].severity).toBe('info');
      expect(result.flags[0].original).toBe('https://example.com');
    });

    it('replaces http:// URL with "[link removed]"', () => {
      const result = enforcer.process(
        'Go to http://old-site.com/page for details.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Go to [link removed] for details.');
      expect(result.flags).toHaveLength(1);
    });

    it('handles URLs with paths and query parameters', () => {
      const result = enforcer.process(
        'Check https://example.com/products?category=food&page=2 now.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Check [link removed] now.');
      expect(result.flags[0].original).toBe('https://example.com/products?category=food&page=2');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple URLs
  // ---------------------------------------------------------------------------

  describe('multiple URLs', () => {
    it('removes all absolute URLs in same text', () => {
      const result = enforcer.process(
        'Visit https://site-a.com and https://site-b.com for info.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Visit [link removed] and [link removed] for info.');
      expect(result.flags).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Preserved patterns
  // ---------------------------------------------------------------------------

  describe('preserved patterns', () => {
    it('preserves relative paths like /about', () => {
      const result = enforcer.process(
        'Navigate to /about for more details.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Navigate to /about for more details.');
      expect(result.flags).toHaveLength(0);
    });

    it('preserves mailto: links (do not match https? pattern)', () => {
      const result = enforcer.process(
        'Email us at mailto:info@example.com.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Email us at mailto:info@example.com.');
      expect(result.flags).toHaveLength(0);
    });

    it('preserves tel: links (do not match https? pattern)', () => {
      const result = enforcer.process(
        'Call tel:+1-555-0100.',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Call tel:+1-555-0100.');
      expect(result.flags).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // No URLs
  // ---------------------------------------------------------------------------

  describe('no URLs', () => {
    it('passes through text without URLs unchanged', () => {
      const result = enforcer.process(
        'Hello! How can we help you today?',
        createTestPipelineContext()
      );

      expect(result.text).toBe('Hello! How can we help you today?');
      expect(result.flags).toHaveLength(0);
    });
  });
});
