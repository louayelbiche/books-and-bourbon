/**
 * Card Tool Migration Feature Flag
 *
 * Controls the rollout of tool-based card emission (new) vs LLM-generated [CARDS] tags (legacy).
 *
 * When CARD_TOOL_MIGRATION=true:
 *   - System prompt does NOT include [CARDS] format instructions
 *   - Response parser skips [CARDS] tag extraction
 *   - Cards are emitted via DB-validated tool results
 *
 * When CARD_TOOL_MIGRATION=false (default):
 *   - Legacy behavior: LLM generates [CARDS] JSON in response text
 *   - parseStructuredResponse extracts and validates cards from response
 *
 * Env var: CARD_TOOL_MIGRATION (true/false, default false)
 */

/**
 * Check if the card tool migration is enabled.
 * Reads from CARD_TOOL_MIGRATION environment variable.
 * Returns false by default (safe rollout — legacy behavior preserved).
 */
export function isCardToolMigrationEnabled(): boolean {
  const flag = typeof process !== 'undefined'
    ? process.env.CARD_TOOL_MIGRATION
    : undefined;
  return flag === 'true' || flag === '1';
}

/**
 * Analytics event identifier for migration fallback tracking (EVT-07).
 * Fired when the legacy [CARDS] path is used — either because the flag is off
 * or because tool-based emission encountered an error.
 */
export const MIGRATION_FALLBACK_EVENT = 'EVT-07' as const;

export type MigrationFallbackReason = 'flag_off' | 'tool_error';

export interface MigrationFallbackEvent {
  event: typeof MIGRATION_FALLBACK_EVENT;
  agentType: string;
  reason: MigrationFallbackReason;
  siteName?: string;
  timestamp: number;
}

/**
 * Create a structured migration fallback analytics event.
 */
export function toMigrationFallbackEvent(
  agentType: string,
  reason: MigrationFallbackReason,
  siteName?: string,
): MigrationFallbackEvent {
  return {
    event: MIGRATION_FALLBACK_EVENT,
    agentType,
    reason,
    siteName,
    timestamp: Date.now(),
  };
}
