/**
 * Returns a human-readable staleness label for a card, or null if the card is still "live".
 * Cards are considered live for `thresholdMs` (default: 1 hour) from generation time.
 *
 * Handles LLM-generated timestamps that may be in Unix seconds instead of milliseconds.
 */
export function getStalenessLabel(generatedAt: number, thresholdMs: number = 3600000): string | null {
  // Auto-detect seconds vs milliseconds: timestamps < 1e12 are clearly Unix seconds
  const normalizedAt = generatedAt < 1e12 ? generatedAt * 1000 : generatedAt;

  const age = Date.now() - normalizedAt;
  if (age < thresholdMs) return null;

  const hours = Math.floor(age / 3600000);
  if (hours < 1) return null;
  if (hours === 1) return 'Generated 1 hour ago';
  if (hours < 24) return `Generated ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days > 365) return null; // Defensive: clearly wrong timestamp
  return `Generated ${days} day${days > 1 ? 's' : ''} ago`;
}
