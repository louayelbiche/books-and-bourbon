/**
 * Card Validation Types
 *
 * Types for the DB-only card validation layer.
 * All card data must come from database records, never from LLM output.
 */

import type { ChatCard, CardType } from '../types.js';

/**
 * Extended card types for dashboard agents.
 * Extends the base CardType with agent-specific types.
 */
export type AgentCardType =
  | CardType
  // Campaign agent
  | 'brand-profile'
  | 'recipient-table'
  | 'email-preview'
  | 'campaign-summary'
  // Engagement agent
  | 'persona'
  | 'subject-line'
  | 'newsletter-preview'
  | 'section'
  | 'newsletter-summary'
  // Social agent
  | 'brand-analysis'
  | 'social-post'
  | 'linkedin-preview'
  | 'week-overview'
  // Pidgie dashboard
  | 'business-breakdown'
  // AI Advisor
  | 'advisor-metric'
  | 'advisor-insight'
  // Marketing agent
  | 'pain-point'
  | 'ad-brief'
  | 'ad-script'
  | 'ad-image'
  | 'competitor-pattern'
  | 'ab-test-plan'
  | 'ad-campaign-summary'
  | 'image-batch'
  // Lead Scout agent
  | 'lead-pipeline-summary'
  // Reputation Scout agent
  | 'reputation-summary'
  | 'assessment-summary'
  | 'pillar-detail'
  | 'gap-recommendation';

/**
 * A card that has been validated against a DB record.
 * The `source` field proves provenance — every field came from this record.
 */
export interface ValidatedCard {
  type: AgentCardType;
  id: string;
  data: Record<string, unknown>;
  source: {
    table: string;
    recordId: string;
    tenantId: string;
    validatedAt: number;
  };
}

/**
 * Result of a card validation attempt.
 */
export type CardValidationResult =
  | { success: true; card: ValidatedCard }
  | { success: false; reason: CardDropReason; type: AgentCardType; recordId: string };

/**
 * Reasons a card can be dropped by the validation layer.
 */
export type CardDropReason =
  | 'record_not_found'
  | 'query_failed'
  | 'invalid_record_id'
  | 'tenant_mismatch'
  | 'mapping_error';

/**
 * Structured log entry for a dropped card.
 */
export interface CardDropLog {
  event: 'card-validation-drop';
  cardType: AgentCardType;
  recordId: string;
  reason: CardDropReason;
  agentType?: string;
  tenantId?: string;
  timestamp: number;
  error?: string;
}

/**
 * Structured log entry for a successfully rendered card.
 */
export interface CardRenderLog {
  event: 'card-rendered';
  cardType: AgentCardType;
  recordId: string;
  agentType?: string;
  source: 'db';
  timestamp: number;
}

/**
 * Function signature for card mappers.
 * Each card type has a mapper that converts a DB record to a ValidatedCard.
 */
export type CardMapper<TRecord = unknown> = (
  record: TRecord,
  tenantId: string,
) => ValidatedCard;

// =============================================================================
// Analytics Events (EVT-01, EVT-02)
// =============================================================================

/**
 * EVT-01: card_rendered — fired when a validated card is successfully emitted.
 * Source is always 'db' to confirm DB-only sourcing.
 */
export interface CardRenderedEvent {
  event: 'card_rendered';
  properties: {
    cardType: AgentCardType;
    agentType: string;
    recordId: string;
    tenantId: string;
    source: 'db';
    timestamp: number;
  };
}

/**
 * EVT-02: card_dropped — fired when a card is dropped by the validation layer.
 */
export interface CardDroppedEvent {
  event: 'card_dropped';
  properties: {
    cardType: AgentCardType;
    agentType: string;
    reason: CardDropReason;
    recordId: string;
    tenantId: string;
    timestamp: number;
    error?: string;
  };
}

/**
 * Union of all card analytics events.
 */
export type CardAnalyticsEvent = CardRenderedEvent | CardDroppedEvent;

// =============================================================================
// Action Payload Validation
// =============================================================================

/**
 * Payload from an action pill that references a record.
 */
export interface ActionPayload {
  action: string;
  recordId: string;
  cardType: AgentCardType;
  [key: string]: unknown;
}

/**
 * Result of validating an action payload.
 */
export type ActionPayloadValidationResult =
  | { valid: true; recordId: string; cardType: AgentCardType }
  | { valid: false; error: string };
