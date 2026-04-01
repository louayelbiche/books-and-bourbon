/**
 * Base Agent Abstract Class
 *
 * All agents extend this class to inherit common functionality:
 * - Tool registration and masking
 * - LLM client integration
 * - Session memory
 * - Chat interface
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger, logError, createTimer } from '@runwell/logger';
import { logToolExecution } from '@runwell/logger/ai';
import type {
  AgentTool,
  AgentContext,
  AgentResult,
  ChatMessage,
  ChatResponse,
  StreamChunk,
  ToolDeclaration,
  ToolMask,
  DiversityConfig,
  FunctionCall,
} from '../types/index.js';
import type { LLMClient } from '../llm/client.js';
import { GeminiClient, getGeminiClient } from '../llm/gemini.js';

const logger = createLogger('agent-core');

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent {
  /** LLM client for generation */
  protected client: LLMClient;

  /** Registered tools */
  protected tools: Map<string, AgentTool> = new Map();

  /** Masked (temporarily disabled) tools */
  protected maskedTools: Map<string, ToolMask> = new Map();

  /** Diversity configuration for controlled randomness */
  protected diversityConfig: DiversityConfig;

  /** Unique agent type identifier */
  abstract readonly agentType: string;

  /** System prompt for this agent */
  abstract readonly systemPrompt: string;

  constructor(client?: LLMClient) {
    this.client = client || getGeminiClient();

    // Initialize diversity config with random salt
    this.diversityConfig = {
      temperatureVariation: Math.random() * 0.1, // 0-0.1 variation
      promptVariations: [],
      observationSalt: `[${this.constructor.name}:${Date.now().toString(36)}]`,
    };
  }

  // ===========================================================================
  // Tool Management
  // ===========================================================================

  /**
   * Register a tool for this agent
   */
  protected registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once
   */
  protected registerTools(tools: AgentTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Mask a tool (temporarily disable with reason)
   */
  protected maskTool(
    toolName: string,
    reason: string,
    durationMs?: number
  ): void {
    this.maskedTools.set(toolName, {
      toolName,
      reason,
      maskedAt: new Date(),
      maskedUntil: durationMs ? new Date(Date.now() + durationMs) : undefined,
    });
  }

  /**
   * Unmask a tool (re-enable)
   */
  protected unmaskTool(toolName: string): void {
    this.maskedTools.delete(toolName);
  }

  /**
   * Check if a tool is currently masked
   */
  protected isToolMasked(toolName: string): boolean {
    const mask = this.maskedTools.get(toolName);
    if (!mask) return false;

    // Check if mask has expired
    if (mask.maskedUntil && new Date() > mask.maskedUntil) {
      this.maskedTools.delete(toolName);
      return false;
    }

    return true;
  }

  /**
   * Get tool declarations for LLM (respects masking)
   */
  protected getToolDeclarations(): ToolDeclaration[] {
    return Array.from(this.tools.values())
      .filter((tool) => !this.isToolMasked(tool.name))
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
  }

  /**
   * Get info about masked tools (for context transparency)
   */
  protected getMaskedToolsInfo(): string {
    if (this.maskedTools.size === 0) return '';

    const maskedInfo = Array.from(this.maskedTools.values())
      .map((m) => `- ${m.toolName}: ${m.reason}`)
      .join('\n');

    return `\n\nNote: The following tools are temporarily unavailable:\n${maskedInfo}`;
  }

  /**
   * Execute a tool by name
   */
  protected async executeTool(
    call: FunctionCall,
    context: AgentContext
  ): Promise<unknown> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${call.name}`);
    }

    if (this.isToolMasked(call.name)) {
      throw new Error(`Tool is currently masked: ${call.name}`);
    }

    const timer = createTimer();
    try {
      const result = await tool.execute(call.args, context);
      logToolExecution({ tool: call.name, durationMs: timer.elapsed(), success: true });
      return result;
    } catch (error) {
      logToolExecution({ tool: call.name, durationMs: timer.elapsed(), success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Tool execution error', { tool: call.name, ...logError(error) });
      throw error;
    }
  }

  // ===========================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Main analysis method - implement domain-specific logic
   */
  abstract analyze(context: AgentContext): Promise<AgentResult>;

  // ===========================================================================
  // Chat Interface
  // ===========================================================================

  /**
   * Process a chat message and return a response
   */
  async chat(message: string, context: AgentContext): Promise<ChatResponse> {
    const tools = this.getToolDeclarations();
    const maskedInfo = this.getMaskedToolsInfo();

    // Build full system prompt
    const fullSystemPrompt = this.systemPrompt + maskedInfo;

    // Build prompt with context
    const prompt = this.buildChatPrompt(message, context);

    // Generate with tools if available
    if (tools.length > 0) {
      const result = await this.client.generateWithTools(prompt, tools, {
        systemPrompt: fullSystemPrompt,
        temperature: 0.7 + this.diversityConfig.temperatureVariation,
      });

      // Handle function calls
      if (result.functionCalls && result.functionCalls.length > 0) {
        return await this.handleFunctionCalls(
          result.functionCalls,
          context,
          fullSystemPrompt,
          prompt
        );
      }

      return {
        text: result.text,
        functionCalls: result.functionCalls,
        finishReason: result.finishReason,
        usage: result.usage,
      };
    }

    // No tools, just generate
    const result = await this.client.generateContent(prompt, {
      systemPrompt: fullSystemPrompt,
      temperature: 0.7 + this.diversityConfig.temperatureVariation,
    });

    return {
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
    };
  }

  /**
   * Process a chat message with streaming response
   */
  async *chatStream(
    message: string,
    context: AgentContext
  ): AsyncGenerator<StreamChunk> {
    const tools = this.getToolDeclarations();
    const maskedInfo = this.getMaskedToolsInfo();
    const fullSystemPrompt = this.systemPrompt + maskedInfo;
    const prompt = this.buildChatPrompt(message, context);

    const stream = this.client.generateContentStream(prompt, {
      systemPrompt: fullSystemPrompt,
      tools: tools.length > 0 ? tools : undefined,
      temperature: 0.7 + this.diversityConfig.temperatureVariation,
    });

    for await (const chunk of stream) {
      // Handle tool calls during streaming
      if (chunk.type === 'tool_call' && chunk.functionCall) {
        try {
          const result = await this.executeTool(chunk.functionCall, context);
          yield {
            type: 'tool_result',
            content: JSON.stringify(result),
            metadata: { toolName: chunk.functionCall.name },
          };
        } catch (error) {
          yield {
            type: 'error',
            content: `Tool error: ${error instanceof Error ? error.message : 'Unknown'}`,
          };
        }
      } else {
        yield chunk;
      }
    }
  }

  // ===========================================================================
  // Private/Protected Helpers
  // ===========================================================================

  /**
   * Build chat prompt with context
   */
  protected buildChatPrompt(message: string, context: AgentContext): string {
    let prompt = '';

    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      for (const msg of context.conversationHistory) {
        const role = msg.role === 'assistant' ? 'Assistant' : 'User';
        prompt += `${role}: ${msg.content}\n\n`;
      }
    }

    // Add current message
    prompt += `User: ${message}`;

    return prompt;
  }

  /**
   * Handle function calls from LLM response
   */
  protected async handleFunctionCalls(
    functionCalls: FunctionCall[],
    context: AgentContext,
    systemPrompt: string,
    originalPrompt: string
  ): Promise<ChatResponse> {
    const results: Array<{ name: string; result: unknown }> = [];

    // Execute each function call
    for (const call of functionCalls) {
      try {
        const result = await this.executeTool(call, context);
        results.push({ name: call.name, result });
      } catch (error) {
        results.push({
          name: call.name,
          result: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }

    // Use batch method if available (proper function calling protocol)
    if (this.client.continueWithAllToolResults) {
      const finalResult = await this.client.continueWithAllToolResults(
        originalPrompt,
        functionCalls.map((c) => ({ name: c.name, args: c.args })),
        results,
        { systemPrompt }
      );

      return {
        text: finalResult.text,
        functionCalls,
        finishReason: finalResult.finishReason,
      };
    }

    // Fallback: sequential tool results (legacy)
    const conversationHistory = [
      { role: 'user', content: originalPrompt },
      {
        role: 'assistant',
        content: `I used the following tools: ${functionCalls.map((c) => c.name).join(', ')}`,
      },
    ];

    let finalResult: { text: string; finishReason?: string } = { text: '' };
    for (const { name, result } of results) {
      finalResult = await this.client.continueWithToolResult(
        conversationHistory,
        name,
        result,
        { systemPrompt }
      );
    }

    return {
      text: finalResult.text,
      functionCalls,
      finishReason: finalResult.finishReason,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get agent info for debugging/logging
   */
  getInfo(): { type: string; tools: string[]; maskedTools: string[] } {
    return {
      type: this.agentType,
      tools: Array.from(this.tools.keys()),
      maskedTools: Array.from(this.maskedTools.keys()),
    };
  }

  /**
   * Generate a unique session ID
   */
  protected generateSessionId(): string {
    return uuidv4();
  }
}
