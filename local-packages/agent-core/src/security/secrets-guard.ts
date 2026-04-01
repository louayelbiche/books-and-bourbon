/**
 * Secrets Guard
 *
 * Detects and redacts API keys, credentials, and sensitive information
 * in both input and output to prevent data leakage.
 */

import type { ThreatDetection } from '../types/index.js';

/**
 * Secret detection result
 */
export interface SecretDetection {
  type: 'api_key' | 'database_url' | 'token' | 'password' | 'credential' | 'env_var';
  pattern: string;
  position?: number;
  snippet?: string;
  severity: 'high' | 'critical';
}

/**
 * Secrets Guard configuration
 */
export interface SecretsGuardConfig {
  /** Detect API keys */
  detectApiKeys: boolean;
  /** Detect database URLs */
  detectDatabaseUrls: boolean;
  /** Detect tokens */
  detectTokens: boolean;
  /** Detect passwords in text */
  detectPasswords: boolean;
  /** Additional env var names to flag */
  sensitiveEnvVars: string[];
  /** Redaction string */
  redactionString: string;
}

const DEFAULT_CONFIG: SecretsGuardConfig = {
  detectApiKeys: true,
  detectDatabaseUrls: true,
  detectTokens: true,
  detectPasswords: true,
  sensitiveEnvVars: [],
  redactionString: '[REDACTED]',
};

/**
 * API key patterns
 */
