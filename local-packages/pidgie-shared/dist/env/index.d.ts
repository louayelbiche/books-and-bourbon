/**
 * Environment validation and API key security.
 *
 * - validateEnv(): startup check — crash early if required keys missing
 * - redactApiKeys(): strip key patterns from error strings before logging
 */
/** Tracks whether validateEnv() has been called successfully */
declare let ENV_VALIDATED: boolean;
/**
 * Redact API key patterns from a string.
 * Safe to call on error messages before logging.
 */
declare function redactApiKeys(input: string): string;
/**
 * Redact an Error object's message (returns a new string, doesn't mutate).
 */
declare function redactError(error: unknown): string;
/**
 * Validate required environment variables at startup.
 * Call once during app initialization — crashes if required keys are missing.
 *
 * Guards against:
 * - Missing GEMINI_API_KEY
 * - Invalid GEMINI_API_KEY format (not 39 chars)
 * - Accidental NEXT_PUBLIC_ exposure of API keys
 */
declare function validateEnv(): void;

export { ENV_VALIDATED, redactApiKeys, redactError, validateEnv };
