/**
 * LLM Security Module
 *
 * Shared security utilities for all Runwell chatbots.
 * Provides attack detection, input sanitization, and output scanning.
 */

export {
  detectAttacks,
  hasAttackPattern,
  ALL_ATTACK_PATTERNS,
  INJECTION_PATTERNS,
  JAILBREAK_PATTERNS,
  EXTRACTION_PATTERNS,
  ENCODING_PATTERNS,
  SOCIAL_PATTERNS,
} from './attack-patterns.js';
export type { AttackPattern } from './attack-patterns.js';

export {
  sanitizeInput,
} from './input-sanitizer.js';
export type { SanitizeOptions, SanitizeResult } from './input-sanitizer.js';

export {
  scanOutput,
} from './output-scanner.js';
export type { OutputScanResult, OutputIssue } from './output-scanner.js';
