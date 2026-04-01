import { createHash } from "crypto";

/**
 * Hash content for comparison/change detection.
 * Normalizes content before hashing to reduce false positives.
 */
export function hashContent(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000); // First 10K chars for consistency

  return createHash("sha256").update(normalized).digest("hex");
}
