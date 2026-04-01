/**
 * Record ID Validation
 *
 * Validates record IDs before DB queries to prevent
 * injection and wasted queries on malformed IDs.
 */

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Also accept CUID format (used by some Prisma schemas)
const CUID_REGEX = /^c[a-z0-9]{23,}$/;

/**
 * Validates that a string is a valid record ID (UUID v4 or CUID).
 * Must be called before any DB query to prevent wasted lookups.
 */
export function validateRecordId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (id.length === 0) return false;
  return UUID_V4_REGEX.test(id) || CUID_REGEX.test(id);
}
