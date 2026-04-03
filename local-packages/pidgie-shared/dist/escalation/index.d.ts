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
declare const DEFAULT_ESCALATION_KEYWORDS: string[];
/**
 * Detect escalation keywords in message text using word-boundary matching.
 */
declare class EscalationDetector {
    private patterns;
    constructor(keywords?: string[]);
    /** Returns true if any escalation keyword is found in the text. */
    detect(text: string): boolean;
}

export { DEFAULT_ESCALATION_KEYWORDS, EscalationDetector };
