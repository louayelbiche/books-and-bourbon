/**
 * Environment validation and API key security.
 *
 * - validateEnv(): startup check — crash early if required keys missing
 * - redactApiKeys(): strip key patterns from error strings before logging
 */

/** Gemini keys start with AIza and are 39 chars total */
const GEMINI_KEY_PATTERN = /AIza[A-Za-z0-9_-]{35}/g;

/** Generic long alphanumeric strings that look like API keys (40+ chars) */
const GENERIC_KEY_PATTERN = /[A-Za-z0-9_-]{40,}/g;

/** OpenAI keys start with sk- */
const OPENAI_KEY_PATTERN = /sk-[A-Za-z0-9]{20,}/g;

/** Tracks whether validateEnv() has been called successfully */
export let ENV_VALIDATED = false;

/**
 * Redact API key patterns from a string.
 * Safe to call on error messages before logging.
 */
export function redactApiKeys(input: string): string {
  return input
    .replace(GEMINI_KEY_PATTERN, '[REDACTED_GEMINI_KEY]')
    .replace(OPENAI_KEY_PATTERN, '[REDACTED_OPENAI_KEY]')
    .replace(GENERIC_KEY_PATTERN, (match) => {
      // Only redact if it looks like it could be a key (has mixed case or special chars)
      if (/[A-Z]/.test(match) && /[a-z0-9]/.test(match)) {
        return '[REDACTED_KEY]';
      }
      return match;
    });
}

/**
 * Redact an Error object's message (returns a new string, doesn't mutate).
 */
export function redactError(error: unknown): string {
  if (error instanceof Error) {
    return redactApiKeys(error.message);
  }
  return redactApiKeys(String(error));
}

/**
 * Validate required environment variables at startup.
 * Call once during app initialization — crashes if required keys are missing.
 *
 * Guards against:
 * - Missing GEMINI_API_KEY
 * - Invalid GEMINI_API_KEY format (not 39 chars)
 * - Accidental NEXT_PUBLIC_ exposure of API keys
 */
export function validateEnv(): void {
  if (ENV_VALIDATED) return;

  // Guard against NEXT_PUBLIC_ exposure of any API key
  const dangerousVars = Object.keys(process.env).filter(
    (key) => key.startsWith('NEXT_PUBLIC_') && /API.?KEY/i.test(key)
  );
  if (dangerousVars.length > 0) {
    throw new Error(
      `[ENV] FATAL: API keys exposed via NEXT_PUBLIC_ variables: ${dangerousVars.join(', ')}. ` +
      'These would be sent to the browser. Remove them immediately.'
    );
  }

  // Validate GEMINI_API_KEY (required)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('[ENV] GEMINI_API_KEY: MISSING');
    throw new Error('[ENV] GEMINI_API_KEY is required but not set');
  }
  if (!geminiKey.startsWith('AIza') || geminiKey.length < 30) {
    console.error('[ENV] GEMINI_API_KEY: present but invalid format (expected AIza... prefix, 30+ chars)');
    throw new Error('[ENV] GEMINI_API_KEY has invalid format');
  }
  console.log('[ENV] GEMINI_API_KEY: present (valid)');

  // Validate OPENAI_API_KEY (optional — warn only)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('[ENV] OPENAI_API_KEY: not set (voice input will be unavailable)');
  } else {
    console.log('[ENV] OPENAI_API_KEY: present');
  }

  ENV_VALIDATED = true;
}
