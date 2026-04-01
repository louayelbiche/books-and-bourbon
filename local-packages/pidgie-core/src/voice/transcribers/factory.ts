/**
 * Transcriber Factory
 *
 * Factory function for creating transcriber instances.
 */

import type { TranscriberAdapter, WhisperTranscriberConfig } from './types.js';
import { WhisperTranscriber } from './whisper.js';

/**
 * Supported transcriber providers
 */
export type TranscriberProvider = 'whisper';

/**
 * Configuration map for different transcriber providers
 */
export type TranscriberConfigMap = {
  whisper: WhisperTranscriberConfig;
};

/**
 * Create a transcriber instance for the specified provider
 *
 * @param provider - Transcriber provider name
 * @param config - Provider-specific configuration
 * @returns TranscriberAdapter instance
 *
 * @example
 * ```typescript
 * // Using whisper
 * const transcriber = createTranscriber('whisper', {
 *   apiKey: process.env.OPENAI_API_KEY!,
 * });
 *
 * // Future providers can be added here
 * // const transcriber = createTranscriber('deepgram', { ... });
 * ```
 */
export function createTranscriber<T extends TranscriberProvider>(
  provider: T,
  config: TranscriberConfigMap[T]
): TranscriberAdapter {
  switch (provider) {
    case 'whisper':
      return new WhisperTranscriber(config as WhisperTranscriberConfig);
    default:
      throw new Error(`Unknown transcriber provider: ${provider}`);
  }
}
