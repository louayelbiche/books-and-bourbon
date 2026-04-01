/**
 * BaseDemoAgent Tool Execution Loop Tests (Phase 4)
 *
 * Tests the tool registration + Gemini function calling loop in BaseDemoAgent:
 * - Tool registration
 * - chat() tool execution loop (MAX_TOOL_ROUNDS=3)
 * - chatStream() tool execution loop
 * - Tools + conversation history interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

// Mock validateEnv + redactError
vi.mock('../src/env/index.js', () => ({
  validateEnv: vi.fn(),
  redactError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
}));

// Mock i18n
vi.mock('@runwell/i18n/constants', () => ({
  getLanguageName: vi.fn((code: string) => {
    const names: Record<string, string> = {
      en: 'English',
      fr: 'French',
      de: 'German',
      ar: 'Arabic',
      es: 'Spanish',
    };
    return names[code] || code;
  }),
}));

// We need fine-grained control over Gemini responses per test
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
// Test Agent
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
// Helpers
// ============================================================================

function createMockTool(
  name = 'test_tool',
  executeFn?: (args: Record<string, unknown>) => Promise<unknown>
): DemoAgentTool {
  return {
    name,
    description: `A test tool called ${name}`,
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Test input' },
      },
      required: ['input'],
    },
    execute: executeFn || vi.fn(async (args) => ({ result: `processed: ${args.input}` })),
  };
}

/** Helper to create a Gemini response with text only (no function calls) */
function geminiTextResponse(text: string) {
  return {
    response: {
      text: () => text,
      functionCalls: () => null,
    },
  };
}

/** Helper to create a Gemini response with function calls */
function geminiFunctionCallResponse(
  calls: Array<{ name: string; args: Record<string, unknown> }>
) {
  return {
    response: {
      text: () => '',
      functionCalls: () => calls,
    },
  };
}

/** Helper to create a streaming response with text chunks */
function geminiStreamTextResponse(text: string) {
  const words = text.split(' ');
  return {
    stream: (async function* () {
      for (const word of words) {
        yield {
          text: () => word + ' ',
          functionCalls: () => null,
        };
      }
    })(),
  };
}

/** Helper to create a streaming response with function calls */
function geminiStreamFunctionCallResponse(
  calls: Array<{ name: string; args: Record<string, unknown> }>
) {
  return {
    stream: (async function* () {
      yield {
        text: () => '',
        functionCalls: () => calls,
      };
    })(),
  };
}

