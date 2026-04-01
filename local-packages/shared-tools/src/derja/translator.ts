/**
 * NLLB-200 translation wrapper for Tunisian Arabic (Derja).
 *
 * Uses the free NLLB-200 API hosted on HuggingFace Spaces.
 * No authentication required. CPU-based, rate-limited.
 */

import type { TranslationRequest, TranslationResult } from './types.js';

// =============================================================================
// FLORES-200 language codes
// =============================================================================

/** Tunisian Arabic (Derja) */
const DERJA_CODE = 'aeb_Arab';
/** Modern Standard Arabic */
const MSA_CODE = 'arb_Arab';
/** English */
const ENGLISH_CODE = 'eng_Latn';
/** French */
const FRENCH_CODE = 'fra_Latn';

const DEFAULT_BASE_URL = 'https://winstxnhdw-nllb-api.hf.space';

// =============================================================================
// Retry configuration
// =============================================================================

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const RETRYABLE_STATUS_CODES = [429, 503, 502, 500];

// =============================================================================
// NLLBTranslator
// =============================================================================

export interface NLLBTranslatorOptions {
  /** Base URL for the NLLB API. Defaults to HuggingFace Spaces instance. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeoutMs?: number;
  /** Initial retry backoff in milliseconds. Default: 1000. Set to 0 for tests. */
  retryBackoffMs?: number;
}

export class NLLBTranslator {
  private baseUrl: string;
  private timeoutMs: number;
  private retryBackoffMs: number;

  constructor(options?: NLLBTranslatorOptions) {
    this.baseUrl = (options?.baseUrl ?? process.env.NLLB_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeoutMs = options?.timeoutMs ?? 30_000;
    this.retryBackoffMs = options?.retryBackoffMs ?? INITIAL_BACKOFF_MS;
  }

  /**
   * Translate text between any FLORES-200 language pair.
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, source, target } = request;

    if (!text.trim()) {
      return { translated: '', source, target };
    }

    const url = new URL('/api/v4/translator', this.baseUrl);
    url.searchParams.set('text', text);
    url.searchParams.set('source', source);
    url.searchParams.set('target', target);

    const response = await this.fetchWithRetry(url.toString());
    const data = await response.json();

    // The API returns { result: "translated text" }
    const translated = typeof data === 'string' ? data : (data.result ?? data.translated_text ?? '');

    return { translated, source, target };
  }

  // ===========================================================================
  // Convenience methods
  // ===========================================================================

  async derjaToEnglish(text: string): Promise<string> {
    const result = await this.translate({ text, source: DERJA_CODE, target: ENGLISH_CODE });
    return result.translated;
  }

  async englishToDerja(text: string): Promise<string> {
    const result = await this.translate({ text, source: ENGLISH_CODE, target: DERJA_CODE });
    return result.translated;
  }

  async derjaToFrench(text: string): Promise<string> {
    const result = await this.translate({ text, source: DERJA_CODE, target: FRENCH_CODE });
    return result.translated;
  }

  async frenchToDerja(text: string): Promise<string> {
    const result = await this.translate({ text, source: FRENCH_CODE, target: DERJA_CODE });
    return result.translated;
  }

  async derjaToMSA(text: string): Promise<string> {
    const result = await this.translate({ text, source: DERJA_CODE, target: MSA_CODE });
    return result.translated;
  }

  // ===========================================================================
  // Internal: fetch with retry + backoff
  // ===========================================================================

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          return response;
        }

        if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
          const backoff = this.retryBackoffMs * Math.pow(2, attempt);
          await this.sleep(backoff);
          lastError = new Error(`NLLB API error: ${response.status} ${response.statusText}`);
          continue;
        }

        // Non-retryable HTTP error: throw immediately
        throw new Error(`NLLB API error: ${response.status} ${response.statusText}`);
      } catch (error) {
        // Re-throw non-retryable NLLB API errors immediately
        if (error instanceof Error && error.message.startsWith('NLLB API error:')) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`NLLB API timeout after ${this.timeoutMs}ms`);
        } else if (error instanceof Error && error.message.startsWith('NLLB API')) {
          lastError = error;
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (attempt < MAX_RETRIES) {
          const backoff = this.retryBackoffMs * Math.pow(2, attempt);
          await this.sleep(backoff);
          continue;
        }
      }
    }

    throw lastError ?? new Error('NLLB API: all retries exhausted');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
