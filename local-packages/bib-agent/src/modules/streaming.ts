/**
 * StreamingModule — Streaming configuration for BIB agents
 *
 * Configuration-only module (no tools) that provides:
 * - maxToolRounds: cap on sequential tool execution rounds
 * - idleTimeoutMs: idle detection for stalled streams
 * - plainStringYields: whether to yield plain strings during streaming
 * - systemPromptInUserMessage: whether to inject system prompt in user message
 *
 * @see spec Phase 3a — StreamingModule
 */

import type { BibAgentModule } from './types.js';

// =============================================================================
// Types
// =============================================================================

export interface StreamingConfig {
  /** Maximum sequential tool execution rounds (default 3) */
  maxToolRounds?: number;

  /** Idle timeout in milliseconds (default 20_000) */
  idleTimeoutMs?: number;

  /** Whether to yield plain strings during streaming (default true) */
  plainStringYields?: boolean;

  /** Whether to inject system prompt in user message (default true) */
  systemPromptInUserMessage?: boolean;
}

/** Readonly version of StreamingConfig with all fields required */
export interface ResolvedStreamingConfig {
  readonly maxToolRounds: number;
  readonly idleTimeoutMs: number;
  readonly plainStringYields: boolean;
  readonly systemPromptInUserMessage: boolean;
}

// =============================================================================
// StreamingModule
// =============================================================================

export class StreamingModule implements BibAgentModule {
  readonly name = 'streaming';

  /** Resolved configuration with defaults applied */
  private readonly _config: ResolvedStreamingConfig;

  /** Agent reference (set during initialize) */
  private agent: any;

  constructor(config?: StreamingConfig) {
    this._config = Object.freeze({
      maxToolRounds: config?.maxToolRounds ?? 3,
      idleTimeoutMs: config?.idleTimeoutMs ?? 20_000,
      plainStringYields: config?.plainStringYields ?? true,
      systemPromptInUserMessage: config?.systemPromptInUserMessage ?? true,
    });
  }

  // ---------------------------------------------------------------------------
  // BibAgentModule lifecycle
  // ---------------------------------------------------------------------------

  initialize(agent: any): void {
    this.agent = agent;
  }

  // ---------------------------------------------------------------------------
  // Configuration Access
  // ---------------------------------------------------------------------------

  /** Get the readonly resolved configuration */
  get config(): ResolvedStreamingConfig {
    return this._config;
  }

  // ---------------------------------------------------------------------------
  // Guard Methods
  // ---------------------------------------------------------------------------

  /**
   * Check if another tool call round is allowed.
   * Returns false when currentRound >= maxToolRounds.
   */
  shouldAllowToolCall(currentRound: number): boolean {
    return currentRound < this._config.maxToolRounds;
  }

  /**
   * Check if the stream has been idle too long.
   * Returns true if time since lastChunkTimestamp exceeds idleTimeoutMs.
   */
  isIdleTimedOut(lastChunkTimestamp: number): boolean {
    return Date.now() - lastChunkTimestamp >= this._config.idleTimeoutMs;
  }

  // ---------------------------------------------------------------------------
  // No tools — streaming is a configuration-only module
  // ---------------------------------------------------------------------------
}
