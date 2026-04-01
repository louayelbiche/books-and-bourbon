/**
 * Agent Integration Tests — Phase 5
 *
 * End-to-end tests combining PidgieAgent with the fetch_website tool.
 * Tests the full pipeline: user message → tool call → scrape → analyze → response.
 *
 * Uses MockLLMClient for deterministic LLM behavior and mocks the
 * scraper/detector/Gemini-summary layer to isolate agent-level logic.
 *
 * Phase 3b-2: Updated to use BibAgent mock with initialize() pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockLLMClient } from './mocks/mock-llm-client.js';

// ============================================================================
// Mocks — intercept the scraper + detector + Gemini summary layers
// ============================================================================

const mockScrapeWebsite = vi.fn();
const mockNormalizeUrl = vi.fn();

vi.mock('../src/scraper/index.js', () => ({
  scrapeWebsite: (...args: unknown[]) => mockScrapeWebsite(...args),
  normalizeUrl: (...args: unknown[]) => mockNormalizeUrl(...args),
}));

const mockDetectBusinessSignals = vi.fn();

vi.mock('../src/detection/index.js', () => ({
  detectBusinessSignals: (...args: unknown[]) =>
    mockDetectBusinessSignals(...args),
}));

const mockGeminiGenerateContent = vi.fn();

vi.mock('@runwell/agent-core', async () => {
  const actual = await vi.importActual('@runwell/agent-core');
  return {
    ...(actual as object),
    getGeminiClient: vi.fn(() => ({
      generateContent: mockGeminiGenerateContent,
    })),
  };
});

// ============================================================================
// Mock @runwell/bib-agent (Phase 3b-2)
// ============================================================================

const TEST_TENANT_ID = 'test-biz-1';

function createTestDataContext(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TEST_TENANT_ID,
    tenantName: 'Integration Test Co',
    business: { name: 'Integration Test Co', category: 'technology', description: 'A company for testing integrations', industry: null },
    contact: {
      phone: '555-000-0000',
      email: 'test@integration.com',
      address: '1 Test St, Testville, TS 00000',
      socialMedia: null,
    },
    hours: {
      timezone: 'UTC',
      regular: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: null,
        sunday: null,
      },
    },
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: { scraped: null, url: 'https://integration.com', publishStatus: null },
    brand: { voice: null, identity: null },
    _meta: { availableFields: [], missingFields: [], emptyCollections: [], lastUpdated: new Date().toISOString() },
    ...overrides,
  };
}

let dataContextOverrides: Record<string, unknown> = {};

vi.mock('@runwell/bib-agent', async () => {
  // Import the actual BaseAgent so chat/tool execution pipeline works
  const agentCore = await vi.importActual<typeof import('@runwell/agent-core')>('@runwell/agent-core');
  const { BaseAgent } = agentCore;

  class MockBibAgent extends BaseAgent {
    dataContext: any = createTestDataContext();
    _systemPromptValue = '';
    mode = 'dashboard';
    pipeline = { getSteps: () => [] as any[], process: (text: string) => ({ text }) };

    constructor(options?: any) {
      super(options?.llmClient);
    }

    async initialize(tenantId: string, _prisma: unknown): Promise<void> {
      this.dataContext = createTestDataContext({ tenantId, ...dataContextOverrides });
      dataContextOverrides = {};
      if (typeof (this as any).buildDomainSystemPrompt === 'function') {
        this._systemPromptValue = (this as any).buildDomainSystemPrompt(this.dataContext);
      }
      if (typeof (this as any).onReady === 'function') {
        (this as any).onReady();
      }
    }

    get systemPrompt(): string {
      return this._systemPromptValue;
    }
  }

  return { BibAgent: MockBibAgent };
});

// Must import *after* vi.mock so the mock is in effect
import { PidgieAgent } from '../src/pidgie.agent.js';

// ============================================================================
// Fixtures
// ============================================================================

function createScrapedWebsite(url: string) {
  return {
    url,
    businessName: 'Target Corp',
    combinedContent: 'Target Corp is a retail company that sells everything.',
    language: 'en',
    pages: [
      {
        url,
        title: 'Target Corp',
        description: 'Homepage',
        bodyText: 'Welcome to Target Corp. We sell products.',
        links: [],
        statusCode: 200,
      },
    ],
    metadata: {},
  };
}

function createBusinessSignals() {
  return {
    businessType: 'retail',
    confidence: 0.8,
    hasProducts: true,
    hasServices: false,
    hasPricing: true,
    hasBooking: false,
    hasCaseStudies: false,
    hasTeamPage: false,
    hasFAQ: false,
    hasBlog: false,
    primaryOfferings: ['Products', 'Electronics'],
    industryKeywords: ['retail', 'shopping'],
    contactMethods: {
      email: 'info@target.com',
      phone: '555-TARGET',
      form: true,
      chat: false,
      social: ['twitter'],
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('PidgieAgent Integration', () => {
  let mockClient: MockLLMClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = new MockLLMClient();

    mockNormalizeUrl.mockImplementation((url: string) => {
      const u = url.trim();
      const withProtocol =
        u.startsWith('http://') || u.startsWith('https://') ? u : 'https://' + u;
      return new URL(withProtocol).origin;
    });

    mockScrapeWebsite.mockResolvedValue(
      createScrapedWebsite('https://target.com')
    );
    mockDetectBusinessSignals.mockReturnValue(createBusinessSignals());
    mockGeminiGenerateContent.mockResolvedValue({
      text: 'Target Corp is a major US retailer offering products across categories.',
    });
  });

  // --------------------------------------------------------------------------
  // 5.1 Agent initialization with fetch_website tool
  // --------------------------------------------------------------------------

  describe('tool registration', () => {
    it('registers fetch_website tool alongside standard pidgie tools', async () => {
      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      // The agent should mention fetching websites in its system prompt
      expect(agent.systemPrompt).toContain('fetch_website');
    });

    it('system prompt includes instruction to use fetch_website for URLs', async () => {
      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.systemPrompt).toContain(
        'website URL'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5.2 analyze() with fetch_website tool call
  // --------------------------------------------------------------------------

  describe('analyze() with tool calls', () => {
    it('processes query without tool calls (simple question)', async () => {
      mockClient.mockResponse = 'We are open from 9 AM to 5 PM weekdays.';

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const result = await agent.analyze({
        sessionId: 'session-1',
        query: 'What are your hours?',
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('9 AM');
    });

    it('processes query where LLM returns a fetch_website function call', async () => {
      // Configure mock to return a function call first, then text
      mockClient.mockFunctionCalls = [
        {
          name: 'fetch_website',
          args: { url: 'https://target.com' },
        },
      ];
      mockClient.mockResponse = 'Based on the website data, Target is a retail company.';

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const result = await agent.analyze({
        sessionId: 'session-2',
        query: 'Can you check out target.com for me?',
      });

      expect(result.success).toBe(true);
      // The continueWithToolResult should have been called
      expect(result.response).toBeTruthy();
    });

    it('handles SSRF-blocked URLs gracefully through analyze()', async () => {
      mockClient.mockFunctionCalls = [
        {
          name: 'fetch_website',
          args: { url: 'http://localhost:3000' },
        },
      ];
      mockClient.mockResponse = '';

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const result = await agent.analyze({
        sessionId: 'session-3',
        query: 'Check http://localhost:3000',
      });

      // Tool returns error, continueWithToolResult processes it
      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
      // Scraper should NOT have been called
      expect(mockScrapeWebsite).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 5.3 Security integration: input validation + tool execution
  // --------------------------------------------------------------------------

  describe('security integration', () => {
    it('sanitizes long input but still processes at medium severity', async () => {
      // SecurityGuard treats long input as medium severity, which
      // PidgieAgent allows through (only critical/high is rejected).
      // This documents that behavior — the input is sanitized but processed.
      mockClient.mockResponse = 'I can help with that.';

      const agent = new PidgieAgent({
        llmClient: mockClient,
        config: {
          security: { maxInputLength: 100 },
        },
      });
      await agent.initialize(TEST_TENANT_ID, {});

      const result = await agent.analyze({
        sessionId: 'session-sec-1',
        query: 'a'.repeat(200) + ' check https://target.com',
      });

      // Medium severity passes through — input is sanitized, not rejected
      expect(result.success).toBe(true);
      expect(result.response).toBeTruthy();
    });

    it('output validation runs on final response containing tool data', async () => {
      mockClient.mockFunctionCalls = [];
      mockClient.mockResponse = 'The website is great.';

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const result = await agent.analyze({
        sessionId: 'session-sec-2',
        query: 'Tell me about this company',
      });

      expect(result.success).toBe(true);
      expect(typeof result.response).toBe('string');
    });
  });

  // --------------------------------------------------------------------------
  // 5.4 chat() direct method with tool calls
  // --------------------------------------------------------------------------

  describe('chat() with fetch_website', () => {
    it('returns text response when no tool calls are made', async () => {
      mockClient.mockResponse = 'Hello! How can I help you today?';

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const response = await agent.chat('Hi', {
        sessionId: 'session-chat-1',
      });

      expect(response.text).toBe('Hello! How can I help you today?');
    });

    it('handles fetch_website tool call in chat flow', async () => {
      mockClient.mockFunctionCalls = [
        {
          name: 'fetch_website',
          args: { url: 'https://target.com' },
        },
      ];

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const response = await agent.chat('What does target.com sell?', {
        sessionId: 'session-chat-2',
      });

      // The response should contain tool result data
      // MockLLMClient.continueWithToolResult formats as "Tool <name> returned: <result>"
      expect(response.text).toContain('fetch_website');
      expect(mockScrapeWebsite).toHaveBeenCalled();
    });

    it('scraper failure returns error through tool chain without crashing', async () => {
      mockScrapeWebsite.mockRejectedValue(new Error('Network timeout'));
      mockClient.mockFunctionCalls = [
        {
          name: 'fetch_website',
          args: { url: 'https://failing-site.com' },
        },
      ];

      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const response = await agent.chat('Check failing-site.com', {
        sessionId: 'session-chat-3',
      });

      // Should NOT throw — error is caught and returned as tool result
      expect(response.text).toBeTruthy();
    });
  });

  // --------------------------------------------------------------------------
  // 5.5 Public business info isolation
  // --------------------------------------------------------------------------

  describe('data isolation', () => {
    it('getPublicBusinessInfo() does not leak internal fields', async () => {
      const agent = new PidgieAgent({ llmClient: mockClient });
      await agent.initialize(TEST_TENANT_ID, {});

      const publicInfo = agent.getPublicBusinessInfo();
      expect(publicInfo.name).toBe('Integration Test Co');
      // Services is NOT included in public info
      expect((publicInfo as Record<string, unknown>).services).toBeUndefined();
    });

    it('greeting can be customized without affecting security rules', async () => {
      const agent = new PidgieAgent({
        llmClient: mockClient,
        config: {
          greeting: 'Welcome! Try asking me about any website.',
        },
      });
      await agent.initialize(TEST_TENANT_ID, {});

      expect(agent.getGreeting()).toBe(
        'Welcome! Try asking me about any website.'
      );
      // Security rules should still be present
      expect(agent.systemPrompt).toContain('NEVER reveal');
    });
  });
});
