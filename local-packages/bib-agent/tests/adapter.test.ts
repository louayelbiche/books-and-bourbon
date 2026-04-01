/**
 * Tests for toBibAgentTool adapter
 *
 * Verifies:
 * - BibTool → AgentTool conversion
 * - Lazy context injection (not at registration time)
 * - Name, description, parameters preservation
 * - Execute delegates to BibTool with correct context
 */

import { describe, it, expect, vi } from 'vitest';
import { toBibAgentTool } from '../src/tools/adapter.js';
import type { BibTool, BibToolContext } from '../src/tools/types.js';
import type { DataContext } from '../src/context/types.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockDataContext(overrides?: Partial<DataContext>): DataContext {
  return {
    tenantId: 'test-tenant',
    tenantName: 'Test Business',
    business: {
      name: 'Test Business',
      category: 'service',
      description: 'A test business',
      industry: 'technology',
    },
    contact: {
      phone: '+1234567890',
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
    website: {
      scraped: null,
      url: null,
      publishStatus: null,
    },
    brand: {
      voice: null,
      identity: null,
    },
    _meta: {
      availableFields: ['business.name', 'contact.phone'],
      missingFields: ['hours', 'services'],
      emptyCollections: ['services', 'products', 'faqs', 'promotions'],
      lastUpdated: new Date().toISOString(),
    },
    ...overrides,
  };
}

function createMockBibToolContext(overrides?: Partial<BibToolContext>): BibToolContext {
  return {
    dataContext: createMockDataContext(),
    tenantId: 'test-tenant',
    mode: 'dashboard',
    ...overrides,
  };
}

function createMockBibTool(overrides?: Partial<BibTool>): BibTool {
  return {
    name: 'test_tool',
    description: 'A test tool',
    parameters: {
      type: 'object',
      properties: {
        arg1: { type: 'string', description: 'An argument' },
      },
      required: ['arg1'],
    },
    tier: 'core',
    execute: vi.fn().mockResolvedValue({ result: 'success' }),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('toBibAgentTool', () => {
  it('preserves tool name', () => {
    const bibTool = createMockBibTool({ name: 'get_business_info' });
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    expect(agentTool.name).toBe('get_business_info');
  });

  it('preserves tool description', () => {
    const bibTool = createMockBibTool({ description: 'Get business information' });
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    expect(agentTool.description).toBe('Get business information');
  });

  it('preserves tool parameters', () => {
    const params = {
      type: 'object' as const,
      properties: {
        include_address: { type: 'boolean' as const, description: 'Include address' },
        limit: { type: 'number' as const, description: 'Max results' },
      },
      required: ['include_address'],
    };
    const bibTool = createMockBibTool({ parameters: params });
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    expect(agentTool.parameters).toEqual(params);
  });

  it('produces an AgentTool with an execute function', () => {
    const bibTool = createMockBibTool();
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    expect(typeof agentTool.execute).toBe('function');
  });

  it('calls BibTool.execute with provided args and context', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: 'test' });
    const bibTool = createMockBibTool({ execute: mockExecute });
    const ctx = createMockBibToolContext();
    const agentTool = toBibAgentTool(bibTool, () => ctx);

    await agentTool.execute({ arg1: 'value1' }, {} as any);

    expect(mockExecute).toHaveBeenCalledWith({ arg1: 'value1' }, ctx);
  });

  it('returns the result from BibTool.execute', async () => {
    const bibTool = createMockBibTool({
      execute: vi.fn().mockResolvedValue({ name: 'Test Business' }),
    });
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    const result = await agentTool.execute({ arg1: 'test' }, {} as any);

    expect(result).toEqual({ name: 'Test Business' });
  });

  it('injects context LAZILY (not at registration time)', async () => {
    const contextProvider = vi.fn().mockReturnValue(createMockBibToolContext());
    const bibTool = createMockBibTool();
    const agentTool = toBibAgentTool(bibTool, contextProvider);

    // Context provider should NOT be called at registration time
    expect(contextProvider).not.toHaveBeenCalled();

    // Context provider should be called when execute runs
    await agentTool.execute({ arg1: 'test' }, {} as any);
    expect(contextProvider).toHaveBeenCalledTimes(1);
  });

  it('gets fresh context on each execution', async () => {
    let callCount = 0;
    const contextProvider = () => {
      callCount++;
      return createMockBibToolContext({
        tenantId: `tenant-${callCount}`,
      });
    };

    const mockExecute = vi.fn().mockResolvedValue('ok');
    const bibTool = createMockBibTool({ execute: mockExecute });
    const agentTool = toBibAgentTool(bibTool, contextProvider);

    await agentTool.execute({ arg1: 'first' }, {} as any);
    expect(mockExecute).toHaveBeenLastCalledWith(
      { arg1: 'first' },
      expect.objectContaining({ tenantId: 'tenant-1' })
    );

    await agentTool.execute({ arg1: 'second' }, {} as any);
    expect(mockExecute).toHaveBeenLastCalledWith(
      { arg1: 'second' },
      expect.objectContaining({ tenantId: 'tenant-2' })
    );
  });

  it('propagates errors from BibTool.execute', async () => {
    const bibTool = createMockBibTool({
      execute: vi.fn().mockRejectedValue(new Error('Tool failed')),
    });
    const agentTool = toBibAgentTool(bibTool, () => createMockBibToolContext());

    await expect(agentTool.execute({ arg1: 'test' }, {} as any)).rejects.toThrow('Tool failed');
  });
});
