/**
 * Tests for ToolRegistry
 *
 * Verifies:
 * - Singleton pattern
 * - Tool registration and retrieval
 * - getCoreTools by name
 * - getByTier filtering
 * - ToolNotFoundError (ERR-02)
 * - DuplicateToolError
 * - Concurrent lookups safety (EC-10)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ToolRegistry,
  ToolNotFoundError,
  DuplicateToolError,
} from '../src/tools/registry.js';
import type { BibTool } from '../src/tools/types.js';
import type { CoreToolName } from '../src/tools/registry.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockTool(overrides?: Partial<BibTool>): BibTool {
  return {
    name: 'mock_tool',
    description: 'A mock tool',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    tier: 'core',
    execute: async () => ({ result: 'mock' }),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ToolRegistry', () => {
  beforeEach(() => {
    ToolRegistry.resetInstance();
  });

  // ---------------------------------------------------------------------------
  // Singleton pattern
  // ---------------------------------------------------------------------------

  describe('singleton', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = ToolRegistry.getInstance();
      const instance2 = ToolRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('returns a fresh instance after reset', () => {
      const instance1 = ToolRegistry.getInstance();
      instance1.register(createMockTool({ name: 'tool_a' }));

      ToolRegistry.resetInstance();

      const instance2 = ToolRegistry.getInstance();
      expect(instance2).not.toBe(instance1);
      expect(instance2.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  describe('register', () => {
    it('registers a single tool', () => {
      const registry = ToolRegistry.getInstance();
      const tool = createMockTool({ name: 'get_business_info' });

      registry.register(tool);

      expect(registry.has('get_business_info')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('throws DuplicateToolError on duplicate registration', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(createMockTool({ name: 'get_services' }));

      expect(() => {
        registry.register(createMockTool({ name: 'get_services' }));
      }).toThrow(DuplicateToolError);
    });

    it('DuplicateToolError includes tool name', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(createMockTool({ name: 'duplicate_tool' }));

      try {
        registry.register(createMockTool({ name: 'duplicate_tool' }));
      } catch (err) {
        expect(err).toBeInstanceOf(DuplicateToolError);
        expect((err as DuplicateToolError).toolName).toBe('duplicate_tool');
        expect((err as DuplicateToolError).message).toContain('duplicate_tool');
      }
    });
  });

  describe('registerAll', () => {
    it('registers multiple tools at once', () => {
      const registry = ToolRegistry.getInstance();
      const tools = [
        createMockTool({ name: 'tool_a' }),
        createMockTool({ name: 'tool_b' }),
        createMockTool({ name: 'tool_c' }),
      ];

      registry.registerAll(tools);

      expect(registry.size).toBe(3);
      expect(registry.has('tool_a')).toBe(true);
      expect(registry.has('tool_b')).toBe(true);
      expect(registry.has('tool_c')).toBe(true);
    });

    it('throws on duplicate within batch', () => {
      const registry = ToolRegistry.getInstance();
      const tools = [
        createMockTool({ name: 'tool_a' }),
        createMockTool({ name: 'tool_a' }),
      ];

      expect(() => registry.registerAll(tools)).toThrow(DuplicateToolError);
    });
  });

  // ---------------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------------

  describe('get', () => {
    it('returns the registered tool', () => {
      const registry = ToolRegistry.getInstance();
      const tool = createMockTool({ name: 'get_faqs' });
      registry.register(tool);

      const retrieved = registry.get('get_faqs');
      expect(retrieved).toBe(tool);
      expect(retrieved.name).toBe('get_faqs');
    });

    it('throws ToolNotFoundError for unknown tool (ERR-02)', () => {
      const registry = ToolRegistry.getInstance();

      expect(() => registry.get('nonexistent_tool')).toThrow(ToolNotFoundError);
    });

    it('ToolNotFoundError includes tool name', () => {
      const registry = ToolRegistry.getInstance();

      try {
        registry.get('unknown_tool');
      } catch (err) {
        expect(err).toBeInstanceOf(ToolNotFoundError);
        expect((err as ToolNotFoundError).toolName).toBe('unknown_tool');
        expect((err as ToolNotFoundError).message).toContain('unknown_tool');
      }
    });
  });

  describe('getCoreTools', () => {
    it('returns requested core tools in order', () => {
      const registry = ToolRegistry.getInstance();
      const tools = [
        createMockTool({ name: 'get_business_info', tier: 'core' }),
        createMockTool({ name: 'get_services', tier: 'core' }),
        createMockTool({ name: 'get_faqs', tier: 'core' }),
      ];
      registry.registerAll(tools);

      const result = registry.getCoreTools([
        'get_faqs' as CoreToolName,
        'get_business_info' as CoreToolName,
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('get_faqs');
      expect(result[1].name).toBe('get_business_info');
    });

    it('throws ToolNotFoundError if any tool is missing', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(createMockTool({ name: 'get_business_info', tier: 'core' }));

      expect(() => {
        registry.getCoreTools([
          'get_business_info' as CoreToolName,
          'get_services' as CoreToolName,
        ]);
      }).toThrow(ToolNotFoundError);
    });
  });

  // ---------------------------------------------------------------------------
  // Tier filtering
  // ---------------------------------------------------------------------------

  describe('getByTier', () => {
    it('returns only tools of the requested tier', () => {
      const registry = ToolRegistry.getInstance();
      registry.registerAll([
        createMockTool({ name: 'core_1', tier: 'core' }),
        createMockTool({ name: 'core_2', tier: 'core' }),
        createMockTool({ name: 'domain_1', tier: 'domain' }),
        createMockTool({ name: 'ext_1', tier: 'extension' }),
      ]);

      const coreTools = registry.getByTier('core');
      expect(coreTools).toHaveLength(2);
      expect(coreTools.every((t) => t.tier === 'core')).toBe(true);

      const domainTools = registry.getByTier('domain');
      expect(domainTools).toHaveLength(1);
      expect(domainTools[0].name).toBe('domain_1');

      const extTools = registry.getByTier('extension');
      expect(extTools).toHaveLength(1);
      expect(extTools[0].name).toBe('ext_1');
    });

    it('returns empty array for tier with no tools', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(createMockTool({ name: 'core_1', tier: 'core' }));

      expect(registry.getByTier('extension')).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Utility methods
  // ---------------------------------------------------------------------------

  describe('has', () => {
    it('returns true for registered tool', () => {
      const registry = ToolRegistry.getInstance();
      registry.register(createMockTool({ name: 'exists' }));

      expect(registry.has('exists')).toBe(true);
    });

    it('returns false for unregistered tool', () => {
      const registry = ToolRegistry.getInstance();

      expect(registry.has('does_not_exist')).toBe(false);
    });
  });

  describe('getRegisteredNames', () => {
    it('returns all registered tool names', () => {
      const registry = ToolRegistry.getInstance();
      registry.registerAll([
        createMockTool({ name: 'tool_a' }),
        createMockTool({ name: 'tool_b' }),
      ]);

      const names = registry.getRegisteredNames();
      expect(names).toContain('tool_a');
      expect(names).toContain('tool_b');
      expect(names).toHaveLength(2);
    });
  });

  describe('size', () => {
    it('returns 0 for empty registry', () => {
      const registry = ToolRegistry.getInstance();
      expect(registry.size).toBe(0);
    });

    it('returns correct count after registration', () => {
      const registry = ToolRegistry.getInstance();
      registry.registerAll([
        createMockTool({ name: 'a' }),
        createMockTool({ name: 'b' }),
        createMockTool({ name: 'c' }),
      ]);
      expect(registry.size).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Concurrent safety (EC-10)
  // ---------------------------------------------------------------------------

  describe('concurrent lookups', () => {
    it('handles concurrent lookups without corruption', async () => {
      const registry = ToolRegistry.getInstance();
      const toolNames = Array.from({ length: 50 }, (_, i) => `tool_${i}`);

      // Register 50 tools
      for (const name of toolNames) {
        registry.register(createMockTool({ name }));
      }

      // Concurrent lookups
      const results = await Promise.all(
        toolNames.map((name) =>
          Promise.resolve(registry.get(name))
        )
      );

      expect(results).toHaveLength(50);
      for (let i = 0; i < 50; i++) {
        expect(results[i].name).toBe(`tool_${i}`);
      }
    });
  });
});
