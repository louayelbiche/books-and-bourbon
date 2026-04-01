/**
 * Integration tests for agent-core
 *
 * These tests verify that all components work together correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BaseAgent,
  AgentContext,
  AgentResult,
  AgentTool,
  FilesystemMemory,
  SecurityGuard,
  resetFilesystemMemory,
  LLMClient,
} from '../src/index.js';
import { MockLLMClient } from './mocks/mock-llm-client.js';

// =============================================================================
// Mock Agent for Testing
// =============================================================================

class MockAgent extends BaseAgent {
  readonly agentType = 'mock';
  readonly systemPrompt = 'You are a test agent for integration testing.';

  constructor(client?: LLMClient) {
    super(client || new MockLLMClient());

    // Register test tools
    this.registerTool({
      name: 'get_test_data',
      description: 'Returns test data',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Key to retrieve',
          },
        },
        required: ['key'],
      },
      execute: async (args) => {
        return { key: args.key, value: 'test-value' };
      },
    });

    this.registerTool({
      name: 'echo',
      description: 'Echoes input back',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Message to echo',
          },
        },
        required: ['message'],
      },
      execute: async (args) => {
        return { echoed: args.message };
      },
    });
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    return {
      agentType: this.agentType,
      success: true,
      response: `Analyzed query: ${context.query}`,
      confidence: 1.0,
    };
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('agent-core integration', () => {
  describe('BaseAgent', () => {
    let agent: MockAgent;

    beforeEach(() => {
      agent = new MockAgent();
    });

    it('initializes with correct agent type', () => {
      expect(agent.agentType).toBe('mock');
    });

    it('has system prompt defined', () => {
      expect(agent.systemPrompt).toBeTruthy();
    });

    it('returns agent info with registered tools', () => {
      const info = agent.getInfo();
      expect(info.type).toBe('mock');
      expect(info.tools).toContain('get_test_data');
      expect(info.tools).toContain('echo');
      expect(info.maskedTools).toHaveLength(0);
    });

    it('analyze returns result with correct structure', async () => {
      const result = await agent.analyze({
        clientId: 'test-client',
        sessionId: 'test-session',
        query: 'test query',
      });

      expect(result.agentType).toBe('mock');
      expect(result.success).toBe(true);
      expect(result.response).toContain('test query');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Tool Masking', () => {
    let agent: MockAgent;

    beforeEach(() => {
      agent = new MockAgent();
    });

    it('masks tools correctly', () => {
      // Access protected method via casting
      (agent as any).maskTool('get_test_data', 'Testing mask');

      const info = agent.getInfo();
      expect(info.maskedTools).toContain('get_test_data');
    });

    it('unmasks tools correctly', () => {
      (agent as any).maskTool('get_test_data', 'Testing mask');
      (agent as any).unmaskTool('get_test_data');

      const info = agent.getInfo();
      expect(info.maskedTools).not.toContain('get_test_data');
    });

    it('excludes masked tools from declarations', () => {
      (agent as any).maskTool('get_test_data', 'Testing mask');

      const declarations = (agent as any).getToolDeclarations();
      const toolNames = declarations.map((t: any) => t.name);

      expect(toolNames).not.toContain('get_test_data');
      expect(toolNames).toContain('echo');
    });
  });

  describe('FilesystemMemory', () => {
    let memory: FilesystemMemory;

    beforeEach(() => {
      resetFilesystemMemory();
      memory = new FilesystemMemory({
        baseDir: '/tmp/agent-core-test-' + Date.now(),
      });
    });

    afterEach(async () => {
      // Cleanup would go here
    });

    it('creates and retrieves sessions', async () => {
      await memory.createSession('test-session', 'test-client');

      const session = await memory.getSession('test-session');
      expect(session).not.toBeNull();
      expect(session?.clientId).toBe('test-client');
      expect(session?.messages).toHaveLength(0);
    });

    it('appends messages to session', async () => {
      await memory.createSession('test-session', 'test-client');

      await memory.appendMessage('test-session', {
        role: 'user',
        content: 'Hello',
      });

      await memory.appendMessage('test-session', {
        role: 'assistant',
        content: 'Hi there!',
      });

      const history = await memory.getHistory('test-session');
      expect(history).toHaveLength(2);
      expect(history[0].content).toBe('Hello');
      expect(history[1].content).toBe('Hi there!');
    });

    it('completes sessions', async () => {
      await memory.createSession('test-session', 'test-client');
      await memory.completeSession('test-session');

      const session = await memory.getSession('test-session');
      expect(session?.completed).toBe(true);
    });

    it('stores and retrieves session data', async () => {
      await memory.createSession('test-session', 'test-client');

      await memory.setSessionData('test-session', 'custom-key', {
        foo: 'bar',
      });

      const data = await memory.getSessionData('test-session', 'custom-key');
      expect(data).toEqual({ foo: 'bar' });
    });
  });

  describe('SecurityGuard', () => {
    let guard: SecurityGuard;

    beforeEach(() => {
      guard = new SecurityGuard();
    });

    it('validates input within length limit', () => {
      const result = guard.validateInput('Hello, world!');
      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('rejects input exceeding length limit', () => {
      // Use a varied string to avoid triggering encoding detection patterns
      const longInput = 'Hello world. This is a test message. '.repeat(100);
      const result = guard.validateInput(longInput);
      expect(result.safe).toBe(false);
      expect(result.threats.length).toBeGreaterThanOrEqual(1);
      expect(result.sanitized.length).toBeLessThanOrEqual(2000);
    });

    it('generates unique canary tokens', () => {
      const canary1 = guard.generateCanary();
      const canary2 = guard.generateCanary();

      expect(canary1).toMatch(/\[CANARY:[a-z0-9]+\]/);
      expect(canary1).not.toBe(canary2);
    });

    it('wraps user input with spotlighting', () => {
      const wrapped = guard.wrapUserInput('test input');

      expect(wrapped).toContain('BEGIN USER DATA');
      expect(wrapped).toContain('test input');
      expect(wrapped).toContain('END USER DATA');
    });
  });
});

describe('Type exports', () => {
  it('exports all required types', async () => {
    // This test verifies types are exported correctly
    // It will fail at compile time if types are missing
    const module = await import('../src/index.js');

    // Verify key exports exist
    expect(module.BaseAgent).toBeDefined();
    expect(module.GeminiClient).toBeDefined();
    expect(module.FilesystemMemory).toBeDefined();
    expect(module.SecurityGuard).toBeDefined();
    expect(module.DEFAULT_SECURITY_CONFIG).toBeDefined();
    expect(module.DEFAULT_RETRY_CONFIG).toBeDefined();
  });
});