const API_KEY_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // OpenAI / Anthropic style
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'OpenAI/Anthropic API key' },
  { pattern: /sk-proj-[a-zA-Z0-9-_]{20,}/g, name: 'OpenAI Project API key' },
  { pattern: /sk-ant-[a-zA-Z0-9-_]{20,}/g, name: 'Anthropic API key' },

  // Google
  { pattern: /AIza[a-zA-Z0-9_-]{35}/g, name: 'Google API key' },

  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { pattern: /[a-zA-Z0-9/+=]{40}(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/g, name: 'AWS Secret Key (possible)' },

  // GitHub
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token' },
  { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User Token' },
  { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server Token' },
  { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token' },
  { pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g, name: 'GitHub Fine-grained PAT' },

  // Slack
  { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/g, name: 'Slack Token' },

  // Stripe
  { pattern: /sk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe Live Secret Key' },
  { pattern: /sk_test_[a-zA-Z0-9]{24,}/g, name: 'Stripe Test Secret Key' },
  { pattern: /pk_live_[a-zA-Z0-9]{24,}/g, name: 'Stripe Live Publishable Key' },
  { pattern: /pk_test_[a-zA-Z0-9]{24,}/g, name: 'Stripe Test Publishable Key' },

  // Twilio
  { pattern: /SK[a-f0-9]{32}/g, name: 'Twilio API Key' },

  // SendGrid
  { pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, name: 'SendGrid API Key' },

  // Generic
  { pattern: /api[_-]?key["'\s:=]+[a-zA-Z0-9_-]{16,}/gi, name: 'Generic API key' },
  { pattern: /apikey["'\s:=]+[a-zA-Z0-9_-]{16,}/gi, name: 'Generic API key' },
];

/**
 * Database URL patterns
 */
const DATABASE_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /postgres(?:ql)?:\/\/[^\s"'`]+/gi, name: 'PostgreSQL URL' },
  { pattern: /mysql:\/\/[^\s"'`]+/gi, name: 'MySQL URL' },
  { pattern: /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, name: 'MongoDB URL' },
  { pattern: /redis:\/\/[^\s"'`]+/gi, name: 'Redis URL' },
  { pattern: /sqlite:\/\/[^\s"'`]+/gi, name: 'SQLite URL' },
  { pattern: /mssql:\/\/[^\s"'`]+/gi, name: 'MSSQL URL' },
  { pattern: /jdbc:[a-z]+:\/\/[^\s"'`]+/gi, name: 'JDBC URL' },
];

/**
 * Token patterns
 */
const TOKEN_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /bearer\s+[a-zA-Z0-9_-]{20,}/gi, name: 'Bearer Token' },
  { pattern: /token["'\s:=]+[a-zA-Z0-9_-]{20,}/gi, name: 'Generic Token' },
  { pattern: /access[_-]?token["'\s:=]+[a-zA-Z0-9_-]{20,}/gi, name: 'Access Token' },
  { pattern: /refresh[_-]?token["'\s:=]+[a-zA-Z0-9_-]{20,}/gi, name: 'Refresh Token' },
  { pattern: /auth[_-]?token["'\s:=]+[a-zA-Z0-9_-]{20,}/gi, name: 'Auth Token' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, name: 'JWT Token' },
];

/**
 * Password patterns (in config/code context)
 */
const PASSWORD_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /password["'\s:=]+[^\s"'`]{8,}/gi, name: 'Password value' },
  { pattern: /passwd["'\s:=]+[^\s"'`]{8,}/gi, name: 'Password value' },
  { pattern: /pwd["'\s:=]+[^\s"'`]{8,}/gi, name: 'Password value' },
  { pattern: /secret["'\s:=]+[^\s"'`]{8,}/gi, name: 'Secret value' },
];

/**
 * Common sensitive environment variable names
 */
const SENSITIVE_ENV_VARS = [
  'GOOGLE_AI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
  'POSTGRES_USER',
  'REDIS_URL',
  'REDIS_PASSWORD',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SQUARE_ACCESS_TOKEN',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'GITHUB_TOKEN',
  'GITHUB_SECRET',
  'SMTP_PASSWORD',
  'EMAIL_PASSWORD',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
];

/**
 * Secret extraction attempt patterns
 */
const EXTRACTION_PATTERNS: RegExp[] = [
  /what\s+(is|are)\s+(your|the)\s+(api[_\s-]?key|secret|password|token|credential)/i,
  /show\s+(me\s+)?(your|the)\s+(api[_\s-]?key|secret|password|token|credential)/i,
  /reveal\s+(your|the)\s+(api[_\s-]?key|secret|password|token|credential)/i,
  /print\s+(your|the)?\s*(env|environment|config|api[_\s-]?key)/i,
  /give\s+(me\s+)?(your|the)\s+(api[_\s-]?key|secret|password|token)/i,
  /tell\s+(me\s+)?(your|the)\s+(api[_\s-]?key|secret|password|token)/i,
  /(database|db)\s*(url|connection|password|credentials?)/i,
  /process\.env/i,
  /\$\{?\w*(KEY|SECRET|PASSWORD|TOKEN|CREDENTIAL)\w*\}?/i,
  /environment\s+variables?/i,
  /\.env\s+file/i,
  /config(uration)?\s+(file|secret|password)/i,
];

/**
 * Secrets Guard class
 */
export class SecretsGuard {
  private config: SecretsGuardConfig;
  private allEnvVars: string[];

  constructor(config?: Partial<SecretsGuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.allEnvVars = [...SENSITIVE_ENV_VARS, ...this.config.sensitiveEnvVars];
  }

  /**
   * Scan text for secrets
   */
  scanForSecrets(text: string): SecretDetection[] {
    const detections: SecretDetection[] = [];

    // API Keys
    if (this.config.detectApiKeys) {
      for (const { pattern, name } of API_KEY_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern));
        for (const match of matches) {
          detections.push({
            type: 'api_key',
            pattern: name,
            position: match.index,
            snippet: this.createSnippet(match[0]),
            severity: 'critical',
          });
        }
      }
    }

    // Database URLs
    if (this.config.detectDatabaseUrls) {
      for (const { pattern, name } of DATABASE_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern));
        for (const match of matches) {
          detections.push({
            type: 'database_url',
            pattern: name,
            position: match.index,
            snippet: this.createSnippet(match[0]),
            severity: 'critical',
          });
        }
      }
    }

    // Tokens
    if (this.config.detectTokens) {
      for (const { pattern, name } of TOKEN_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern));
        for (const match of matches) {
          detections.push({
            type: 'token',
            pattern: name,
            position: match.index,
            snippet: this.createSnippet(match[0]),
            severity: 'critical',
          });
        }
      }
    }

    // Passwords
    if (this.config.detectPasswords) {
      for (const { pattern, name } of PASSWORD_PATTERNS) {
        const matches = text.matchAll(new RegExp(pattern));
        for (const match of matches) {
          detections.push({
            type: 'password',
            pattern: name,
            position: match.index,
            snippet: this.createSnippet(match[0]),
            severity: 'high',
          });
        }
      }
    }

    // Environment variable names
    for (const envVar of this.allEnvVars) {
      if (text.includes(envVar)) {
        detections.push({
          type: 'env_var',
          pattern: envVar,
          severity: 'high',
        });
      }
    }

    return detections;
  }

  /**
   * Redact all secrets from text
   */
  redactSecrets(text: string): string {
    let redacted = text;

    // Redact API keys
    for (const { pattern } of API_KEY_PATTERNS) {
      redacted = redacted.replace(new RegExp(pattern), this.config.redactionString);
    }

    // Redact database URLs (preserve protocol for context)
    for (const { pattern } of DATABASE_PATTERNS) {
      redacted = redacted.replace(new RegExp(pattern), (match) => {
        const protocol = match.split('://')[0];
        return `${protocol}://${this.config.redactionString}`;
      });
    }

    // Redact tokens
    for (const { pattern } of TOKEN_PATTERNS) {
      redacted = redacted.replace(new RegExp(pattern), (match) => {
        // Keep the prefix for context (e.g., "bearer [REDACTED]")
        const parts = match.split(/[\s:=]+/);
        if (parts.length > 1) {
          return `${parts[0]} ${this.config.redactionString}`;
        }
        return this.config.redactionString;
      });
    }

    // Redact passwords
    for (const { pattern } of PASSWORD_PATTERNS) {
      redacted = redacted.replace(new RegExp(pattern), (match) => {
        const parts = match.split(/[\s:=]+/);
        if (parts.length > 1) {
          return `${parts[0]}=${this.config.redactionString}`;
        }
        return this.config.redactionString;
      });
    }

    return redacted;
  }

  /**
   * Check if input is attempting to extract secrets
   */
  detectExtractionAttempt(input: string): boolean {
    return EXTRACTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Get threats from secret detections
   */
  toThreats(detections: SecretDetection[]): ThreatDetection[] {
    return detections.map((d) => ({
      type: 'secret_exposure' as const,
      pattern: d.pattern,
      description: `${d.type} detected: ${d.pattern}`,
      severity: d.severity,
    }));
  }

  /**
   * Create a safe snippet for logging (redacted)
   */
  private createSnippet(value: string): string {
    if (value.length <= 8) {
      return this.config.redactionString;
    }
    return value.slice(0, 4) + '...' + value.slice(-4);
  }
}

/**
 * Export pattern constants for testing/extension
 */
export {
  API_KEY_PATTERNS,
  DATABASE_PATTERNS,
  TOKEN_PATTERNS,
  PASSWORD_PATTERNS,
  SENSITIVE_ENV_VARS,
  EXTRACTION_PATTERNS,
};
