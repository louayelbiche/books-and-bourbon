/**
 * Tests for DemoAgentTool `items` field support
 *
 * Covers:
 * - items property in DemoAgentTool schema type
 * - items forwarding to Gemini FunctionDeclaration format
 * - Regression: tools without items still work
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

vi.mock('@runwell/i18n/constants', () => ({
  getLanguageName: vi.fn((code: string) => {
    const names: Record<string, string> = { en: 'English', fr: 'French' };
    return names[code] || code;
  }),
}));

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream,
    })),
  })),
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import {
  BaseDemoAgent,
  type DemoAgentTool,
  type BaseChatMessage,
} from '../src/agent/index.js';

// ============================================================================
// Test Agent that exposes tool declarations
// ============================================================================

class TestAgent extends BaseDemoAgent {
  protected getSystemPrompt(): string {
    return 'You are a test agent.';
  }

  addTool(tool: DemoAgentTool): void {
    this.registerTool(tool);
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('DemoAgentTool items field support', () => {
  let agent: TestAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    agent = new TestAgent();
  });

  it('tool with items field compiles and registers without error', () => {
    const tool: DemoAgentTool = {
      name: 'test_tool',
      description: 'Test tool with array parameter',
      parameters: {
        type: 'object',
        properties: {
          tags: {
            type: 'ARRAY',
            description: 'List of tags to filter by',
            items: { type: 'STRING', description: 'A tag value' },
          },
        },
        required: ['tags'],
      },
      execute: async () => ({ success: true }),
    };

    // Should not throw
    agent.addTool(tool);
  });

  it('tool without items field still works (regression)', () => {
    const tool: DemoAgentTool = {
      name: 'simple_tool',
      description: 'Simple tool without array params',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'STRING',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
      execute: async () => ({ success: true }),
    };

    agent.addTool(tool);
  });

  it('items with type and description forwards both to Gemini', async () => {
    const tool: DemoAgentTool = {
      name: 'filter_tool',
      description: 'Tool with typed array',
      parameters: {
        type: 'object',
        properties: {
          categories: {
            type: 'ARRAY',
            description: 'Categories to include',
            items: { type: 'STRING', description: 'Category name' },
          },
        },
      },
      execute: async () => ({ result: [] }),
    };

    agent.addTool(tool);

    // Trigger a chat to capture what gets passed to Gemini
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Test response',
        functionCalls: () => null,
      },
    });

    await agent.chat('test', []);

    // Inspect what was passed to generateContent
    const call = mockGenerateContent.mock.calls[0][0];
    const tools = call.tools;
    expect(tools).toBeDefined();
    expect(tools.length).toBe(1);

    const funcDecl = tools[0].functionDeclarations[0];
    expect(funcDecl.name).toBe('filter_tool');

    const categoriesProp = funcDecl.parameters.properties.categories;
    expect(categoriesProp.items).toBeDefined();
    expect(categoriesProp.items.type).toBe('STRING'); // items type is STRING (each item is a string)
    expect(categoriesProp.items.description).toBe('Category name');
  });

  it('items with only type (no description) omits description', async () => {
    const tool: DemoAgentTool = {
      name: 'tags_tool',
      description: 'Tool with minimal items',
      parameters: {
        type: 'object',
        properties: {
          tags: {
            type: 'ARRAY',
            description: 'Tags list',
            items: { type: 'STRING' },
          },
        },
      },
      execute: async () => ({ result: [] }),
    };

    agent.addTool(tool);

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Response',
        functionCalls: () => null,
      },
    });

    await agent.chat('test', []);

    const call = mockGenerateContent.mock.calls[0][0];
    const funcDecl = call.tools[0].functionDeclarations[0];
    const tagsProp = funcDecl.parameters.properties.tags;

    expect(tagsProp.items).toBeDefined();
    expect(tagsProp.items.type).toBe('STRING'); // items type is STRING (each item is a string)
    expect(tagsProp.items.description).toBeUndefined();
  });

  it('property without items does not include items in Gemini declaration', async () => {
    const tool: DemoAgentTool = {
      name: 'query_tool',
      description: 'Simple query tool',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'STRING',
            description: 'Search query',
          },
        },
      },
      execute: async () => ({ result: 'ok' }),
    };

    agent.addTool(tool);

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Response',
        functionCalls: () => null,
      },
    });

    await agent.chat('test', []);

    const call = mockGenerateContent.mock.calls[0][0];
    const funcDecl = call.tools[0].functionDeclarations[0];
    const queryProp = funcDecl.parameters.properties.query;

    expect(queryProp.items).toBeUndefined();
  });

  it('enum property still forwarded correctly alongside items', async () => {
    const tool: DemoAgentTool = {
      name: 'mixed_tool',
      description: 'Tool with both enum and items properties',
      parameters: {
        type: 'object',
        properties: {
          sort_by: {
            type: 'STRING',
            description: 'Sort order',
            enum: ['name', 'price', 'date'],
          },
          tags: {
            type: 'ARRAY',
            description: 'Filter tags',
            items: { type: 'STRING', description: 'Tag' },
          },
        },
      },
      execute: async () => ({ result: [] }),
    };

    agent.addTool(tool);

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Response',
        functionCalls: () => null,
      },
    });

    await agent.chat('test', []);

    const call = mockGenerateContent.mock.calls[0][0];
    const funcDecl = call.tools[0].functionDeclarations[0];

    // enum property works
    const sortProp = funcDecl.parameters.properties.sort_by;
    expect(sortProp.enum).toEqual(['name', 'price', 'date']);
    expect(sortProp.items).toBeUndefined();

    // items property works
    const tagsProp = funcDecl.parameters.properties.tags;
    expect(tagsProp.items).toBeDefined();
    expect(tagsProp.enum).toBeUndefined();
  });

  it('tool with array param executes correctly with array args', async () => {
    const executeFn = vi.fn().mockResolvedValue({ found: 3 });

    const tool: DemoAgentTool = {
      name: 'tag_search',
      description: 'Search by tags',
      parameters: {
        type: 'object',
        properties: {
          tags: {
            type: 'ARRAY',
            description: 'Tags',
            items: { type: 'STRING' },
          },
        },
        required: ['tags'],
      },
      execute: executeFn,
    };

    agent.addTool(tool);

    // First call: LLM returns a function call
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '',
        functionCalls: () => [
          { name: 'tag_search', args: { tags: ['red', 'blue'] } },
        ],
      },
    });

    // Second call: LLM returns text response
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Found 3 items with those tags.',
        functionCalls: () => null,
      },
    });

    const result = await agent.chat('find red and blue items', []);

    expect(executeFn).toHaveBeenCalledWith({ tags: ['red', 'blue'] });
    expect(result).toBe('Found 3 items with those tags.');
  });
});
