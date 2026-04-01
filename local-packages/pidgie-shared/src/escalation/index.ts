/**
 * Escalation Detection
 *
 * Detects when a user wants to speak with a human or needs help
 * beyond the bot's capabilities. Used across all channels.
 *
 * @example
 * ```typescript
 * import { EscalationDetector, DEFAULT_ESCALATION_KEYWORDS } from '@runwell/pidgie-shared/escalation';
 *
 * const detector = new EscalationDetector(DEFAULT_ESCALATION_KEYWORDS);
 * detector.detect("I want to speak to a representative"); // true
 * detector.detect("What are your products?"); // false
 * ```
 */

/** Default keywords that trigger escalation. */
export const DEFAULT_ESCALATION_KEYWORDS = [
  'callback',
  'representative',
  'human',
  'manager',
  'speak to someone',
  'real person',
  'talk to a person',
  'customer service',
  'support agent',
];

/**
 * Detect escalation keywords in message text using word-boundary matching.
 */
export class EscalationDetector {
  private patterns: RegExp[];

  constructor(keywords: string[] = DEFAULT_ESCALATION_KEYWORDS) {
    this.patterns = keywords.map((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i');
    });
  }

  /** Returns true if any escalation keyword is found in the text. */
  detect(text: string): boolean {
    return this.patterns.some((pattern) => pattern.test(text));
  }
}
