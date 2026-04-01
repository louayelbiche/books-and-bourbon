/**
 * Output Validator
 *
 * Validates LLM output for security issues:
 * - Canary token leakage (system prompt exposure)
 * - PII detection
 * - Secret/credential detection
 * - Policy violations
 */

import type { ValidationResult, ThreatDetection } from '../types/index.js';
import { SecretsGuard } from './secrets-guard.js';

/**
 * Output validation configuration
 */
export interface OutputValidatorConfig {
  /** Maximum output length */
  maxLength: number;
  /** Enable canary token detection */
  detectCanary: boolean;
  /** Enable PII detection */
  detectPII: boolean;
  /** Enable secrets detection */
  detectSecrets: boolean;
  /** Custom canary tokens to check */
  canaryTokens: string[];
  /** System prompt fragments to watch for (hash-based leak detection) */
  promptFragments: string[];
}

const DEFAULT_CONFIG: OutputValidatorConfig = {
  maxLength: 4000,
  detectCanary: true,
  detectPII: true,
  detectSecrets: true,
  canaryTokens: [],
  promptFragments: [],
};

/**
 * PII patterns to detect
 */
const PII_PATTERNS: Array<{ pattern: RegExp; name: string; severity: 'medium' | 'high' }> = [
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    name: 'Email address',
    severity: 'medium',
  },
  // Phone numbers (various formats)
  {
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    name: 'Phone number (US)',
    severity: 'medium',
  },
  {
    pattern: /\+[0-9]{1,3}[-.\s]?[0-9]{6,14}/g,
    name: 'Phone number (International)',
    severity: 'medium',
  },
  // SSN
  {
    pattern: /\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b/g,
    name: 'Social Security Number',
    severity: 'high',
  },
  // Credit card numbers (basic patterns)
  {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    name: 'Credit card number',
    severity: 'high',
  },
  {
    pattern: /\b[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
    name: 'Credit card number (formatted)',
    severity: 'high',
  },
  // IP addresses (internal)
  {
    pattern: /\b(?:10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3})\b/g,
    name: 'Internal IP address',
    severity: 'medium',
  },
];

/**
 * PII detection result
 */
export interface PIIDetection {
  type: string;
  pattern: string;
  count: number;
  severity: 'medium' | 'high';
}

/**
 * Output Validator class
 */
export class OutputValidator {
  private config: OutputValidatorConfig;
  private secretsGuard: SecretsGuard;
  private registeredCanaries: Set<string> = new Set();

  constructor(config?: Partial<OutputValidatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.secretsGuard = new SecretsGuard();

    // Register any configured canary tokens
    for (const token of this.config.canaryTokens) {
      this.registeredCanaries.add(token);
    }
  }

  /**
   * Generate a unique canary token
   */
  generateCanary(): string {
    const id = Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
    const canary = `[CANARY:${id}]`;
    this.registeredCanaries.add(canary);
    return canary;
  }

  /**
   * Register a canary token to watch for
   */
  registerCanary(token: string): void {
    this.registeredCanaries.add(token);
  }

  /**
   * Validate output
   */
  validate(output: string): ValidationResult {
    const threats: ThreatDetection[] = [];

    // Check length
    if (output.length > this.config.maxLength) {
      threats.push({
        type: 'direct_injection',
        description: `Output exceeds maximum length of ${this.config.maxLength} characters`,
        severity: 'low',
      });
    }

    // Check for canary tokens
    if (this.config.detectCanary) {
      const canaryThreats = this.detectCanaryLeakage(output);
      threats.push(...canaryThreats);
    }

    // Check for system prompt fragment leakage
    if (this.config.promptFragments.length > 0) {
      const fragmentThreats = this.detectPromptLeakage(output);
      threats.push(...fragmentThreats);
    }

    // Check for PII
    if (this.config.detectPII) {
      const piiDetections = this.detectPII(output);
      for (const detection of piiDetections) {
        threats.push({
          type: 'pii_exposure',
          pattern: detection.pattern,
          description: `${detection.type} detected (${detection.count} occurrences)`,
          severity: detection.severity,
        });
      }
    }

    // Check for secrets
    if (this.config.detectSecrets) {
      const secretDetections = this.secretsGuard.scanForSecrets(output);
      threats.push(...this.secretsGuard.toThreats(secretDetections));
    }

    const safe = threats.length === 0;
    const sanitized = safe ? output : this.sanitize(output);

    return {
      safe,
      threats,
      sanitized,
    };
  }

