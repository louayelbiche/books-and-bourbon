/**
 * Core type definitions for agent-core
 */

// =============================================================================
// Tool Types
// =============================================================================

/**
 * Definition of a tool that an agent can use
 */
export interface AgentTool {
  /** Unique name for the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema for tool parameters */
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  /** Function that executes the tool */
  execute: (args: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolParameter;
}

/**
 * Tool declaration for LLM (without execute function)
 */
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * Tool masking - temporarily disables a tool with reason
 */
export interface ToolMask {
  toolName: string;
  reason: string;
  maskedAt: Date;
  maskedUntil?: Date;
}

// =============================================================================
// Context Types
// =============================================================================

/**
 * Context passed to agent for processing
 */
export interface AgentContext {
  /** BIB client/business identifier */
  clientId: string;
  /** Conversation session identifier */
  sessionId: string;
  /** Authenticated user ID (optional, for Advisor) */
  userId?: string;
  /** Current user query/message */
  query?: string;
  /** Conversation history */
  conversationHistory?: ChatMessage[];
  /** Results from previous agent analyses */
  previousAnalyses?: Map<string, string>;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result returned from agent analysis/chat
 */
export interface AgentResult {
  /** Type of agent that produced this result */
  agentType: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Human-readable response text */
  response: string;
  /** Structured findings/data */
  findings?: Record<string, unknown>;
  /** List of recommendations */
  recommendations?: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Chat Types
// =============================================================================

/**
 * A message in a conversation
 */
export interface ChatMessage {
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** When the message was sent */
  timestamp?: Date;
  /** Tool calls made in this message */
  toolCalls?: FunctionCall[];
  /** Tool results from this message */
  toolResults?: ToolResult[];
}

/**
 * A function/tool call made by the LLM
 */
export interface FunctionCall {
  /** Name of the function to call */
  name: string;
  /** Arguments to pass to the function */
  args: Record<string, unknown>;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /** Name of the tool that was called */
  toolName: string;
  /** Result of the tool execution */
  result: unknown;
  /** Error if the tool failed */
  error?: string;
}

/**
 * Response from a chat interaction
 */
export interface ChatResponse {
  /** The response text */
  text: string;
  /** Function calls made during response */
  functionCalls?: FunctionCall[];
  /** Finish reason from LLM */
  finishReason?: string;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =============================================================================
// Streaming Types
// =============================================================================

/**
 * A chunk in a streaming response
 */
export interface StreamChunk {
  /** Type of chunk */
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  /** Content of the chunk */
  content: string;
  /** Function call data (if type is tool_call) */
  functionCall?: FunctionCall;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Controlled diversity configuration for agents
 */
export interface DiversityConfig {
  /** Temperature variation from base (0-0.2) */
  temperatureVariation: number;
  /** Alternative prompt phrasings */
  promptVariations: string[];
  /** Unique observation prefix per agent */
  observationSalt: string;
}

/**
 * Configuration for the agent orchestrator
 */
export interface OrchestratorConfig {
  /** Maximum agents to run in parallel */
  maxParallelAgents?: number;
  /** Timeout for agent execution in ms */
  timeoutMs?: number;
  /** List of enabled agent types */
  enabledAgents?: string[];
}

// =============================================================================
// LLM Types
// =============================================================================

/**
 * Configuration for LLM client
 */
export interface LLMConfig {
  /** API key for the LLM provider */
  apiKey: string;
  /** Model to use */
  model?: string;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens to generate */
  maxOutputTokens?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Base delay for retry backoff in ms */
  baseDelayMs?: number;
}

/**
 * Options for content generation
 */
export interface GenerateOptions {
  /** Temperature override */
  temperature?: number;
  /** Max tokens override */
  maxOutputTokens?: number;
  /** System prompt */
  systemPrompt?: string;
  /** Tools available for this generation */
  tools?: ToolDeclaration[];
  /** Stop sequences */
  stopSequences?: string[];
}

/**
 * Result from content generation
 */
export interface GenerationResult {
  /** Generated text */
  text: string;
  /** Function calls made */
  functionCalls?: FunctionCall[];
  /** Why generation stopped */
  finishReason?: string;
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =============================================================================
// Security Types
// =============================================================================

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Maximum input length in characters */
  maxInputLength: number;
  /** Maximum output length in characters */
  maxOutputLength: number;
  /** Maximum messages per session */
  maxMessagesPerSession: number;
  /** Maximum sessions per IP per hour */
  maxSessionsPerIP: number;
  /** Enable injection pattern detection */
  enableInjectionDetection: boolean;
  /** Enable output scanning for secrets/PII */
  enableOutputScanning: boolean;
  /** Canary tokens to detect in output */
  canaryTokens: string[];
  /** Input patterns to block */
  blockedPatterns: RegExp[];
}

/**
 * Result of input validation
 */
export interface ValidationResult {
  /** Whether input is safe */
  safe: boolean;
  /** Detected threats */
  threats: ThreatDetection[];
  /** Sanitized input */
  sanitized: string;
}

/**
 * A detected threat in input/output
 */
export interface ThreatDetection {
  /** Type of threat */
  type: ThreatType;
  /** Pattern that matched */
  pattern?: string;
  /** Description of the threat */
  description: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type ThreatType =
  | 'direct_injection'
  | 'indirect_injection'
  | 'role_manipulation'
  | 'delimiter_attack'
  | 'encoding_attack'
  | 'secret_extraction'
  | 'prompt_leakage'
  | 'pii_exposure'
  | 'secret_exposure';

/**
 * Security event for logging
 */
export interface SecurityEvent {
  /** Event type */
  type: SecurityEventType;
  /** Session that triggered the event */
  sessionId?: string;
  /** IP address if available */
  ip?: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description of what happened */
  description?: string;
  /** Additional data/details */
  details?: Record<string, unknown>;
  /** When the event occurred */
  timestamp: Date;
}

export type SecurityEventType =
  | 'INJECTION_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROMPT_LEAKAGE'
  | 'PII_IN_OUTPUT'
  | 'SECRET_IN_OUTPUT'
  | 'SECRET_EXTRACTION_ATTEMPT'
  | 'TOOL_ABUSE_ATTEMPT'
  | 'JAILBREAK_ATTEMPT'
  | 'SESSION_TERMINATED'
  // Additional lowercase event types for internal use
  | 'rate_limited'
  | 'extraction_attempt'
  | 'input_threat'
  | 'output_threat';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current count in window */
  current: number;
  /** Maximum allowed in window */
  limit: number;
  /** When the window resets */
  resetAt: Date;
  /** Seconds until reset */
  retryAfter?: number;
}

// =============================================================================
// Memory Types
// =============================================================================

/**
 * Session data stored in memory
 */
export interface SessionData {
  /** Session identifier */
  sessionId: string;
  /** Client/business identifier */
  clientId: string;
  /** User identifier (if authenticated) */
  userId?: string;
  /** When session started */
  startedAt: Date;
  /** When session was last active */
  lastActiveAt: Date;
  /** Conversation messages */
  messages: ChatMessage[];
  /** Session goals/context */
  goals?: string[];
  /** Whether session is complete */
  completed: boolean;
  /** Session metadata */
  metadata?: Record<string, unknown>;
}
