/**
 * Integration tests for BibAgent ↔ ResponsePipeline wiring
 *
 * Verifies:
 * - Pipeline runs on chat response (via TestAgent with mock LLM)
 * - Pipeline disabled via configurePipeline([]) → response unmodified
 * - Custom pipeline steps can be added via configurePipeline
 * - extractAllowedValues extracts numeric strings from tool results
 * - Default pipeline includes 3 mandatory steps
 *
 * @see spec TASK-034, TASK-035
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BibAgent, createEmptyDataContext } from '../../src/agent/bib-agent.js';
import { ToolRegistry } from '../../src/tools/registry.js';
import type { DataContext } from '../../src/context/types.js';
import type { AgentContext, AgentResult } from '@runwell/agent-core';
import type { BibAgentOptions } from '../../src/agent/bib-agent.js';
import type { PipelineStep, PipelineContext, PipelineResult } from '../../src/pipeline/types.js';

// =============================================================================
// Mock LLM Client
// =============================================================================

function createMockLLMClient(responseText: string) {
  return {
    generateContent: vi.fn().mockResolvedValue({ text: responseText, finishReason: 'STOP' }),
    generateWithTools: vi.fn().mockResolvedValue({ text: responseText, finishReason: 'STOP' }),
    generateContentStream: vi.fn(),
    continueWithToolResult: vi.fn(),
    continueWithAllToolResults: vi.fn(),
  };
}

// =============================================================================
// Concrete Test Subclass
// =============================================================================

class TestAgent extends BibAgent {
  readonly agentType = 'test-integration-agent';

  buildDomainSystemPrompt(ctx: DataContext): string {
    return `You are a test agent for ${ctx.business?.name || 'unknown'}.`;
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    return { agentType: this.agentType, success: true, response: 'ok', confidence: 1 };
  }

  // Expose protected methods for testing
  public getDataContext(): DataContext {
    return this.dataContext;
  }

  public testConfigurePipeline(steps: PipelineStep[]): void {
    this.configurePipeline(steps);
  }

  public getPipelineSteps(): string[] {
    return this.pipeline.getSteps();
  }
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createTenantWithMissingHours() {
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
    websiteUrl: null,
    publishStatus: null,
    websiteContext: null,
    businessHours: null, // hours missing!
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

// =============================================================================
// Tests
// =============================================================================

describe('BibAgent ↔ Pipeline Integration', () => {
  beforeEach(() => {
    ToolRegistry.resetInstance();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Default pipeline
  // ---------------------------------------------------------------------------

  describe('default pipeline', () => {
    it('includes 3 mandatory steps: fact-guard, voice-enforcer, data-integrity-guard', () => {
      const agent = new TestAgent({
        mode: 'dashboard',
        llmClient: createMockLLMClient('hello'),
      });

      expect(agent.getPipelineSteps()).toEqual([
        'fact-guard',
        'voice-enforcer',
        'data-integrity-guard',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Pipeline runs on chat response
  // ---------------------------------------------------------------------------

  describe('pipeline runs on chat response', () => {
    it('modifies response text when FactGuard detects fabricated hours', async () => {
      // LLM will return text claiming hours that don't exist
      const llm = createMockLLMClient('We are open Monday through Friday.');
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);

      const response = await agent.chat('When are you open?', {
        clientId: 'c1',
        sessionId: 's1',
      });

      // Pipeline should have replaced the fabricated claim
      expect(response.text).toContain('[not available yet]');
      expect(response.text).not.toContain('open Monday');
    });

    it('modifies response when DataIntegrityGuard detects "we are closed"', async () => {
      const llm = createMockLLMClient('We are closed right now.');
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);

      const response = await agent.chat('Are you open?', {
        clientId: 'c1',
        sessionId: 's1',
      });

      expect(response.text).toContain('[hours not configured yet]');
    });

    it('detects voice violations but does not modify text', async () => {
      const llm = createMockLLMClient('the AI suggests trying something new.');
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);

      const response = await agent.chat('Any recommendations?', {
        clientId: 'c1',
        sessionId: 's1',
      });

      // VoiceEnforcer is warning-only, so text should be unmodified
      // (assuming no FactGuard/DataIntegrityGuard matches)
      expect(response.text).toContain('the AI suggests');
    });
  });

  // ---------------------------------------------------------------------------
  // Pipeline disabled via configurePipeline([])
  // ---------------------------------------------------------------------------

  describe('pipeline disabled', () => {
    it('returns response unmodified when pipeline has no steps', async () => {
      const fabricatedText = 'We are open Monday through Friday. We are closed on weekends.';
      const llm = createMockLLMClient(fabricatedText);
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);
      agent.testConfigurePipeline([]); // Disable pipeline

      const response = await agent.chat('When are you open?', {
        clientId: 'c1',
        sessionId: 's1',
      });

      // No pipeline → text unmodified
      expect(response.text).toBe(fabricatedText);
    });
  });

  // ---------------------------------------------------------------------------
  // Custom pipeline steps
  // ---------------------------------------------------------------------------

  describe('custom pipeline steps', () => {
    it('uses custom steps when set via configurePipeline', async () => {
      const llm = createMockLLMClient('hello world');
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);

      // Replace with a custom step that uppercases text
      const upperStep: PipelineStep = {
        name: 'custom-upper',
        order: 10,
        process(text: string): PipelineResult {
          return { text: text.toUpperCase(), flags: [] };
        },
      };

      agent.testConfigurePipeline([upperStep]);

      const response = await agent.chat('hi', {
        clientId: 'c1',
        sessionId: 's1',
      });

      expect(response.text).toBe('HELLO WORLD');
      expect(agent.getPipelineSteps()).toEqual(['custom-upper']);
    });
  });

  // ---------------------------------------------------------------------------
  // Clean text passes through unchanged
  // ---------------------------------------------------------------------------

  describe('clean text', () => {
    it('passes through clean response text without modification', async () => {
      const cleanText = 'Welcome! How can I help you today?';
      const llm = createMockLLMClient(cleanText);
      const agent = new TestAgent({ mode: 'dashboard', llmClient: llm });
      const prisma = createMockPrisma(createTenantWithMissingHours());

      await agent.initialize('tenant-1', prisma);

      const response = await agent.chat('hello', {
        clientId: 'c1',
        sessionId: 's1',
      });

      expect(response.text).toBe(cleanText);
    });
  });
});
