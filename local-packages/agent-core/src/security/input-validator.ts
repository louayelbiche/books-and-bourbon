/**
 * Input Validator
 *
 * Detects and blocks prompt injection attacks, encoding attacks,
 * and other malicious input patterns.
 */

import type { ValidationResult, ThreatDetection, ThreatType } from '../types/index.js';

/**
 * Configuration for input validation
 */
export interface InputValidatorConfig {
  /** Maximum allowed input length */
  maxLength: number;
  /** Enable injection pattern detection */
  detectInjection: boolean;
  /** Enable encoding attack detection */
  detectEncoding: boolean;
  /** Custom blocked patterns */
  customPatterns: RegExp[];
  /** Patterns to allow (bypass detection) */
  allowPatterns: RegExp[];
}

const DEFAULT_CONFIG: InputValidatorConfig = {
  maxLength: 2000,
  detectInjection: true,
  detectEncoding: true,
  customPatterns: [],
  allowPatterns: [],
};

/**
 * Injection patterns to detect
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
  // Direct instruction override attempts
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/i,
    type: 'direct_injection',
    description: 'Attempt to ignore previous instructions',
    severity: 'high',
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier|your)/i,
    type: 'direct_injection',
    description: 'Attempt to disregard instructions',
    severity: 'high',
  },
  {
    pattern: /forget\s+(everything|all|what|your|the)\s*(you|instructions?|rules?|learned)?/i,
    type: 'direct_injection',
    description: 'Attempt to make agent forget instructions',
    severity: 'high',
  },
  {
    pattern: /override\s+(your|all|the|previous)?\s*(instructions?|rules?|programming)/i,
    type: 'direct_injection',
    description: 'Attempt to override instructions',
    severity: 'high',
  },
  {
    pattern: /new\s+(instructions?|rules?|prompt|task):/i,
    type: 'direct_injection',
    description: 'Attempt to inject new instructions',
    severity: 'high',
  },
  {
    pattern: /from\s+now\s+on,?\s+(you|ignore|don't|do\s+not)/i,
    type: 'direct_injection',
    description: 'Attempt to change behavior going forward',
    severity: 'medium',
  },

  // System prompt extraction
  {
    pattern: /system\s*prompt/i,
    type: 'prompt_leakage',
    description: 'Attempt to reference system prompt',
    severity: 'medium',
  },
  {
    pattern: /reveal\s+(your|the)\s+(instructions?|prompt|rules?|programming|system)/i,
    type: 'prompt_leakage',
    description: 'Attempt to reveal instructions',
    severity: 'high',
  },
  {
    pattern: /show\s+(me\s+)?(your|the)\s+(full\s+)?(instructions?|prompt|rules?|system)/i,
    type: 'prompt_leakage',
    description: 'Attempt to show instructions',
    severity: 'high',
  },
  {
    pattern: /what\s+(are|is)\s+(your|the)\s+(initial\s+)?(instructions?|prompt|rules?|programming)/i,
    type: 'prompt_leakage',
    description: 'Attempt to query instructions',
    severity: 'medium',
  },
  {
    pattern: /print\s+(your|the|all)\s*(instructions?|prompt|rules?|system)/i,
    type: 'prompt_leakage',
    description: 'Attempt to print instructions',
    severity: 'high',
  },
  {
    pattern: /output\s+(your|the)\s*(initial\s+)?(instructions?|prompt)/i,
    type: 'prompt_leakage',
    description: 'Attempt to output instructions',
    severity: 'high',
  },

  // Role manipulation
  {
    pattern: /you\s+are\s+now\s+(a|an|the|my)/i,
    type: 'role_manipulation',
    description: 'Attempt to reassign agent role',
    severity: 'high',
  },
  {
    pattern: /pretend\s+(you('re|are)?|to\s+be)\s+(a|an|the|my)?/i,
    type: 'role_manipulation',
    description: 'Attempt to make agent pretend',
    severity: 'high',
  },
  {
    pattern: /act\s+(like|as)\s+(if\s+)?(you('re|are)?|a|an|the)/i,
    type: 'role_manipulation',
    description: 'Attempt to make agent act as something else',
    severity: 'high',
  },
  {
    pattern: /roleplay\s+(as|like)/i,
    type: 'role_manipulation',
    description: 'Attempt to roleplay',
    severity: 'medium',
  },
  {
    pattern: /simulate\s+(being|a|an)/i,
    type: 'role_manipulation',
    description: 'Attempt to simulate different role',
    severity: 'medium',
  },
  {
    pattern: /switch\s+(to|into)\s+(a\s+)?(different|new|another)\s*(mode|role|personality)/i,
    type: 'role_manipulation',
    description: 'Attempt to switch modes',
    severity: 'high',
  },

  // Delimiter/format attacks
  {
    pattern: /\[\/?(system|inst|user|assistant|human|ai)\]/i,
    type: 'delimiter_attack',
    description: 'Fake message delimiter detected',
    severity: 'high',
  },
  {
    pattern: /<\/?(system|instruction|prompt|user|assistant)>/i,
    type: 'delimiter_attack',
    description: 'Fake XML tag delimiter detected',
    severity: 'high',
  },
  {
    pattern: /```(system|instructions?|prompt)/i,
    type: 'delimiter_attack',
    description: 'Fake code block delimiter detected',
    severity: 'medium',
  },
  {
    pattern: /###\s*(system|instructions?|prompt|new\s+task)/i,
    type: 'delimiter_attack',
    description: 'Fake markdown header delimiter detected',
    severity: 'medium',
  },
  {
    pattern: /\|\s*system\s*\|/i,
    type: 'delimiter_attack',
    description: 'Fake table delimiter detected',
    severity: 'medium',
  },

  // Jailbreak patterns
  {
    pattern: /\bDAN\b\s*(mode)?|do\s+anything\s+now/i,
    type: 'direct_injection',
    description: 'DAN jailbreak attempt detected',
    severity: 'critical',
  },
  {
    pattern: /developer\s+mode|dev\s+mode\s+enabled/i,
    type: 'direct_injection',
    description: 'Developer mode jailbreak attempt',
    severity: 'critical',
  },
  {
    pattern: /jailbreak|jail\s*break/i,
    type: 'direct_injection',
    description: 'Explicit jailbreak mention',
    severity: 'high',
  },
  {
    pattern: /bypass\s+(your|the|all|any)\s*(restrictions?|filters?|rules?|safety)/i,
    type: 'direct_injection',
    description: 'Attempt to bypass restrictions',
    severity: 'critical',
  },
  {
    pattern: /enable\s+(unrestricted|unlimited|god)\s*mode/i,
    type: 'direct_injection',
    description: 'Attempt to enable unrestricted mode',
    severity: 'critical',
  },
];

/**
 * Encoding attack patterns
 */