/** Collect all chunks from an async generator */
async function collectStream(gen: AsyncGenerator<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of gen) {
    chunks.push(chunk);
  }
  return chunks;
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseDemoAgent: Tool Execution', () => {
  let agent: TestAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TestAgent();
  });

  // --------------------------------------------------------------------------
  // 4.2 Tool Registration
  // --------------------------------------------------------------------------

  describe('tool registration', () => {
    it('agent starts with no tools', () => {
      // When no tools registered, getToolDeclarations returns []
      // We verify indirectly: generateContent called without tools param
      mockGenerateContent.mockResolvedValue(geminiTextResponse('Hello'));
      // No tools added — should work fine
      expect(agent).toBeDefined();
    });

    it('registerTool adds tool to internal list', async () => {
      const tool = createMockTool();
      agent.addTool(tool);

      mockGenerateContent.mockResolvedValue(geminiTextResponse('Hello'));
      await agent.chat('test', []);

      // Verify tools were passed to generateContent
      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArgs).toHaveProperty('tools');
    });

    it('multiple tools can be registered', async () => {
      agent.addTool(createMockTool('tool_a'));
      agent.addTool(createMockTool('tool_b'));

      mockGenerateContent.mockResolvedValue(geminiTextResponse('Hello'));
      await agent.chat('test', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const tools = callArgs.tools as Array<{
        functionDeclarations: Array<{ name: string }>;
      }>;
      expect(tools[0].functionDeclarations).toHaveLength(2);
      expect(tools[0].functionDeclarations[0].name).toBe('tool_a');
      expect(tools[0].functionDeclarations[1].name).toBe('tool_b');
    });

    it('no tools param in generateContent when no tools registered', async () => {
      mockGenerateContent.mockResolvedValue(geminiTextResponse('Hello'));
      await agent.chat('test', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArgs).not.toHaveProperty('tools');
    });

    it('converts DemoAgentTool to Gemini FunctionDeclaration format', async () => {
      agent.addTool(createMockTool('fetch_data'));

      mockGenerateContent.mockResolvedValue(geminiTextResponse('Done'));
      await agent.chat('test', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const tools = callArgs.tools as Array<{
        functionDeclarations: Array<{
          name: string;
          description: string;
          parameters: unknown;
        }>;
      }>;
      const decl = tools[0].functionDeclarations[0];
      expect(decl.name).toBe('fetch_data');
      expect(decl.description).toContain('fetch_data');
      expect(decl.parameters).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4.3 Tool Execution via chat()
  // --------------------------------------------------------------------------

  describe('chat() tool loop', () => {
    it('returns text directly when Gemini returns no function calls', async () => {
      mockGenerateContent.mockResolvedValue(
        geminiTextResponse('Simple response')
      );

      const result = await agent.chat('Hello', []);
      expect(result).toBe('Simple response');
    });

    it('executes tool when Gemini returns a function call', async () => {
      const executeFn = vi.fn(async () => ({ data: 'tool result' }));
      agent.addTool(createMockTool('my_tool', executeFn));

      // First call: Gemini returns function call
      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'my_tool', args: { input: 'test data' } },
        ])
      );
      // Second call (after tool result): Gemini returns text
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Tool executed successfully')
      );

      const result = await agent.chat('Use the tool', []);
      expect(executeFn).toHaveBeenCalledWith({ input: 'test data' });
      expect(result).toBe('Tool executed successfully');
    });

    it('passes correct args to tool.execute()', async () => {
      const executeFn = vi.fn(async (args: Record<string, unknown>) => args);
      agent.addTool(createMockTool('my_tool', executeFn));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'my_tool', args: { input: 'specific value' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Done')
      );

      await agent.chat('Do it', []);
      expect(executeFn).toHaveBeenCalledWith({ input: 'specific value' });
    });

    it('sends tool result back as functionResponse', async () => {
      const executeFn = vi.fn(async () => ({ answer: 42 }));
      agent.addTool(createMockTool('calc', executeFn));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'calc', args: { input: 'compute' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('The answer is 42')
      );

      await agent.chat('Calculate', []);

      // Second call should include the function call and response in contents
      const secondCallArgs = mockGenerateContent.mock.calls[1][0] as Record<
        string,
        unknown
      >;
      const contents = secondCallArgs.contents as Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;

      // Look for functionResponse part
      const hasResponse = contents.some(
        (c) =>
          c.role === 'user' &&
          c.parts.some((p) => 'functionResponse' in p)
      );
      expect(hasResponse).toBe(true);
    });

    it('handles multiple function calls in single response', async () => {
      const execA = vi.fn(async () => ({ a: 1 }));
      const execB = vi.fn(async () => ({ b: 2 }));
      agent.addTool(createMockTool('tool_a', execA));
      agent.addTool(createMockTool('tool_b', execB));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'tool_a', args: { input: 'x' } },
          { name: 'tool_b', args: { input: 'y' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Both tools done')
      );

      const result = await agent.chat('Use both', []);
      expect(execA).toHaveBeenCalled();
      expect(execB).toHaveBeenCalled();
      expect(result).toBe('Both tools done');
    });

    it('loops up to MAX_TOOL_ROUNDS then forces text', async () => {
      agent.addTool(createMockTool('looper'));

      // 3 rounds of function calls
      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'looper', args: { input: '1' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'looper', args: { input: '2' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'looper', args: { input: '3' } },
        ])
      );
      // Final forced text response (no tools param)
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Finally done')
      );

      const result = await agent.chat('Loop', []);
      expect(result).toBe('Finally done');
      // 3 rounds + 1 final = 4 calls
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
    });

    it('stops looping when Gemini returns text', async () => {
      agent.addTool(createMockTool('one_shot'));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'one_shot', args: { input: 'go' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Done after one round')
      );

      const result = await agent.chat('Go', []);
      expect(result).toBe('Done after one round');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('returns error when tool.execute() throws', async () => {
      const failingTool = createMockTool(
        'fail_tool',
        vi.fn(async () => {
          throw new Error('Tool crashed');
        })
      );
      agent.addTool(failingTool);

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'fail_tool', args: { input: 'boom' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Handled error')
      );

      const result = await agent.chat('Break it', []);
      // Should continue after error and get text from second call
      expect(result).toBe('Handled error');
    });

    it('handles unknown tool name', async () => {
      agent.addTool(createMockTool('known_tool'));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'unknown_tool', args: { input: 'x' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Unknown tool handled')
      );

      const result = await agent.chat('Call unknown', []);
      // Should not crash — returns error for the tool, Gemini gets the error
      expect(result).toBe('Unknown tool handled');
    });

    it('throws on Gemini SDK error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('SDK crashed'));

      await expect(agent.chat('test', [])).rejects.toThrow(
        'Failed to generate response'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4.4 Tool Execution via chatStream()
  // --------------------------------------------------------------------------

  describe('chatStream() tool loop', () => {
    it('yields text chunks when no function calls', async () => {
      mockGenerateContentStream.mockResolvedValue(
        geminiStreamTextResponse('Hello world')
      );

      const chunks = await collectStream(agent.chatStream('Hi', []));
      expect(chunks.join('')).toContain('Hello');
      expect(chunks.join('')).toContain('world');
    });

    it('yields text then executes tools when function calls detected', async () => {
      const executeFn = vi.fn(async () => ({ done: true }));
      agent.addTool(createMockTool('stream_tool', executeFn));

      // First stream: returns function call
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamFunctionCallResponse([
          { name: 'stream_tool', args: { input: 'go' } },
        ])
      );
      // Second stream: returns text after tool result
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Tool result processed')
      );

      const chunks = await collectStream(
        agent.chatStream('Use stream tool', [])
      );
      expect(executeFn).toHaveBeenCalled();
      expect(chunks.join('')).toContain('Tool result processed');
    });

    it('re-streams after tool execution with new text', async () => {
      agent.addTool(createMockTool('restream'));

      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamFunctionCallResponse([
          { name: 'restream', args: { input: 'x' } },
        ])
      );
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Final answer here')
      );

      const chunks = await collectStream(agent.chatStream('Go', []));
      const fullText = chunks.join('');
      expect(fullText).toContain('Final');
      expect(fullText).toContain('answer');
    });

    it('does not yield function call parts to consumer', async () => {
      agent.addTool(createMockTool('hidden'));

      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamFunctionCallResponse([
          { name: 'hidden', args: { input: 'secret' } },
        ])
      );
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Only text')
      );

      const chunks = await collectStream(agent.chatStream('Go', []));
      const fullText = chunks.join('');
      // Should not contain function call metadata
      expect(fullText).not.toContain('functionCall');
      expect(fullText).not.toContain('hidden');
      expect(fullText).toContain('Only text');
    });

    it('handles tool error and continues to next round', async () => {
      agent.addTool(
        createMockTool('fail', async () => {
          throw new Error('Stream tool error');
        })
      );

      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamFunctionCallResponse([
          { name: 'fail', args: { input: 'crash' } },
        ])
      );
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Recovered from error')
      );

      const chunks = await collectStream(agent.chatStream('Break', []));
      expect(chunks.join('')).toContain('Recovered');
    });

    it('caps at MAX_TOOL_ROUNDS and omits tools on last round', async () => {
      agent.addTool(createMockTool('loop'));

      // 3 rounds of function calls + 1 final text
      for (let i = 0; i < 3; i++) {
        mockGenerateContentStream.mockResolvedValueOnce(
          geminiStreamFunctionCallResponse([
            { name: 'loop', args: { input: String(i) } },
          ])
        );
      }
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Max rounds done')
      );

      const chunks = await collectStream(agent.chatStream('Loop', []));
      expect(chunks.join('')).toContain('Max rounds done');

      // Last call should NOT have tools (forces text)
      const lastCall = mockGenerateContentStream.mock.calls[3][0] as Record<
        string,
        unknown
      >;
      expect(lastCall).not.toHaveProperty('tools');
    });

    it('handles empty text chunks gracefully', async () => {
      mockGenerateContentStream.mockResolvedValue({
        stream: (async function* () {
          yield { text: () => '', functionCalls: () => null };
          yield { text: () => 'Real text', functionCalls: () => null };
          yield { text: () => '', functionCalls: () => null };
        })(),
      });

      const chunks = await collectStream(agent.chatStream('Go', []));
      // Empty chunks should not be yielded
      const nonEmpty = chunks.filter((c) => c.length > 0);
      expect(nonEmpty.length).toBeGreaterThanOrEqual(1);
      expect(nonEmpty.join('')).toContain('Real text');
    });

    it('throws on Gemini SDK error', async () => {
      mockGenerateContentStream.mockRejectedValue(
        new Error('Stream SDK error')
      );

      await expect(
        collectStream(agent.chatStream('Go', []))
      ).rejects.toThrow('Failed to generate streaming response');
    });

    it('collects text across multiple rounds', async () => {
      agent.addTool(createMockTool('multi'));

      // Round 1: text + function call mixed
      mockGenerateContentStream.mockResolvedValueOnce({
        stream: (async function* () {
          yield { text: () => 'Round 1 text. ', functionCalls: () => null };
          yield {
            text: () => '',
            functionCalls: () => [
              { name: 'multi', args: { input: 'go' } },
            ],
          };
        })(),
      });
      // Round 2: more text
      mockGenerateContentStream.mockResolvedValueOnce(
        geminiStreamTextResponse('Round 2 text.')
      );

      const chunks = await collectStream(agent.chatStream('Go', []));
      const fullText = chunks.join('');
      expect(fullText).toContain('Round 1 text');
      expect(fullText).toContain('Round 2 text');
    });
  });

  // --------------------------------------------------------------------------
  // 4.5 Tools + History Interaction
  // --------------------------------------------------------------------------

  describe('tools + conversation history', () => {
    it('tool declarations included when tools registered', async () => {
      agent.addTool(createMockTool('hist_tool'));

      mockGenerateContent.mockResolvedValue(geminiTextResponse('OK'));
      await agent.chat('test', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArgs).toHaveProperty('tools');
    });

    it('buildContents injects system prompt in first message', async () => {
      mockGenerateContent.mockResolvedValue(geminiTextResponse('OK'));
      await agent.chat('Hello', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const contents = callArgs.contents as Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;
      expect(contents[0].parts[0].text).toContain('You are a test agent');
      expect(contents[0].parts[0].text).toContain('Hello');
    });

    it('history is preserved in contents', async () => {
      const history: BaseChatMessage[] = [
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' },
      ];

      mockGenerateContent.mockResolvedValue(geminiTextResponse('OK'));
      await agent.chat('New question', history);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const contents = callArgs.contents as Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;

      // First content: system prompt + first history message
      expect(contents[0].parts[0].text).toContain('Previous question');
      // Should have history entries + new message
      expect(contents.length).toBeGreaterThanOrEqual(3);
    });

    it('tool results appended to contents array', async () => {
      agent.addTool(createMockTool('ctx_tool'));

      mockGenerateContent.mockResolvedValueOnce(
        geminiFunctionCallResponse([
          { name: 'ctx_tool', args: { input: 'x' } },
        ])
      );
      mockGenerateContent.mockResolvedValueOnce(
        geminiTextResponse('Done')
      );

      await agent.chat('Use tool', []);

      // Second call should have tool call + tool result in contents
      const secondCallArgs = mockGenerateContent.mock.calls[1][0] as Record<
        string,
        unknown
      >;
      const contents = secondCallArgs.contents as Array<{
        role: string;
        parts: Array<Record<string, unknown>>;
      }>;

      const modelParts = contents.filter((c) => c.role === 'model');
      const hasFunctionCall = modelParts.some((c) =>
        c.parts.some((p) => 'functionCall' in p)
      );
      expect(hasFunctionCall).toBe(true);
    });

    it('locale instruction appended when locale is set', async () => {
      const agentWithLocale = new TestAgent({ locale: 'fr' });

      mockGenerateContent.mockResolvedValue(geminiTextResponse('Bonjour'));
      await agentWithLocale.chat('Hello', []);

      const callArgs = mockGenerateContent.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      const contents = callArgs.contents as Array<{
        role: string;
        parts: Array<{ text: string }>;
      }>;
      expect(contents[0].parts[0].text).toContain('French');
    });
  });
});
