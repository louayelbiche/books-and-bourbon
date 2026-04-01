import type { LLMClient, LLMClientParams, LLMUsage } from './types.js';

export interface GeminiAdapterConfig {
  apiKey: string;
  /** Default: 'gemini-2.0-flash' */
  model?: string;
  /** Default: 3 */
  maxRetries?: number;
  /** Default: 1000 */
  baseBackoffMs?: number;
}

const RETRYABLE_PATTERNS = [
  '429',
  'rate limit',
  'quota',
  'too many requests',
  '503',
  'service unavailable',
  'timeout',
  'resource exhausted',
];

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return RETRYABLE_PATTERNS.some((p) => msg.includes(p));
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiAdapter implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;

  constructor(config: GeminiAdapterConfig) {
    if (!config.apiKey) {
      throw new Error('GeminiAdapter: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'gemini-2.0-flash';
    this.maxRetries = config.maxRetries ?? 3;
    this.baseBackoffMs = config.baseBackoffMs ?? 1000;
  }

  async generate(params: LLMClientParams): Promise<string> {
    const {
      prompt,
      systemPrompt,
      options: {
        temperature = 0.7,
        maxOutputTokens = 4096,
        timeoutMs = 30_000,
        responseFormat = 'json',
      } = {},
    } = params;

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType:
          responseFormat === 'json' ? 'application/json' : 'text/plain',
      },
    };

    // Only include system_instruction when systemPrompt is provided
    if (systemPrompt) {
      body.system_instruction = { parts: [{ text: systemPrompt }] };
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(
          this.baseBackoffMs * Math.pow(2, attempt - 1) +
            Math.random() * 300,
          30_000,
        );
        await sleep(delay);
      }

      try {
        const response = await fetch(
          `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
          },
        );

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          const err = new Error(
            `Gemini API ${response.status}: ${errText.slice(0, 200)}`,
          );
          if (
            attempt < this.maxRetries &&
            (response.status === 429 || response.status === 503)
          ) {
            lastError = err;
            continue;
          }
          throw err;
        }

        const data = await response.json();

        // Extract token usage from Gemini response
        const usage: LLMUsage = {
          promptTokens: data?.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: data?.usageMetadata?.totalTokenCount ?? 0,
        };
        if (params.options?.onUsage) {
          params.options.onUsage(usage);
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          const reason = data?.candidates?.[0]?.finishReason;
          throw new Error(
            `Empty Gemini response${reason ? ` (${reason})` : ''}`,
          );
        }

        return text;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries && isRetryable(error)) {
          continue;
        }
        if (attempt >= this.maxRetries) {
          break;
        }
        throw lastError;
      }
    }

    throw lastError ?? new Error('Gemini API failed after retries');
  }
}
