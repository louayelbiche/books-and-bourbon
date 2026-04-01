/**
 * BibAgent — Abstract base class for all BIB agents
 *
 * Extends BaseAgent from @runwell/agent-core with:
 * - DataContext loading and lifecycle (constructed → ready | degraded)
 * - System prompt assembly via buildBibSystemPrompt
 * - Core and extension tool registration via ToolRegistry
 * - ResponsePipeline for post-generation verification (Phase 2)
 *
 * @see spec TASK-020, TASK-021, TASK-022, TASK-034
 */

import { BaseAgent } from '@runwell/agent-core';
import type { AgentContext, AgentResult, ChatResponse, FunctionCall, StreamChunk } from '@runwell/agent-core';

import type { DataContext } from '../context/types.js';
import type { CoreToolName } from '../tools/registry.js';
import type { PipelineStep, PipelineContext } from '../pipeline/types.js';
import type { BibAgentModule } from '../modules/types.js';
import { loadDataContext, TenantNotFoundError } from '../context/context-loader.js';
import { computeMeta } from '../context/meta.js';
import { buildBibSystemPrompt } from '../prompt/system-prompt-builder.js';
import { ToolRegistry } from '../tools/registry.js';
import { toBibAgentTool } from '../tools/adapter.js';
import { allCoreTools } from '../tools/core/index.js';
import { ResponsePipeline } from '../pipeline/response-pipeline.js';
import { FactGuard } from '../pipeline/steps/fact-guard.js';
import { VoiceEnforcer } from '../pipeline/steps/voice-enforcer.js';
import { DataIntegrityGuard } from '../pipeline/steps/data-integrity-guard.js';
import { StreamingModule } from '../modules/streaming.js';
import { SecurityModule } from '../modules/security.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Event fired after each tool execution.
 * Used by consumers to wire attribution signals without coupling.
 */
export interface ToolResultEvent {
  toolName: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
  tenantId?: string;
  conversationId?: string;
  visitorId?: string;
}

export interface BibAgentOptions {
  /** Operating mode: dashboard (authenticated) or public (anonymous) */
  mode: 'dashboard' | 'public';
  /** LLM client override (optional) */
  llmClient?: any;
  /** Pipeline steps for response processing — Phase 2 */
  pipelineSteps?: any[];
  /** Agent modules — Phase 3 */
  modules?: BibAgentModule[];
}

// =============================================================================
// BibAgent Base Class
// =============================================================================

/**
 * Abstract base class for BIB agents.
 *
 * Lifecycle:
 *   new BibAgent(options) → state = 'constructed'
 *   agent.initialize(tenantId, prisma) → state = 'ready' | 'degraded'
 *
 * Subclasses must implement:
 *   - agentType: string
 *   - buildDomainSystemPrompt(ctx: DataContext): string
 *   - analyze(context: AgentContext): Promise<AgentResult>
 */
export abstract class BibAgent extends BaseAgent {
  /** Whether core tools have been registered in the singleton ToolRegistry */
  private static _coreToolsRegistered = false;

  /**
   * Idempotently register all 9 core tools in the ToolRegistry singleton.
   * Called once at the start of the first initialize() call.
   */
  private static ensureCoreToolsRegistered(): void {
    if (BibAgent._coreToolsRegistered) return;
    const registry = ToolRegistry.getInstance();
    for (const tool of allCoreTools) {
      if (!registry.has(tool.name)) {
        registry.register(tool);
      }
    }
    BibAgent._coreToolsRegistered = true;
  }

  /** Unique agent type identifier */
  abstract readonly agentType: string;

  /** Build domain-specific system prompt from DataContext */
  abstract buildDomainSystemPrompt(ctx: DataContext): string;

  /** Loaded business data (set during initialize) */
  protected dataContext!: DataContext;

  /** Operating mode */
  protected readonly mode: 'dashboard' | 'public';

  /** Registered modules (Phase 3) */
  protected modules: BibAgentModule[];

