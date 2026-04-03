import { GenerativeModel, Content } from '@google/generative-ai';
import { ChatCard, ChatAction } from '@runwell/card-system/types';

/**
 * Base demo agent — abstract Gemini agent shell.
 *
 * Products extend this class to provide their own system prompt construction,
 * while sharing the Gemini interaction pattern (chat, chatStream, buildContents).
 *
 * Supports optional Gemini function calling — subclasses can register tools
 * via `registerTool()`. Tool execution happens internally; consumers still
 * receive plain text chunks from `chatStream()`.
 */

/** @deprecated Use `getLanguageName` from `@runwell/i18n` instead */
declare const LOCALE_NAMES: Record<string, string>;

interface BaseChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
    cards?: ChatCard[];
    actions?: ChatAction[];
}
interface BaseDemoAgentOptions {
    /** Gemini model ID (default: gemini-2.0-flash) */
    modelId?: string;
    /** Generation temperature (default: 0.7) */
    temperature?: number;
    /** Max output tokens (default: 2048) */
    maxOutputTokens?: number;
    /** User's preferred locale code (e.g. 'fr', 'de', 'ar') */
    locale?: string;
}
/**
 * Tool definition for BaseDemoAgent.
 * Lightweight alternative to agent-core's AgentTool — no context param.
 */
interface DemoAgentTool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
            items?: {
                type: string;
                description?: string;
            };
        }>;
        required?: string[];
    };
    execute: (args: Record<string, unknown>) => Promise<unknown>;
}
interface ToolCallResult {
    name: string;
    args: Record<string, unknown>;
    success: boolean;
    resultSummary?: string;
    durationMs: number;
}
interface ChatStreamOptions {
    /** @deprecated Use onToolResult for enriched metadata. Falls back to name+args only. */
    onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
    /** Enriched tool call callback with success/failure, timing, and result summary. */
    onToolResult?: (result: ToolCallResult) => void;
}
/**
 * @deprecated Use BibAgent with mode: 'public' for new agents.
 * BaseDemoAgent will be removed in a future major version.
 * Existing demo agents (DemoPidgieAgent, ShopmateDemoAgent) continue
 * to work — this deprecation targets NEW agent creation only.
 */
declare abstract class BaseDemoAgent {
    protected model: GenerativeModel;
    protected temperature: number;
    protected maxOutputTokens: number;
    protected locale?: string;
    private tools;
    private _profileBlock;
    /**
     * Subclasses must implement this to return their full system prompt.
     */
    protected abstract getSystemPrompt(): string;
    constructor(options?: BaseDemoAgentOptions);
    /**
     * Register a tool for Gemini function calling.
     * Tools are executed internally — chatStream() still yields plain text.
     */
    protected registerTool(tool: DemoAgentTool): void;
    /**
     * Returns a locale instruction string for the LLM.
     * Always includes dynamic language-matching so the agent responds in whatever
     * language the user writes in — even when no explicit locale is configured.
     */
    protected getLocaleInstruction(): string;
    /**
     * Core security rules that ALL bots must follow.
     */
    protected getCoreSecurityRules(): string;
    /**
     * Set a customer profile block to append to the system prompt.
     * Called by createChatHandler when profileInjector is configured.
     */
    setProfileBlock(block: string | null): void;
    /**
     * Convenience: getSystemPrompt() + profile block + getLocaleInstruction() + getCoreSecurityRules().
     */
    protected buildSystemPromptWithLocale(): string;
    /**
     * Convert registered tools to Gemini SDK format.
     */
    private getToolDeclarations;
    /**
     * Execute a tool by name with the given args.
     */
    private executeTool;
    /**
     * Generate a non-streaming response.
     * Handles tool calls internally if tools are registered.
     */
    chat(userMessage: string, history: BaseChatMessage[]): Promise<string>;
    /**
     * Generate a streaming response.
     * Handles tool calls internally — only yields text chunks to consumers.
     *
     * Flow when tools are registered:
     * 1. Stream response from Gemini (may yield text OR function calls)
     * 2. If function calls detected: execute tools, append results, re-stream
     * 3. Repeat up to MAX_TOOL_ROUNDS times
     * 4. Final round always yields text
     */
    chatStream(userMessage: string, history: BaseChatMessage[], options?: ChatStreamOptions): AsyncGenerator<string>;
    /**
     * Build conversation contents for Gemini.
     * Injects system prompt into the first user message.
     */
    protected buildContents(userMessage: string, history: BaseChatMessage[]): Content[];
}

export { type BaseChatMessage, BaseDemoAgent, type BaseDemoAgentOptions, type ChatStreamOptions, type DemoAgentTool, LOCALE_NAMES, type ToolCallResult };
