/**
 * Card Analytics Events
 *
 * Transforms validation logs into analytics events for tracking.
 * EVT-01: card_rendered — successful card emission
 * EVT-02: card_dropped — card dropped by validation layer
 */

import type {
  CardDropLog,
  CardRenderLog,
  CardRenderedEvent,
  CardDroppedEvent,
  CardAnalyticsEvent,
} from './types.js';

/**
 * Convert a render log to a card_rendered analytics event (EVT-01).
 *
 * @param log - The render log from buildCardFromDB
 * @param agentType - The agent type that triggered the card
 */
export function toCardRenderedEvent(
  log: CardRenderLog,
  agentType: string,
  tenantId: string,
): CardRenderedEvent {
  return {
    event: 'card_rendered',
    properties: {
      cardType: log.cardType,
      agentType,
      recordId: log.recordId,
      tenantId,
      source: 'db',
      timestamp: log.timestamp,
    },
  };
}

/**
 * Convert a drop log to a card_dropped analytics event (EVT-02).
 *
 * @param log - The drop log from buildCardFromDB
 * @param agentType - The agent type that triggered the card
 */
export function toCardDroppedEvent(
  log: CardDropLog,
  agentType: string,
): CardDroppedEvent {
  return {
    event: 'card_dropped',
    properties: {
      cardType: log.cardType,
      agentType,
      reason: log.reason,
      recordId: log.recordId,
      tenantId: log.tenantId ?? '',
      timestamp: log.timestamp,
      error: log.error,
    },
  };
}
