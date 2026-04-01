/**
 * Tests for DataContext _extensions support
 *
 * Verifies:
 * - _extensions values are accessible on DataContext
 * - computeMeta: _extensions NOT in missingFields or emptyCollections
 * - serializeDataContext: _extensions serialized as "## Extensions" section
 * - serializeDataContext: nested objects serialized as JSON
 * - serializeDataContext: absent _extensions → no "## Extensions" section
 * - Object spread with _extensions works (updateDataContext pattern)
 * - buildBibSystemPrompt: _extensions appears in final prompt
 */

import { describe, it, expect } from 'vitest';
import { computeMeta } from '../../src/context/meta.js';
import {
  serializeDataContext,
  buildBibSystemPrompt,
} from '../../src/prompt/system-prompt-builder.js';
import type { DataContext } from '../../src/context/types.js';

// =============================================================================
// Test Helper
// =============================================================================

function createBaseDataContext(
  extensions?: Record<string, unknown>
): DataContext {
  const base: Omit<DataContext, '_meta'> = {
    tenantId: 'ext-test-tenant',
    tenantName: 'Extensions Test Business',
    business: {
      name: 'Extensions Test Business',
      category: 'retail',
      description: 'A test business for extensions',
      industry: 'retail',
    },
    contact: {
      phone: '555-1234',
      email: 'test@example.com',
      address: null,
      socialMedia: null,
    },
    hours: null,
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: { scraped: null, url: null, publishStatus: null },
    brand: { voice: null, identity: null },
    ...(extensions !== undefined ? { _extensions: extensions } : {}),
  };

  const meta = computeMeta(base);

  return {
    ...base,
    _meta: meta,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('DataContext _extensions', () => {
  // ---------------------------------------------------------------------------
  // Basic accessibility
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('_extensions values are accessible on DataContext', () => {
      const ctx = createBaseDataContext({
        customFeature: 'enabled',
        maxRetries: 3,
      });

      expect(ctx._extensions).toBeDefined();
      expect(ctx._extensions!.customFeature).toBe('enabled');
      expect(ctx._extensions!.maxRetries).toBe(3);
    });

    it('_extensions is undefined when not set', () => {
      const ctx = createBaseDataContext();

      expect(ctx._extensions).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // computeMeta: _extensions excluded
  // ---------------------------------------------------------------------------

  describe('computeMeta', () => {
    it('_extensions NOT in missingFields', () => {
      const ctx = createBaseDataContext({ foo: 'bar' });

      expect(ctx._meta.missingFields).not.toContain('_extensions');
    });

    it('_extensions NOT in emptyCollections', () => {
      const ctx = createBaseDataContext({ foo: 'bar' });

      expect(ctx._meta.emptyCollections).not.toContain('_extensions');
    });

    it('_extensions NOT in availableFields', () => {
      const ctx = createBaseDataContext({ foo: 'bar' });

      expect(ctx._meta.availableFields).not.toContain('_extensions');
    });

    it('absent _extensions does not appear in any meta classification', () => {
      const ctx = createBaseDataContext();

      const allClassified = [
        ...ctx._meta.availableFields,
        ...ctx._meta.missingFields,
        ...ctx._meta.emptyCollections,
      ];

      expect(allClassified).not.toContain('_extensions');
    });
  });

  // ---------------------------------------------------------------------------
  // serializeDataContext
  // ---------------------------------------------------------------------------

  describe('serializeDataContext', () => {
    it('serializes _extensions as "## Extensions" section with key:value pairs', () => {
      const ctx = createBaseDataContext({
        cardSystemVersion: '2.0',
        panelLayout: 'grid',
      });

      const serialized = serializeDataContext(ctx);

      expect(serialized).toContain('## Extensions');
      expect(serialized).toContain('cardSystemVersion: 2.0');
      expect(serialized).toContain('panelLayout: grid');
    });

    it('serializes nested objects as JSON', () => {
      const ctx = createBaseDataContext({
        config: { theme: 'dark', maxCards: 10 },
      });

      const serialized = serializeDataContext(ctx);

      expect(serialized).toContain('## Extensions');
      expect(serialized).toContain('config: {"theme":"dark","maxCards":10}');
    });

    it('absent _extensions → no "## Extensions" section', () => {
      const ctx = createBaseDataContext();

      const serialized = serializeDataContext(ctx);

      expect(serialized).not.toContain('## Extensions');
    });

    it('empty _extensions object → no "## Extensions" section', () => {
      const ctx = createBaseDataContext({});

      const serialized = serializeDataContext(ctx);

      expect(serialized).not.toContain('## Extensions');
    });
  });

  // ---------------------------------------------------------------------------
  // Object spread (updateDataContext pattern)
  // ---------------------------------------------------------------------------

  describe('updateDataContext via object spread', () => {
    it('spreading partial with _extensions works', () => {
      const original = createBaseDataContext({ featureA: true });
      const partial = { _extensions: { featureA: true, featureB: 'new' } };

      const updated: DataContext = { ...original, ...partial };

      expect(updated._extensions).toEqual({ featureA: true, featureB: 'new' });
      // Original fields preserved
      expect(updated.tenantId).toBe('ext-test-tenant');
      expect(updated.business.name).toBe('Extensions Test Business');
    });

    it('spreading without _extensions preserves existing _extensions', () => {
      const original = createBaseDataContext({ keepMe: 'yes' });
      const partial = { tenantName: 'Updated Name' };

      const updated: DataContext = { ...original, ...partial };

      expect(updated._extensions).toEqual({ keepMe: 'yes' });
      expect(updated.tenantName).toBe('Updated Name');
    });
  });

  // ---------------------------------------------------------------------------
  // buildBibSystemPrompt: _extensions in final prompt
  // ---------------------------------------------------------------------------

  describe('buildBibSystemPrompt', () => {
    it('_extensions appears in final prompt when present', () => {
      const ctx = createBaseDataContext({
        agentMode: 'advanced',
        customGreeting: 'Welcome!',
      });

      const prompt = buildBibSystemPrompt('You are a helpful assistant.', ctx, 'dashboard');

      expect(prompt).toContain('## Extensions');
      expect(prompt).toContain('agentMode: advanced');
      expect(prompt).toContain('customGreeting: Welcome!');
    });

    it('_extensions absent → no Extensions section in final prompt', () => {
      const ctx = createBaseDataContext();

      const prompt = buildBibSystemPrompt('You are a helpful assistant.', ctx, 'dashboard');

      expect(prompt).not.toContain('## Extensions');
    });
  });
});
