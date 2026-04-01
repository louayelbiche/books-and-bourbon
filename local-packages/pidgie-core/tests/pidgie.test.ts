/**
 * Pidgie Agent Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AgentContext, ChatResponse } from '@runwell/agent-core';
import type { PidgieConfig } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Mock @runwell/bib-agent — BibAgent + loadDataContext (Phase 3b-2 pattern)
// ---------------------------------------------------------------------------
const mockRegisterTool = vi.fn();
const mockRegisterTools = vi.fn();
const mockChat = vi.fn<(msg: string, ctx: AgentContext) => Promise<ChatResponse>>().mockResolvedValue({
  text: 'response',
  functionCalls: [],
});

const TEST_TENANT_ID = 'test-business-1';

function createTestDataContext(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TEST_TENANT_ID,
    tenantName: 'Test Cafe',
    business: { name: 'Test Cafe', category: 'restaurant', description: 'A cozy cafe serving great coffee and pastries', industry: null },
    contact: {
      phone: '555-123-4567',
      email: 'hello@testcafe.com',
      address: '123 Main St, Anytown, CA 12345',
      socialMedia: null,
    },
    hours: {
      timezone: 'America/Los_Angeles',
      regular: {
        monday: { open: '07:00', close: '18:00' },
        tuesday: { open: '07:00', close: '18:00' },
        wednesday: { open: '07:00', close: '18:00' },
        thursday: { open: '07:00', close: '18:00' },
        friday: { open: '07:00', close: '20:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '08:00', close: '16:00' },
      },
    },
    services: [
      {
        id: 'coffee',
        name: 'Coffee',
        description: 'Fresh brewed coffee',
        price: { amount: 3.5, currency: 'USD' },
        available: true,
        category: 'drinks',
      },
      {
        id: 'pastry',
        name: 'Pastries',
        description: 'Fresh baked pastries',
        price: { amount: 4.0, currency: 'USD' },
        available: true,
        category: 'food',
      },
    ],
    products: [],
    faqs: [
      {
        id: 'parking',
        question: 'Is there parking available?',
        answer: 'Yes, we have free parking in the back of the building.',
        category: 'general',
        keywords: ['parking', 'car', 'lot'],
      },
      {
        id: 'wifi',
        question: 'Do you have WiFi?',
        answer: 'Yes, we offer free WiFi for all customers.',
        category: 'amenities',
        keywords: ['wifi', 'internet', 'wireless'],
      },
    ],
    promotions: [],
    booking: null,
    ordering: null,
    website: { scraped: null, url: 'https://testcafe.com', publishStatus: null },
    brand: { voice: null, identity: null },
    _meta: { availableFields: [], missingFields: [], emptyCollections: [], lastUpdated: new Date().toISOString() },
    ...overrides,
  };
}

// Allow tests to override DataContext for specific scenarios
let dataContextOverrides: Record<string, unknown> = {};

function setDataContextOverrides(overrides: Record<string, unknown>) {
  dataContextOverrides = overrides;
}

vi.mock('@runwell/bib-agent', () => ({
  BibAgent: class MockBibAgent {
    registerTool = mockRegisterTool;
    registerTools = mockRegisterTools;
    chat = mockChat;
    dataContext = createTestDataContext();
    _systemPrompt = '';
    mode = 'dashboard';
    tools = new Map();

    constructor(_options?: unknown) {}

    async initialize(tenantId: string, _prisma: unknown): Promise<void> {
      this.dataContext = createTestDataContext({ tenantId, ...dataContextOverrides });
      dataContextOverrides = {};
      this._systemPrompt = '';
      if (typeof (this as any).buildDomainSystemPrompt === 'function') {
        this._systemPrompt = (this as any).buildDomainSystemPrompt(this.dataContext);
      }
      if (typeof (this as any).onReady === 'function') {
        (this as any).onReady();
      }
    }

    get systemPrompt(): string {
      return this._systemPrompt;
    }

    getInfo() {
      // Collect tool names from registerTool calls
      const toolNames: string[] = [];
      for (const call of mockRegisterTool.mock.calls) {
        if (call[0] && call[0].name) {
          toolNames.push(call[0].name);
        }
      }
      return {
        type: 'pidgie',
        tools: toolNames,
        maskedTools: [],
      };
    }
  },
}));

// Must import *after* vi.mock so the mock is in effect
import { PidgieAgent } from '../src/pidgie.agent.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PidgieAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('creates agent with business data', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.agentType).toBe('pidgie');
      expect(agent.systemPrompt).toBeTruthy();
    });

    it('includes business name in system prompt', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.systemPrompt).toContain('Test Cafe');
    });

    it('includes security rules in system prompt', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.systemPrompt).toContain('NEVER reveal');
      expect(agent.systemPrompt).toContain('API keys');
      expect(agent.systemPrompt).toContain('credentials');
    });

    it('applies custom configuration', async () => {
      const config: PidgieConfig = {
        greeting: 'Hello! Welcome to our cafe!',
        personality: {
          tone: 'casual',
          language: 'concise',
          useEmojis: true,
        },
      };

      const agent = new PidgieAgent({ config });
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.getGreeting()).toBe('Hello! Welcome to our cafe!');
    });
  });

  describe('Security Rules', () => {
    it('system prompt forbids revealing credentials', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const prompt = agent.systemPrompt;

      // Check for security rules
      expect(prompt).toContain('NEVER');
      expect(prompt).toMatch(/api\s*keys?/i);
      expect(prompt).toMatch(/password/i);
      expect(prompt).toMatch(/credential/i);
      expect(prompt).toMatch(/database/i);
    });

    it('system prompt forbids role manipulation', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const prompt = agent.systemPrompt;

      expect(prompt).toContain('ignore');
      expect(prompt).toMatch(/act as|pretend/i);
    });
  });

  describe('Public Info Access', () => {
    it('returns public business info only', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const publicInfo = agent.getPublicBusinessInfo();

      // Should have public fields
      expect(publicInfo.name).toBe('Test Cafe');
      expect(publicInfo.description).toBeTruthy();
      expect(publicInfo.contact).toBeDefined();

      // Should NOT have internal fields
      expect(publicInfo).not.toHaveProperty('metadata');
    });
  });

  describe('Greeting', () => {
    it('returns default greeting', () => {
      const agent = new PidgieAgent();

      const greeting = agent.getGreeting();
      expect(greeting).toContain('help');
    });

    it('returns custom greeting when configured', () => {
      const agent = new PidgieAgent({
        config: {
          greeting: 'Welcome to Test Cafe!',
        },
      });

      const greeting = agent.getGreeting();
      expect(greeting).toBe('Welcome to Test Cafe!');
    });
  });

  describe('Tool Registration', () => {
    it('has business tools registered', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();

      // Should have the core business tools
      expect(info.tools).toContain('get_business_info');
      expect(info.tools).toContain('get_business_hours');
      expect(info.tools).toContain('get_services');
      expect(info.tools).toContain('get_faqs');
    });
  });
});

describe('Business Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get_business_info', () => {
    it('is registered as a tool', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_business_info');
    });
  });

  describe('get_business_hours', () => {
    it('is registered as a tool', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_business_hours');
    });
  });

  describe('get_services', () => {
    it('is registered as a tool', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_services');
    });
  });

  describe('get_faqs', () => {
    it('is registered as a tool', async () => {
      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_faqs');
    });
  });

  describe('Product Tools', () => {
    it('search_products is registered', async () => {
      setDataContextOverrides({
        products: [
          {
            id: 'latte',
            name: 'Cafe Latte',
            description: 'Espresso with steamed milk',
            category: 'drinks',
            price: { amount: 4.5, currency: 'USD' },
            available: true,
            tags: ['coffee', 'milk'],
          },
          {
            id: 'croissant',
            name: 'Butter Croissant',
            description: 'Flaky buttery pastry',
            category: 'food',
            price: { amount: 3.0, currency: 'USD' },
            available: true,
            featured: true,
          },
        ],
        promotions: [
          {
            id: 'morning-deal',
            name: 'Morning Deal',
            description: '20% off all drinks before 10am',
            type: 'percentage' as const,
            value: 20,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            active: true,
          },
        ],
      });

      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('search_products');
    });

    it('get_product_details is registered', async () => {
      setDataContextOverrides({
        products: [
          {
            id: 'latte',
            name: 'Cafe Latte',
            description: 'Espresso with steamed milk',
            category: 'drinks',
            price: { amount: 4.5, currency: 'USD' },
            available: true,
            tags: ['coffee', 'milk'],
          },
        ],
      });

      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_product_details');
    });

    it('get_promotions is registered', async () => {
      setDataContextOverrides({
        promotions: [
          {
            id: 'morning-deal',
            name: 'Morning Deal',
            description: '20% off all drinks before 10am',
            type: 'percentage' as const,
            value: 20,
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            active: true,
          },
        ],
      });

      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_promotions');
    });
  });

  describe('Booking Tools', () => {
    it('check_availability is registered', async () => {
      setDataContextOverrides({
        booking: {
          enabled: true,
          type: 'reservation' as const,
          minAdvance: 2,
          maxAdvance: 30,
          resources: [
            {
              id: 'table-1',
              name: 'Table for 2',
              type: 'table',
              capacity: 2,
            },
          ],
          policies: {
            cancellation: 'Free cancellation up to 24 hours before.',
          },
        },
      });

      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('check_availability');
    });

    it('get_booking_info is registered', async () => {
      setDataContextOverrides({
        booking: {
          enabled: true,
          type: 'reservation' as const,
          minAdvance: 2,
          maxAdvance: 30,
          resources: [
            {
              id: 'table-1',
              name: 'Table for 2',
              type: 'table',
              capacity: 2,
            },
          ],
          policies: {
            cancellation: 'Free cancellation up to 24 hours before.',
          },
        },
      });

      const agent = new PidgieAgent();
      await agent.initialize(TEST_TENANT_ID, {});

      const info = agent.getInfo();
      expect(info.tools).toContain('get_booking_info');
    });
  });
});