  /** Response pipeline for post-generation verification (Phase 2) */
  protected pipeline: ResponsePipeline;

  /** Captured tool results for the current chat turn */
  private _capturedToolResults: Map<string, unknown> = new Map();

  /** Tool tier tracking for security filtering (Phase 4a) */
  private _toolTiers: Map<string, string> = new Map();

  /** Agent lifecycle state */
  private _state: 'uninitialized' | 'constructed' | 'ready' | 'degraded' = 'constructed';

  /** Optional callback fired after each tool execution (for attribution, analytics). */
  private _onToolResult: ((event: ToolResultEvent) => void) | null = null;

  /** Built system prompt (set during initialize) */
  private _systemPrompt: string = '';

  /** Optional profile block from bot-memory (appended to system prompt) */
  private _profileBlock: string | null = null;

  constructor(options: BibAgentOptions) {
    super(options.llmClient);
    this.mode = options.mode;
    this.modules = options.modules ?? [];

    // Auto-inject StreamingModule and SecurityModule for public mode (Phase 4a)
    if (this.mode === 'public') {
      if (!this.modules.some(m => m.name === 'streaming')) {
        this.modules.push(new StreamingModule());
      }
      if (!this.modules.some(m => m.name === 'security')) {
        this.modules.push(new SecurityModule('public'));
      }
    }

    // Initialize default pipeline with 3 mandatory steps
    this.pipeline = new ResponsePipeline([
      new FactGuard(),
      new VoiceEnforcer(),
      new DataIntegrityGuard(),
    ]);
    // Note: do NOT load data in constructor
  }

  // ===========================================================================
  // Tool Result Events (Attribution, Analytics)
  // ===========================================================================

