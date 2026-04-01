/**
 * Card Builder — DB-Only Card Construction
 *
 * Core validation layer: queries DB by record ID, builds card from DB fields.
 * The LLM decides WHEN and WHICH card to show. The DB decides WHAT it contains.
 *
 * Every card field comes from a database record. No LLM-generated data.
 */

import { validateRecordId } from './validate-record-id.js';
import type {
  AgentCardType,
  ValidatedCard,
  CardValidationResult,
  CardDropLog,
  CardRenderLog,
  CardMapper,
} from './types.js';

/**
 * Registry of card mappers per type.
 * Each mapper converts a Prisma record to a ValidatedCard.
 */
const mapperRegistry = new Map<AgentCardType, CardMapper>();

/**
 * Register a mapper for a card type.
 * Called at startup by each agent/module to register its card types.
 */
export function registerCardMapper<TRecord = unknown>(
  type: AgentCardType,
  mapper: CardMapper<TRecord>,
): void {
  mapperRegistry.set(type, mapper as CardMapper);
}

/**
 * Query function signature — provided by the caller (route handler).
 * Abstracts away Prisma so the validation layer is testable.
 */
export type CardQueryFn = (
  type: AgentCardType,
  recordId: string,
  tenantId: string,
) => Promise<unknown | null>;

/**
 * Logger function signature — provided by the caller.
 * Abstracts away the logging implementation.
 */
export interface CardValidationLogger {
  onDrop: (log: CardDropLog) => void;
  onRender: (log: CardRenderLog) => void;
}

const noopLogger: CardValidationLogger = {
  onDrop: () => {},
  onRender: () => {},
};

/**
 * Build a validated card from a DB record.
 *
 * This is the core function of the validation layer:
 * 1. Validates the record ID format
 * 2. Queries the DB for the record
 * 3. Maps the record to a card using the registered mapper
 * 4. Returns the validated card or null (with logging)
 *
 * @param type - The card type to build
 * @param recordId - The DB record ID
 * @param tenantId - The tenant ID for scoping
 * @param queryFn - Function to query the DB
 * @param logger - Optional logger for drops/renders
 */
export async function buildCardFromDB(
  type: AgentCardType,
  recordId: string,
  tenantId: string,
  queryFn: CardQueryFn,
  logger: CardValidationLogger = noopLogger,
): Promise<CardValidationResult> {
  const timestamp = Date.now();

  // Step 1: Validate record ID format
  if (!validateRecordId(recordId)) {
    const dropLog: CardDropLog = {
      event: 'card-validation-drop',
      cardType: type,
      recordId,
      reason: 'invalid_record_id',
      tenantId,
      timestamp,
    };
    logger.onDrop(dropLog);
    return { success: false, reason: 'invalid_record_id', type, recordId };
  }

  // Step 2: Query DB for the record
  let record: unknown;
  try {
    record = await queryFn(type, recordId, tenantId);
  } catch (error) {
    const dropLog: CardDropLog = {
      event: 'card-validation-drop',
      cardType: type,
      recordId,
      reason: 'query_failed',
      tenantId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    };
    logger.onDrop(dropLog);
    return { success: false, reason: 'query_failed', type, recordId };
  }

  if (!record) {
    const dropLog: CardDropLog = {
      event: 'card-validation-drop',
      cardType: type,
      recordId,
      reason: 'record_not_found',
      tenantId,
      timestamp,
    };
    logger.onDrop(dropLog);
    return { success: false, reason: 'record_not_found', type, recordId };
  }

  // Step 3: Map record to card using registered mapper
  const mapper = mapperRegistry.get(type);
  if (!mapper) {
    const dropLog: CardDropLog = {
      event: 'card-validation-drop',
      cardType: type,
      recordId,
      reason: 'mapping_error',
      tenantId,
      timestamp,
      error: `No mapper registered for card type: ${type}`,
    };
    logger.onDrop(dropLog);
    return { success: false, reason: 'mapping_error', type, recordId };
  }

  let card: ValidatedCard;
  try {
    card = mapper(record, tenantId);
  } catch (error) {
    const dropLog: CardDropLog = {
      event: 'card-validation-drop',
      cardType: type,
      recordId,
      reason: 'mapping_error',
      tenantId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    };
    logger.onDrop(dropLog);
    return { success: false, reason: 'mapping_error', type, recordId };
  }

  // Step 4: Log successful render
  const renderLog: CardRenderLog = {
    event: 'card-rendered',
    cardType: type,
    recordId,
    source: 'db',
    timestamp,
  };
  logger.onRender(renderLog);

  return { success: true, card };
}

/**
 * Build multiple cards from DB records.
 * Drops invalid cards silently (with logging), returns only valid ones.
 */
export async function buildCardsFromDB(
  items: Array<{ type: AgentCardType; recordId: string }>,
  tenantId: string,
  queryFn: CardQueryFn,
  logger: CardValidationLogger = noopLogger,
): Promise<ValidatedCard[]> {
  const results = await Promise.all(
    items.map(({ type, recordId }) =>
      buildCardFromDB(type, recordId, tenantId, queryFn, logger),
    ),
  );

  return results
    .filter((r): r is { success: true; card: ValidatedCard } => r.success)
    .map((r) => r.card);
}
