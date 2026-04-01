/**
 * @runwell/agent-core
 *
 * Core AI agent infrastructure for Business in a Box.
 *
 * @example
 * ```typescript
 * import { BaseAgent, GeminiClient } from '@runwell/agent-core';
 *
 * class MyAgent extends BaseAgent {
 *   readonly agentType = 'my-agent';
 *   readonly systemPrompt = 'You are a helpful assistant.';
 *
 *   async analyze(context: AgentContext): Promise<AgentResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Tool types
  AgentTool,
  ToolParameter,
  ToolDeclaration,
  ToolMask,

  // Context types
  AgentContext,

  // Result types
  AgentResult,

  // Chat types
  ChatMessage,
  FunctionCall,
  ToolResult,
  ChatResponse,

  // Streaming types
  StreamChunk,

  // Configuration types
  DiversityConfig,
  OrchestratorConfig,
  LLMConfig,
  GenerateOptions,
  GenerationResult,

  // Security types
  SecurityConfig,
  ValidationResult,
  ThreatDetection,
  ThreatType,
  SecurityEvent,
  SecurityEventType,
  RateLimitResult,

  // Memory types
  SessionData,
} from './types/index.js';

// =============================================================================
// Base Agent
// =============================================================================

export { BaseAgent } from './base/index.js';

// =============================================================================
// LLM Clients
// =============================================================================

export type { LLMClient, RetryConfig, GeminiConfig } from './llm/index.js';

export {
  GeminiClient,
  getGeminiClient,
  resetGeminiClient,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  calculateBackoff,
  sleep,
} from './llm/index.js';

// =============================================================================
// Memory
// =============================================================================

export type { SessionMemory, FilesystemMemoryConfig } from './memory/index.js';

export {
  FilesystemMemory,
  getFilesystemMemory,
  resetFilesystemMemory,
} from './memory/index.js';

// =============================================================================
// Security
// =============================================================================

export type {
  InputValidatorConfig,
  SecretsGuardConfig,
  SecretDetection,
  OutputValidatorConfig,
  PIIDetection,
  RateLimitConfig,
  RateLimiterStats,
  SecurityGuardConfig,
  ComprehensiveValidationResult,
} from './security/index.js';

export {
  // Unified guard
  SecurityGuard,
  createSecurityGuard,
  createStrictSecurityGuard,
  DEFAULT_SECURITY_CONFIG,
  STRICT_SECURITY_CONFIG,

  // Individual components
  InputValidator,
  SecretsGuard,
  OutputValidator,
  RateLimiter,
  createRateLimiter,

  // Presets
  STRICT_RATE_LIMIT_CONFIG,
  RELAXED_RATE_LIMIT_CONFIG,

  // Pattern exports for extension
  API_KEY_PATTERNS,
  DATABASE_PATTERNS,
  TOKEN_PATTERNS,
  PASSWORD_PATTERNS,
  SENSITIVE_ENV_VARS,
  EXTRACTION_PATTERNS,
  PII_PATTERNS,
} from './security/index.js';