  /**
   * Register a callback that fires after every tool execution.
   * Used by consuming apps to wire attribution signal emission
   * without coupling bib-agent to the attribution package.
   */
  setOnToolResult(handler: ((event: ToolResultEvent) => void) | null): void {
    this._onToolResult = handler;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Get the current lifecycle state */
  get state(): string {
    return this._state;
  }

  /**
   * Initialize the agent: load DataContext and build system prompt.
   *
   * On success: state → 'ready'
   * On partial DB failure: state → 'degraded' (DataContext with loadError)
   * On tenant not found: re-throws TenantNotFoundError (caller should return 404)
   */
  async initialize(tenantId: string, prisma: unknown): Promise<void> {
    // Ensure all core tools are registered in the ToolRegistry singleton
    BibAgent.ensureCoreToolsRegistered();

    try {
      this.dataContext = await loadDataContext(tenantId, prisma);
      const domainPrompt = this.buildDomainSystemPrompt(this.dataContext);
      this._systemPrompt = buildBibSystemPrompt(domainPrompt, this.dataContext, this.mode);

      // Check if loadDataContext returned a degraded context (Prisma error caught internally)
      if (this.dataContext._meta.loadError) {
        this._state = 'degraded';
      } else {
        this._state = 'ready';
      }

      // Initialize modules after state is set (Phase 3)
      this.initializeModules();

      // Append security rules after modules are initialized (Phase 4a)
      this.appendSecurityRules();

      // Hook for subclass post-init (e.g. register domain tools)
      this.onReady();
    } catch (error) {
      // Re-throw TenantNotFoundError — callers need this for 404 responses (ERR-07)
      if (error instanceof TenantNotFoundError) {
        throw error;
      }

      // Other errors → degraded state with empty DataContext
      this.dataContext = createEmptyDataContext(
        tenantId,
        error instanceof Error ? error.message : String(error)
      );
      const domainPrompt = this.buildDomainSystemPrompt(this.dataContext);
      this._systemPrompt = buildBibSystemPrompt(domainPrompt, this.dataContext, this.mode);
      this._state = 'degraded';

      // Initialize modules even in degraded state (Phase 4a)
      this.initializeModules();

      // Append security rules after modules are initialized (Phase 4a)
      this.appendSecurityRules();

      // Hook for subclass post-init (e.g. register domain tools)
      this.onReady();
    }
  }

  /**
   * Post-initialization hook for subclasses.
   *
   * Called at the end of initialize() (both success and degraded paths)
   * after DataContext is loaded, modules initialized, and security rules appended.
   *
   * Override to register domain tools that depend on DataContext.
   */
  protected onReady(): void {
    // Default: no-op. Subclasses override to register domain tools.
  }

  // ===========================================================================
  // System Prompt (overrides BaseAgent abstract getter)
  // ===========================================================================

  /** Returns the assembled system prompt (with profile block if set) */
  get systemPrompt(): string {
    if (this._profileBlock) {
      return this._systemPrompt + '\n\n' + this._profileBlock;
    }
    return this._systemPrompt;
  }

  /**
   * Set a bot-memory profile block to inject into the system prompt.
   * Called after initialize() but before chat() to provide cross-session
   * and cross-agent customer context.
   */
  setProfileBlock(block: string | null): void {
    this._profileBlock = block;
  }

  // ===========================================================================
  // Chat (Phase 2 — delegates to BaseAgent + ResponsePipeline)
  // ===========================================================================

  /**
   * Process a chat message with post-generation pipeline verification.
   *
   * 1. Reset tool result capture for this chat turn
   * 2. Delegate to BaseAgent.chat() for LLM generation + tool execution
   * 3. Run ResponsePipeline on the response text
   * 4. Return the (potentially modified) response
   *
   * If the pipeline has no steps (via configurePipeline([])), the
   * response is returned unmodified (rollback path).
   */
  async chat(message: string, context: AgentContext): Promise<ChatResponse> {
    // Reset tool result capture for this chat turn
    this._capturedToolResults = new Map();

    const response = await super.chat(message, context);

    // Skip pipeline if no steps configured (rollback path)
    if (this.pipeline.getSteps().length === 0) {
      return response;
    }

    const pipelineCtx: PipelineContext = {
      dataContext: this.dataContext,
      toolResults: this._capturedToolResults,
      allowedValues: this.extractAllowedValues(this._capturedToolResults),
      originalMessage: message,
    };

    const result = this.pipeline.process(response.text, pipelineCtx);
    return { ...response, text: result.text };
  }

  // ===========================================================================
  // Pipeline Configuration (Phase 2)
  // ===========================================================================

  /**
   * Replace the pipeline with custom steps.
   * Pass an empty array to disable the pipeline (rollback path).
   */
  protected configurePipeline(steps: PipelineStep[]): void {
    this.pipeline = new ResponsePipeline(steps);
  }

  // ===========================================================================
  // Tool Result Interception (Phase 2)
  // ===========================================================================

  /**
   * Override BaseAgent.executeTool to capture tool results
   * for use by the pipeline (NumberGuard, FactGuard bypass).
   */
  protected async executeTool(
    call: FunctionCall,
    context: AgentContext
  ): Promise<unknown> {
    const onProgress = context.metadata?.onProgress as
      | ((toolName: string) => void)
      | undefined;
    if (onProgress) {
      try {
        onProgress(call.name);
      } catch {
        // progress is non-critical
      }
    }
    const result = await super.executeTool(call, context);
    this._capturedToolResults.set(call.name, result);

    // Fire tool result event for attribution/analytics (non-blocking)
    if (this._onToolResult) {
      try {
        this._onToolResult({
          toolName: call.name,
          args: call.args as Record<string, unknown>,
          result: result as Record<string, unknown>,
          tenantId: this.dataContext?.tenantId,
          conversationId: context.metadata?.conversationId as string | undefined,
          visitorId: context.userId,
        });
      } catch {
        // attribution is non-critical
      }
    }

    return result;
  }

  // ===========================================================================
  // DataContext Updates
  // ===========================================================================

  /**
   * Merge partial updates into the DataContext and recompute _meta.
   *
   * NOTE: System prompt is NOT rebuilt (snapshot semantics per spec).
   * This allows tools to update data without changing the prompt mid-conversation.
   */
  protected updateDataContext(partial: Partial<DataContext>): void {
    this.dataContext = { ...this.dataContext, ...partial };
    this.dataContext._meta = computeMeta(this.dataContext);
  }

  // ===========================================================================
  // Tool Registration
  // ===========================================================================

  /**
   * Register core tools by name from the ToolRegistry.
   * Tools are adapted via toBibAgentTool with lazy context injection.
   */
  protected useCoreTools(names: CoreToolName[]): void {
    const registry = ToolRegistry.getInstance();
    const coreTools = registry.getCoreTools(names);
    // Track tool tiers for security filtering (Phase 4a)
    for (const t of coreTools) {
      this._toolTiers.set(t.name, t.tier);
    }
    const agentTools = coreTools.map((t) =>
      toBibAgentTool(t, () => ({
        dataContext: this.dataContext,
        tenantId: this.dataContext?.tenantId || '',
        mode: this.mode,
      }))
    );
    this.registerTools(agentTools);
    this.filterToolsBySecurity();
  }

  /**
   * Register extension tools by name from the ToolRegistry.
   * Tools are adapted via toBibAgentTool with lazy context injection.
   */
  protected useExtensionTools(names: string[]): void {
    const registry = ToolRegistry.getInstance();
    const tools = names.map((n) => registry.get(n));
    // Track tool tiers for security filtering (Phase 4a)
    for (const t of tools) {
      this._toolTiers.set(t.name, t.tier);
    }
    const agentTools = tools.map((t) =>
      toBibAgentTool(t, () => ({
        dataContext: this.dataContext,
        tenantId: this.dataContext?.tenantId || '',
        mode: this.mode,
      }))
    );
    this.registerTools(agentTools);
    this.filterToolsBySecurity();
  }

  // ===========================================================================
  // Module System (Phase 3)
  // ===========================================================================

  /**
   * Initialize all registered modules.
   * Called after system prompt is built and agent state is set.
   *
   * For each module:
   * 1. Call module.initialize(this) to give it a reference to the agent
   * 2. If the module provides tools, adapt them and register on the agent
   */
  protected initializeModules(): void {
    for (const mod of this.modules) {
      mod.initialize(this);

      const tools = mod.getTools?.();
      if (tools && tools.length > 0) {
        // Track tool tiers for security filtering (Phase 4a)
        for (const t of tools) {
          this._toolTiers.set(t.name, t.tier);
        }
        const agentTools = tools.map((t) =>
          toBibAgentTool(t, () => ({
            dataContext: this.dataContext,
            tenantId: this.dataContext?.tenantId || '',
            mode: this.mode,
          }))
        );
        this.registerTools(agentTools);
      }
    }

    // Filter tools based on security rules (Phase 4a)
    this.filterToolsBySecurity();
  }

  /**
   * Get a module by name.
   * Returns undefined if no module with the given name is registered.
   */
  getModule<T extends BibAgentModule>(name: string): T | undefined {
    return this.modules.find((m) => m.name === name) as T | undefined;
  }

  // ===========================================================================
  // Public Mode — Security & Streaming (Phase 4a)
  // ===========================================================================

  /**
   * Filter registered tools using SecurityModule rules.
   * Removes tools that aren't allowed in the current security mode.
   * Called at the end of initializeModules().
   */
  private filterToolsBySecurity(): void {
    const securityModule = this.getModule<SecurityModule>('security');
    if (!securityModule) return;

    const toRemove: string[] = [];
    for (const [name, tier] of this._toolTiers.entries()) {
      if (!securityModule.isToolAllowed(name, tier as 'core' | 'domain' | 'extension')) {
        toRemove.push(name);
      }
    }

    for (const name of toRemove) {
      this.tools.delete(name);
      this._toolTiers.delete(name);
    }
  }

  /**
   * Append security prompt rules from SecurityModule to the system prompt.
   * Called after initializeModules() in initialize().
   */
  private appendSecurityRules(): void {
    const securityModule = this.getModule<SecurityModule>('security');
    if (!securityModule) return;
    const rules = securityModule.getSecurityPromptRules();
    if (rules) {
      this._systemPrompt += '\n\n' + rules;
    }
  }

  /**
   * Stream a chat response as plain text with pipeline post-processing.
   *
   * For public-mode agents: collects all text from BaseAgent.chatStream(),
   * runs pipeline on assembled text, yields processed result.
   *
   * Tool results are captured via the executeTool() override (same as chat()).
   */
  async *chatStreamText(
    message: string,
    context: AgentContext
  ): AsyncGenerator<string> {
    // Reset tool results for this turn
    this._capturedToolResults = new Map();

    // Collect all text from the base stream
    let assembledText = '';
    for await (const chunk of super.chatStream(message, context)) {
      if (chunk.type === 'text' && chunk.content) {
        assembledText += chunk.content;
      }
      // tool_call and tool_result chunks are handled internally by BaseAgent
    }

    // Run pipeline if configured
    if (assembledText && this.pipeline.getSteps().length > 0) {
      const pipelineCtx: PipelineContext = {
        dataContext: this.dataContext,
        toolResults: this._capturedToolResults,
        allowedValues: this.extractAllowedValues(this._capturedToolResults),
        originalMessage: message,
      };
      const result = this.pipeline.process(assembledText, pipelineCtx);
      assembledText = result.text;
    }

    // Yield the processed text (single yield)
    if (assembledText) {
      yield assembledText;
    }
  }

  // ===========================================================================
  // Private Helpers (Phase 2)
  // ===========================================================================

  /**
   * Extract allowed numeric string values from tool results.
   * Used by NumberGuard to distinguish legitimate numbers from hallucinated ones.
   */
  private extractAllowedValues(toolResults: Map<string, unknown>): Set<string> {
    const values = new Set<string>();
    for (const result of toolResults.values()) {
      this.extractNumericStrings(result, values);
    }
    return values;
  }

  /**
   * Recursively extract numeric strings from a value.
   * Handles numbers, strings containing numbers, arrays, and objects.
   */
  private extractNumericStrings(value: unknown, set: Set<string>): void {
    if (value === null || value === undefined) return;

    if (typeof value === 'number') {
      set.add(String(value));
      set.add(value.toLocaleString());
      return;
    }

    if (typeof value === 'string') {
      // Extract numbers from strings
      const numbers = value.match(/[\d,]+\.?\d*/g);
      if (numbers) {
        for (const n of numbers) {
          set.add(n);
          set.add(n.replace(/,/g, ''));
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.extractNumericStrings(item, set);
      }
      return;
    }

    if (typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        this.extractNumericStrings(v, set);
      }
    }
  }
}

// =============================================================================
// Helper: createEmptyDataContext
// =============================================================================

/**
 * Create an empty DataContext with all fields null/empty.
 * Used for degraded state when initialization fails.
 *
 * @param tenantId - The tenant ID
 * @param error - The error message to set in _meta.loadError
 * @returns DataContext with empty/null fields and loadError set
 */
export function createEmptyDataContext(tenantId: string, error?: string): DataContext {
  const ctx: Omit<DataContext, '_meta'> = {
    tenantId,
    tenantName: '',
    business: {
      name: '',
      category: 'service',
      description: null,
      industry: null,
    },
    contact: {
      phone: null,
      email: null,
      address: null,
      socialMedia: null,
    },
    hours: null,
    services: [],
    products: [],
    faqs: [],
    promotions: [],
    booking: null,
    ordering: null,
    website: {
      scraped: null,
      url: null,
      publishStatus: null,
    },
    brand: {
      voice: null,
      identity: null,
    },
  };

  const meta = computeMeta(ctx);

  return {
    ...ctx,
    _meta: error
      ? { ...meta, loadError: error }
      : meta,
  };
}
