/**
 * Integration tests for BibAgent module system
 *
 * Verifies:
 * - BibAgent constructor accepts modules option
 * - BibAgent initialize() calls module.initialize()
 * - Module tools registered on agent after initialize
 * - getModule returns correct module by name
 * - getModule returns undefined for unknown module
 * - Multiple modules can be used together
 * - Module without getTools() works fine
 * - Module with empty getTools() works fine
 *
 * @see spec Phase 3a — Module System Integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BibAgent, createEmptyDataContext } from '../../src/agent/bib-agent.js';
import { ToolRegistry } from '../../src/tools/registry.js';
import { CardsModule } from '../../src/modules/cards.js';
import { PanelsModule } from '../../src/modules/panels.js';
import { StreamingModule } from '../../src/modules/streaming.js';
import { SecurityModule } from '../../src/modules/security.js';
import type { BibAgentModule } from '../../src/modules/types.js';
import type { DataContext } from '../../src/context/types.js';
import type { AgentContext, AgentResult } from '@runwell/agent-core';
import type { BibAgentOptions } from '../../src/agent/bib-agent.js';

// =============================================================================
// Mock LLM Client
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

  public getDataContext(): DataContext {
    return this.dataContext;
  }

  public getModules(): BibAgentModule[] {
    return this.modules;
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
    services: [],
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

describe('BibAgent Module System', () => {
  beforeEach(() => {
    ToolRegistry.resetInstance();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor accepts modules
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('accepts modules option', () => {
      const cards = new CardsModule();
      const agent = new TestAgent(defaultOptions({ modules: [cards] }));

      expect(agent.getModules()).toHaveLength(1);
      expect(agent.getModules()[0]).toBe(cards);
    });

    it('defaults modules to empty array', () => {
      const agent = new TestAgent(defaultOptions());

      expect(agent.getModules()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // initialize() calls module.initialize()
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('calls module.initialize() for each module', async () => {
      const mockModule: BibAgentModule = {
        name: 'mock',
        initialize: vi.fn(),
      };

      const agent = new TestAgent(defaultOptions({ modules: [mockModule] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(mockModule.initialize).toHaveBeenCalledOnce();
      expect(mockModule.initialize).toHaveBeenCalledWith(agent);
    });

    it('calls initialize() on all modules', async () => {
      const mod1: BibAgentModule = { name: 'mod1', initialize: vi.fn() };
      const mod2: BibAgentModule = { name: 'mod2', initialize: vi.fn() };
      const mod3: BibAgentModule = { name: 'mod3', initialize: vi.fn() };

      const agent = new TestAgent(defaultOptions({ modules: [mod1, mod2, mod3] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(mod1.initialize).toHaveBeenCalledOnce();
      expect(mod2.initialize).toHaveBeenCalledOnce();
      expect(mod3.initialize).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Module tools registered on agent
  // ---------------------------------------------------------------------------

  describe('module tool registration', () => {
    it('registers module tools on agent after initialize', async () => {
      const cards = new CardsModule();
      const agent = new TestAgent(defaultOptions({ modules: [cards] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      const info = agent.getInfo();
      expect(info.tools).toContain('show_product_card');
      expect(info.tools).toContain('show_service_card');
      expect(info.tools).toContain('show_event_card');
    });

    it('registers tools from multiple modules', async () => {
      const cards = new CardsModule();
      const panels = new PanelsModule();
      const agent = new TestAgent(defaultOptions({ modules: [cards, panels] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      const info = agent.getInfo();
      // Cards module: 3 tools
      expect(info.tools).toContain('show_product_card');
      expect(info.tools).toContain('show_service_card');
      expect(info.tools).toContain('show_event_card');
      // Panels module: 1 tool
      expect(info.tools).toContain('panel_push');
    });
  });

  // ---------------------------------------------------------------------------
  // getModule
  // ---------------------------------------------------------------------------

  describe('getModule', () => {
    it('returns correct module by name', async () => {
      const cards = new CardsModule();
      const streaming = new StreamingModule();
      const agent = new TestAgent(defaultOptions({ modules: [cards, streaming] }));
      const prisma = createMockPrisma(createFullTenant());
      await agent.initialize('tenant-1', prisma);

      const foundCards = agent.getModule<CardsModule>('cards');
      expect(foundCards).toBe(cards);

      const foundStreaming = agent.getModule<StreamingModule>('streaming');
      expect(foundStreaming).toBe(streaming);
    });

    it('returns undefined for unknown module name', () => {
      const agent = new TestAgent(defaultOptions({ modules: [new CardsModule()] }));

      expect(agent.getModule('nonexistent')).toBeUndefined();
    });

    it('returns undefined when no modules registered', () => {
      const agent = new TestAgent(defaultOptions());

      expect(agent.getModule('cards')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple modules together
  // ---------------------------------------------------------------------------

  describe('multiple modules', () => {
    it('all four module types can coexist', async () => {
      const cards = new CardsModule();
      const panels = new PanelsModule();
      const streaming = new StreamingModule({ maxToolRounds: 5 });
      const security = new SecurityModule('dashboard');

      const agent = new TestAgent(defaultOptions({
        modules: [cards, panels, streaming, security],
      }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      // All modules accessible
      expect(agent.getModule('cards')).toBe(cards);
      expect(agent.getModule('panels')).toBe(panels);
      expect(agent.getModule('streaming')).toBe(streaming);
      expect(agent.getModule('security')).toBe(security);

      // Tools from card + panel modules registered
      const info = agent.getInfo();
      expect(info.tools).toContain('show_product_card');
      expect(info.tools).toContain('panel_push');

      // Config modules still work
      expect(streaming.config.maxToolRounds).toBe(5);
      expect(security.config.urlRestriction).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Module without getTools()
  // ---------------------------------------------------------------------------

  describe('module without getTools', () => {
    it('works fine (no tools registered)', async () => {
      const streaming = new StreamingModule();
      const agent = new TestAgent(defaultOptions({ modules: [streaming] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      // No extra tools should be registered from streaming module
      const info = agent.getInfo();
      expect(info.tools).not.toContain('show_product_card');
      expect(info.tools).not.toContain('panel_push');

      // Module is still accessible
      expect(agent.getModule('streaming')).toBe(streaming);
    });
  });

  // ---------------------------------------------------------------------------
  // Module with empty getTools()
  // ---------------------------------------------------------------------------

  describe('module with empty getTools', () => {
    it('works fine (no tools registered)', async () => {
      const emptyToolModule: BibAgentModule = {
        name: 'empty-tools',
        initialize: vi.fn(),
        getTools: () => [],
      };

      const agent = new TestAgent(defaultOptions({ modules: [emptyToolModule] }));
      const prisma = createMockPrisma(createFullTenant());

      await agent.initialize('tenant-1', prisma);

      expect(emptyToolModule.initialize).toHaveBeenCalledOnce();
      expect(agent.getModule('empty-tools')).toBe(emptyToolModule);
    });
  });
});
