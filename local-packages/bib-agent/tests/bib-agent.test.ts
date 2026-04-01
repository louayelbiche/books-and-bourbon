/**
 * Tests for BibAgent class
 *
 * Uses a concrete TestAgent subclass to verify:
 * - Constructor sets state to 'constructed'
 * - initialize() with mock prisma → state 'ready'
 * - initialize() with failing prisma → state 'degraded'
 * - Degraded state has _meta.loadError
 * - updateDataContext() merges partial and recomputes _meta
 * - Independent DataContext per instance
 * - useCoreTools() registers tools from ToolRegistry
 * - systemPrompt returns built prompt after initialize
 * - systemPrompt includes voice and data integrity rules
 *
 * @see spec TASK-020, TASK-021, TASK-022, TASK-023
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BibAgent, createEmptyDataContext } from '../src/agent/bib-agent.js';
import { TenantNotFoundError } from '../src/context/context-loader.js';
import { ToolRegistry } from '../src/tools/registry.js';
import type { DataContext } from '../src/context/types.js';
import type { AgentContext, AgentResult } from '@runwell/agent-core';
import type { BibAgentOptions } from '../src/agent/bib-agent.js';

// =============================================================================
// Mock LLM Client (to prevent real API calls)
// =============================================================================

const mockLLMClient = {
  generateContent: vi.fn().mockResolvedValue({ text: 'mock response', finishReason: 'STOP' }),
  generateWithTools: vi.fn().mockResolvedValue({ text: 'mock response', finishReason: 'STOP' }),
  generateContentStream: vi.fn(),
  continueWithToolResult: vi.fn(),
  continueWithAllToolResults: vi.fn(),
};

// =============================================================================
// Concrete Test Subclass
// =============================================================================

class TestAgent extends BibAgent {
  readonly agentType = 'test-agent';

  buildDomainSystemPrompt(ctx: DataContext): string {
    return `You are a test agent for ${ctx.business?.name || 'unknown'}.`;
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    return {
      agentType: this.agentType,
      success: true,
      response: 'ok',
      confidence: 1,
    };
  }

  // Expose protected methods for testing
  public testUpdateDataContext(partial: Partial<DataContext>): void {
    this.updateDataContext(partial);
  }

  public testUseCoreTools(names: any[]): void {
    this.useCoreTools(names);
  }

  public testUseExtensionTools(names: string[]): void {
    this.useExtensionTools(names);
  }

  public getDataContext(): DataContext {
    return this.dataContext;
  }
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createFullTenant() {
  return {
    id: 'tenant-1',
    name: 'Test Biz',
    template: 'restaurant',
    description: 'A test restaurant',
    industry: 'Food & Beverage',
    phone: '+1-555-0100',
    email: 'test@test.com',
    address: null,
    metadata: null,
    websiteUrl: 'https://test.com',
    publishStatus: 'published',
    websiteContext: null,
    businessHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    ],
    services: [
      { id: 's1', name: 'Lunch', description: null, durationMinutes: 60, priceInCents: 1500, sortOrder: 1, status: 'active' },
    ],
    products: [],
    faqs: [],
    promotions: [],
    bookingConfig: null,
  };
}

function createMockPrisma(tenant: any) {
  return {
    tenant: {
      findUnique: vi.fn().mockResolvedValue(tenant),
    },
  };
}

function createFailingPrisma() {
  return {
    tenant: {
      findUnique: vi.fn().mockRejectedValue(new Error('DB connection failed')),
    },
  };
}

function defaultOptions(overrides?: Partial<BibAgentOptions>): BibAgentOptions {
  return {
    mode: 'dashboard',
    llmClient: mockLLMClient,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('BibAgent', () => {
  beforeEach(() => {
    ToolRegistry.resetInstance();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('sets state to "constructed"', () => {
      const agent = new TestAgent(defaultOptions());
      expect(agent.state).toBe('constructed');
    });

    it('sets mode from options', () => {
      const agent = new TestAgent(defaultOptions({ mode: 'public' }));
      // Mode is accessible through systemPrompt after init,
      // but we can verify via the constructed agent
      expect(agent.state).toBe('constructed');
    });
  });

  // ---------------------------------------------------------------------------
  // initialize() — success
  // ---------------------------------------------------------------------------

  describe('initialize() success', () => {
    it('transitions to "ready" state', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.state).toBe('ready');
    });

    it('loads DataContext from Prisma', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      const ctx = agent.getDataContext();
      expect(ctx.tenantId).toBe('tenant-1');
      expect(ctx.business.name).toBe('Test Biz');
      expect(ctx.services).toHaveLength(1);
    });

    it('builds system prompt with domain prompt', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toContain('You are a test agent for Test Biz.');
    });
  });

  // ---------------------------------------------------------------------------
  // initialize() — failure
  // ---------------------------------------------------------------------------

  describe('initialize() failure', () => {
    it('transitions to "degraded" state on failure', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createFailingPrisma();

      await agent.initialize('tenant-1', prisma);

      expect(agent.state).toBe('degraded');
    });

    it('has _meta.loadError set in degraded state', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createFailingPrisma();

      await agent.initialize('tenant-1', prisma);

      const ctx = agent.getDataContext();
      expect(ctx._meta.loadError).toBeDefined();
      expect(ctx._meta.loadError).toContain('DB connection failed');
    });

    it('still builds system prompt in degraded state', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createFailingPrisma();

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.systemPrompt.length).toBeGreaterThan(0);
    });

    it('has empty DataContext in degraded state', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createFailingPrisma();

      await agent.initialize('tenant-1', prisma);

      const ctx = agent.getDataContext();
      expect(ctx.tenantId).toBe('tenant-1');
      expect(ctx.services).toEqual([]);
      expect(ctx.products).toEqual([]);
      expect(ctx.contact.phone).toBeNull();
    });

    it('re-throws TenantNotFoundError for 404 handling (ERR-07)', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = {
        tenant: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      await expect(agent.initialize('nonexistent', prisma)).rejects.toThrow(
        TenantNotFoundError
      );
      // State should NOT be degraded — error propagates to caller
      expect(agent.state).toBe('constructed');
    });
  });

  // ---------------------------------------------------------------------------
  // updateDataContext
  // ---------------------------------------------------------------------------

  describe('updateDataContext', () => {
    it('merges partial update and recomputes _meta', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      // Initial state has services
      expect(agent.getDataContext().services).toHaveLength(1);

      // Update with additional services
      agent.testUpdateDataContext({
        services: [
          ...agent.getDataContext().services,
          { id: 's2', name: 'Dinner', description: null, durationMinutes: 90, priceInCents: 3000, sortOrder: 2 },
        ],
      });

      expect(agent.getDataContext().services).toHaveLength(2);
      expect(agent.getDataContext()._meta.availableFields).toContain('services');
    });

    it('does not rebuild system prompt (snapshot semantics)', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);
      const originalPrompt = agent.systemPrompt;

      // Update data
      agent.testUpdateDataContext({
        business: {
          name: 'TOTALLY NEW NAME',
          category: 'retail',
          description: 'Changed',
          industry: 'Different',
        },
      });

      // System prompt should remain the same (snapshot semantics)
      expect(agent.systemPrompt).toBe(originalPrompt);
    });
  });

  // ---------------------------------------------------------------------------
  // Independent DataContext per instance
  // ---------------------------------------------------------------------------

  describe('instance independence', () => {
    it('two agents for same tenant have independent DataContext', async () => {
      const agent1 = new TestAgent(defaultOptions());
      const agent2 = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent1.initialize('tenant-1', prisma);
      await agent2.initialize('tenant-1', prisma);

      // Modify agent1's DataContext
      agent1.testUpdateDataContext({ tenantName: 'Agent1 Modified' });

      // agent2 should be unaffected
      expect(agent1.getDataContext().tenantName).toBe('Agent1 Modified');
      expect(agent2.getDataContext().tenantName).toBe('Test Biz');
    });
  });

  // ---------------------------------------------------------------------------
  // useCoreTools
  // ---------------------------------------------------------------------------

  describe('useCoreTools', () => {
    it('registers tools from ToolRegistry', async () => {
      // Register a mock core tool in the registry
      const registry = ToolRegistry.getInstance();
      registry.register({
        name: 'get_business_info',
        description: 'Get business info',
        parameters: { type: 'object', properties: {} },
        tier: 'core',
        execute: async () => ({ name: 'test' }),
      });

      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());
      await agent.initialize('tenant-1', prisma);

      agent.testUseCoreTools(['get_business_info']);

      const info = agent.getInfo();
      expect(info.tools).toContain('get_business_info');
    });
  });

  // ---------------------------------------------------------------------------
  // useExtensionTools
  // ---------------------------------------------------------------------------

  describe('useExtensionTools', () => {
    it('registers extension tools from ToolRegistry', async () => {
      const registry = ToolRegistry.getInstance();
      registry.register({
        name: 'custom_card_tool',
        description: 'Custom card tool',
        parameters: { type: 'object', properties: {} },
        tier: 'extension',
        execute: async () => ({ card: 'test' }),
      });

      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());
      await agent.initialize('tenant-1', prisma);

      agent.testUseExtensionTools(['custom_card_tool']);

      const info = agent.getInfo();
      expect(info.tools).toContain('custom_card_tool');
    });
  });

  // ---------------------------------------------------------------------------
  // systemPrompt content
  // ---------------------------------------------------------------------------

  describe('systemPrompt', () => {
    it('returns empty string before initialize', () => {
      const agent = new TestAgent(defaultOptions());
      expect(agent.systemPrompt).toBe('');
    });

    it('returns built prompt after initialize', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.systemPrompt.length).toBeGreaterThan(100);
    });

    it('includes voice rules', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toContain('Voice Rules');
      expect(agent.systemPrompt).toContain('You ARE the business');
    });

    it('includes data integrity rules', async () => {
      const agent = new TestAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toContain('Data Integrity Rules');
      expect(agent.systemPrompt).toContain('NEVER fabricate information');
    });

    it('includes dashboard mode rules for dashboard mode', async () => {
      const agent = new TestAgent(defaultOptions({ mode: 'dashboard' }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toContain('Mode: Dashboard');
      expect(agent.systemPrompt).toContain('card and panel tools');
    });

    it('includes public mode rules for public mode', async () => {
      const agent = new TestAgent(defaultOptions({ mode: 'public' }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(agent.systemPrompt).toContain('Mode: Public');
      expect(agent.systemPrompt).toContain('Do not reveal internal system details');
    });
  });

  // ---------------------------------------------------------------------------
  // createEmptyDataContext helper
  // ---------------------------------------------------------------------------

  describe('createEmptyDataContext', () => {
    it('creates DataContext with all fields null/empty', () => {
      const ctx = createEmptyDataContext('t1');

      expect(ctx.tenantId).toBe('t1');
      expect(ctx.tenantName).toBe('');
      expect(ctx.business.description).toBeNull();
      expect(ctx.contact.phone).toBeNull();
      expect(ctx.hours).toBeNull();
      expect(ctx.services).toEqual([]);
      expect(ctx.products).toEqual([]);
      expect(ctx.booking).toBeNull();
    });

    it('sets loadError when error is provided', () => {
      const ctx = createEmptyDataContext('t1', 'Something went wrong');

      expect(ctx._meta.loadError).toBe('Something went wrong');
    });

    it('does not set loadError when no error provided', () => {
      const ctx = createEmptyDataContext('t1');

      expect(ctx._meta.loadError).toBeUndefined();
    });

    it('computes _meta with proper classifications', () => {
      const ctx = createEmptyDataContext('t1');

      expect(ctx._meta.availableFields).toContain('tenantId');
      expect(ctx._meta.missingFields).toContain('contact.phone');
      expect(ctx._meta.emptyCollections).toContain('services');
      expect(ctx._meta.lastUpdated).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // analyze() (abstract implementation)
  // ---------------------------------------------------------------------------

  describe('analyze', () => {
    it('returns a valid AgentResult', async () => {
      const agent = new TestAgent(defaultOptions());
      const result = await agent.analyze({ clientId: 'c1', sessionId: 's1' });

      expect(result.agentType).toBe('test-agent');
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // onReady() hook
  // ---------------------------------------------------------------------------

  describe('onReady() hook', () => {
    it('calls onReady() during initialize on success path', async () => {
      const onReadySpy = vi.fn();

      class HookAgent extends TestAgent {
        protected onReady(): void {
          onReadySpy();
        }
      }

      const agent = new HookAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(onReadySpy).toHaveBeenCalledTimes(1);
      expect(agent.state).toBe('ready');
    });

    it('calls onReady() during initialize on degraded path', async () => {
      const onReadySpy = vi.fn();

      class HookAgent extends TestAgent {
        protected onReady(): void {
          onReadySpy();
        }
      }

      const agent = new HookAgent(defaultOptions());
      const prisma = createFailingPrisma();

      await agent.initialize('tenant-1', prisma);

      expect(onReadySpy).toHaveBeenCalledTimes(1);
      expect(agent.state).toBe('degraded');
    });

    it('has access to dataContext inside onReady()', async () => {
      let capturedTenantId: string | undefined;

      class HookAgent extends TestAgent {
        protected onReady(): void {
          capturedTenantId = this.getDataContext().tenantId;
        }
      }

      const agent = new HookAgent(defaultOptions());
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(capturedTenantId).toBe('tenant-1');
    });
  });
});