  /**
   * Check for canary token leakage
   */
  /**
   * Detect system prompt fragments in output (hash-based leak detection).
   * Checks if the LLM output contains verbatim fragments from the system prompt.
   */
  detectPromptLeakage(output: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];
    const lowerOutput = output.toLowerCase();

    for (const fragment of this.config.promptFragments) {
      // Only check fragments of meaningful length (avoid false positives on short strings)
      if (fragment.length < 20) continue;
      if (lowerOutput.includes(fragment.toLowerCase())) {
        threats.push({
          type: 'prompt_leakage',
          pattern: 'prompt_fragment',
          description: 'System prompt content detected in output',
          severity: 'critical',
        });
        break; // One detection is enough
      }
    }

    return threats;
  }

  detectCanaryLeakage(output: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    // Check registered canaries
    for (const canary of this.registeredCanaries) {
      if (output.includes(canary)) {
        threats.push({
          type: 'prompt_leakage',
          pattern: 'canary_token',
          description: 'System prompt canary token detected in output',
          severity: 'critical',
        });
      }
    }

    // Check for generic canary pattern
    const canaryPattern = /\[CANARY:[a-zA-Z0-9]+\]/g;
    if (canaryPattern.test(output)) {
      threats.push({
        type: 'prompt_leakage',
        pattern: 'canary_pattern',
        description: 'Canary token pattern detected in output',
        severity: 'critical',
      });
    }

    return threats;
  }

  /**
   * Detect PII in output
   */
  detectPII(output: string): PIIDetection[] {
    const detections: PIIDetection[] = [];

    for (const { pattern, name, severity } of PII_PATTERNS) {
      const matches = output.match(new RegExp(pattern));
      if (matches && matches.length > 0) {
        detections.push({
          type: name,
          pattern: pattern.source,
          count: matches.length,
          severity,
        });
      }
    }

    return detections;
  }

  /**
   * Check if output contains any secrets
   */
  hasSecrets(output: string): boolean {
    return this.secretsGuard.scanForSecrets(output).length > 0;
  }

  /**
   * Sanitize output by removing sensitive content
   */
  sanitize(output: string): string {
    let sanitized = output;

    // Truncate if too long
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.slice(0, this.config.maxLength) + '...';
    }

    // Remove canary tokens
    sanitized = sanitized.replace(/\[CANARY:[a-zA-Z0-9]+\]/g, '[REMOVED]');

    // Redact secrets
    sanitized = this.secretsGuard.redactSecrets(sanitized);

    // Redact PII (basic - replace with placeholder)
    for (const { pattern } of PII_PATTERNS) {
      sanitized = sanitized.replace(new RegExp(pattern), '[PII_REDACTED]');
    }

    return sanitized;
  }

  /**
   * Quick check if output is safe (no critical issues)
   */
  isSafe(output: string): boolean {
    // Quick checks without full validation
    for (const canary of this.registeredCanaries) {
      if (output.includes(canary)) return false;
    }

    if (/\[CANARY:[a-zA-Z0-9]+\]/g.test(output)) return false;

    const secrets = this.secretsGuard.scanForSecrets(output);
    if (secrets.some((s) => s.severity === 'critical')) return false;

    return true;
  }
}

/**
 * Export PII patterns for testing/extension
 */
export { PII_PATTERNS };
