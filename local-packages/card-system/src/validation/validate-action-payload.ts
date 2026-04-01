/**
 * Action Payload Validation
 *
 * Validates record IDs in action pill payloads before execution.
 * Ensures the referenced record exists in the DB before any action is taken.
 */

import { validateRecordId } from './validate-record-id.js';
import type { ActionPayload, ActionPayloadValidationResult } from './types.js';
import type { CardQueryFn } from './build-card.js';

/**
 * Validate an action payload's record reference.
 *
 * 1. Validates the record ID format
 * 2. Queries the DB to confirm the record exists
 * 3. Returns validation result with error message for the user
 *
 * @param payload - The action payload from the pill click
 * @param tenantId - The tenant ID for scoping
 * @param queryFn - Function to query the DB
 */
export async function validateActionPayload(
  payload: ActionPayload,
  tenantId: string,
  queryFn: CardQueryFn,
): Promise<ActionPayloadValidationResult> {
  const { recordId, cardType } = payload;

  // Step 1: Validate ID format
  if (!validateRecordId(recordId)) {
    return {
      valid: false,
      error: 'Invalid record reference. Please try again.',
    };
  }

  // Step 2: Confirm record exists in DB
  try {
    const record = await queryFn(cardType, recordId, tenantId);
    if (!record) {
      return {
        valid: false,
        error: 'The referenced item no longer exists. It may have been removed.',
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Unable to verify the referenced item. Please try again later.',
    };
  }

  return { valid: true, recordId, cardType };
}