const ENCODING_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string; severity: 'low' | 'medium' | 'high' | 'critical' }> = [
  // Base64 encoded content (long strings)
  {
    pattern: /[A-Za-z0-9+/]{50,}={0,2}/,
    type: 'encoding_attack',
    description: 'Possible Base64 encoded content detected',
    severity: 'medium',
  },
  // Hex encoded content
  {
    pattern: /(?:0x)?[0-9a-fA-F]{20,}/,
    type: 'encoding_attack',
    description: 'Possible hex encoded content detected',
    severity: 'medium',
  },
  // Unicode escape sequences
  {
    pattern: /\\u[0-9a-fA-F]{4}(?:\\u[0-9a-fA-F]{4}){5,}/,
    type: 'encoding_attack',
    description: 'Multiple Unicode escape sequences detected',
    severity: 'medium',
  },
  // URL encoded attacks
  {
    pattern: /%[0-9a-fA-F]{2}(?:%[0-9a-fA-F]{2}){10,}/,
    type: 'encoding_attack',
    description: 'Heavy URL encoding detected',
    severity: 'medium',
  },
  // HTML entities
  {
    pattern: /&(?:#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);(?:&(?:#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);){5,}/,
    type: 'encoding_attack',
    description: 'Multiple HTML entities detected',
    severity: 'low',
  },
];

/**
 * Input Validator class
 */
export class InputValidator {
  private config: InputValidatorConfig;

  constructor(config?: Partial<InputValidatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate input and return result
   */
  validate(input: string): ValidationResult {
    const threats: ThreatDetection[] = [];

    // Check length
    if (input.length > this.config.maxLength) {
      threats.push({
        type: 'direct_injection',
        description: `Input exceeds maximum length of ${this.config.maxLength} characters`,
        severity: 'medium',
      });
    }

    // Check for allowed patterns (bypass)
    for (const pattern of this.config.allowPatterns) {
      if (pattern.test(input)) {
        return {
          safe: true,
          threats: [],
          sanitized: input,
        };
      }
    }

    // Check injection patterns
    if (this.config.detectInjection) {
      threats.push(...this.detectInjectionPatterns(input));
    }

    // Check encoding attacks
    if (this.config.detectEncoding) {
      threats.push(...this.detectEncodingAttacks(input));
    }

    // Check invisible characters (zero-width, homoglyphs, bidirectional overrides)
    const invisibleThreats = this.detectInvisibleChars(input);
    threats.push(...invisibleThreats);

    // Check custom patterns
    for (const pattern of this.config.customPatterns) {
      if (pattern.test(input)) {
        threats.push({
          type: 'direct_injection',
          pattern: pattern.source,
          description: 'Custom blocked pattern detected',
          severity: 'high',
        });
      }
    }

    const safe = threats.length === 0;
    const sanitized = safe ? input : this.sanitize(input);

    return {
      safe,
      threats,
      sanitized,
    };
  }

  /**
   * Quick check if input contains injection patterns
   */
  hasInjection(input: string): boolean {
    return this.detectInjectionPatterns(input).length > 0;
  }

  /**
   * Detect injection patterns
   */
  detectInjectionPatterns(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    for (const { pattern, type, description, severity } of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        threats.push({
          type,
          pattern: pattern.source,
          description,
          severity,
        });
      }
    }

    return threats;
  }

  /**
   * Detect encoding attacks
   */
  detectEncodingAttacks(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    for (const { pattern, type, description, severity } of ENCODING_PATTERNS) {
      if (pattern.test(input)) {
        threats.push({
          type,
          pattern: pattern.source,
          description,
          severity,
        });
      }
    }

    return threats;
  }

  /**
   * Detect invisible/zero-width characters that could be used for smuggling
   */
  detectInvisibleChars(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    // Zero-width characters (used for ASCII smuggling)
    const zeroWidthPattern = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064]/;
    if (zeroWidthPattern.test(input)) {
      threats.push({
        type: 'encoding_attack' as ThreatType,
        pattern: 'zero_width_chars',
        description: 'Zero-width or invisible characters detected (potential ASCII smuggling)',
        severity: 'high',
      });
    }

    // Bidirectional text overrides (used to visually disguise text direction)
    const bidiPattern = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/;
    if (bidiPattern.test(input)) {
      threats.push({
        type: 'encoding_attack' as ThreatType,
        pattern: 'bidi_override',
        description: 'Bidirectional text override characters detected',
        severity: 'high',
      });
    }

    // Homoglyph detection: Cyrillic/Greek lookalikes mixed with Latin
    const hasCyrillic = /[\u0400-\u04FF]/.test(input);
    const hasLatin = /[a-zA-Z]/.test(input);
    if (hasCyrillic && hasLatin) {
      threats.push({
        type: 'encoding_attack' as ThreatType,
        pattern: 'homoglyph_mixing',
        description: 'Mixed Latin and Cyrillic characters detected (potential homoglyph attack)',
        severity: 'medium',
      });
    }

    return threats;
  }

  /**
   * Sanitize input by removing/replacing dangerous content
   */
  sanitize(input: string): string {
    let sanitized = input;

    // Truncate to max length
    if (sanitized.length > this.config.maxLength) {
      sanitized = sanitized.slice(0, this.config.maxLength);
    }

    // Remove zero-width and invisible characters
    sanitized = sanitized.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060-\u2064]/g, '');

    // Remove bidirectional overrides
    sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return sanitized;
  }

  /**
   * Get severity level of threats (returns highest)
   */
  getHighestSeverity(threats: ThreatDetection[]): 'low' | 'medium' | 'high' | 'critical' | null {
    if (threats.length === 0) return null;

    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    let highest = 0;
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const threat of threats) {
      const level = severityOrder[threat.severity];
      if (level > highest) {
        highest = level;
        highestSeverity = threat.severity;
      }
    }

    return highestSeverity;
  }
}

/**
 * Export pattern constants for testing/extension
 */
export { INJECTION_PATTERNS, ENCODING_PATTERNS };
