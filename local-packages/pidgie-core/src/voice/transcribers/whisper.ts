/**
 * OpenAI Whisper Transcriber
 *
 * Transcription adapter using OpenAI's Whisper API.
 */

import type { TranscriptionResult, TranscriberOptions } from '../types.js';
import type {
  TranscriberAdapter,
  WhisperTranscriberConfig,
  TranscriptionError,
  TranscriptionErrorCode,
} from './types.js';
import { MAX_FILE_SIZE_BYTES, getSupportedExtensions } from '../audio/formats.js';

/**
 * OpenAI Whisper transcription adapter
 *
 * @example
 * ```typescript
 * const transcriber = createWhisperTranscriber({
 *   apiKey: process.env.OPENAI_API_KEY!,
 * });
 *
 * const result = await transcriber.transcribe(audioBuffer);
 * console.log(result.text);
 * ```
 */
export class WhisperTranscriber implements TranscriberAdapter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly debug: boolean;

  constructor(config: WhisperTranscriberConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'whisper-1';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.timeout = config.timeout || 60000;
    this.debug = config.debug || false;
  }

  /**
   * Check if the transcriber is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return getSupportedExtensions();
  }

  /**
   * Get maximum file size
   */
  getMaxFileSize(): number {
    return MAX_FILE_SIZE_BYTES;
  }

  /**
   * Transcribe audio to text using Whisper API
   */
  async transcribe(
    audio: Buffer | Blob,
    options?: TranscriberOptions
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable()) {
      throw this.createError('TRANSCRIBER_NOT_AVAILABLE', 'OpenAI API key not configured');
    }

    const formData = new FormData();

    // Materialize audio data into a fresh Blob.
    // File objects from incoming requests (Node.js formData) can fail to
    // re-serialize when appended to an outgoing FormData. Reading into an
    // ArrayBuffer first guarantees the data is fully available.
    let rawBytes: ArrayBuffer;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(audio)) {
      rawBytes = new Uint8Array(audio).buffer;
    } else {
      rawBytes = await (audio as Blob).arrayBuffer();
    }
    const mimeType = (audio as Blob).type || 'audio/webm';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const freshBlob = new Blob([rawBytes], { type: mimeType });
    formData.append('file', freshBlob, `audio.${ext}`);

    // Add model
    formData.append('model', this.model);

    // Add optional parameters
    if (options?.language) {
      formData.append('language', options.language);
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }
    if (options?.responseFormat) {
      formData.append('response_format', options.responseFormat);
    }
    if (options?.temperature !== undefined) {
      formData.append('temperature', String(options.temperature));
    }

    // Default to verbose_json for metadata
    if (!options?.responseFormat) {
      formData.append('response_format', 'verbose_json');
    }

    if (this.debug) {
      console.log('[WhisperTranscriber] Sending request to', `${this.baseURL}/audio/transcriptions`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();

        if (response.status === 429) {
          throw this.createError('RATE_LIMITED', 'Rate limited by OpenAI API', response.status);
        }

        throw this.createError(
          'API_ERROR',
          `OpenAI API error: ${response.status} - ${errorBody}`,
          response.status
        );
      }

      const data = await response.json();

      if (this.debug) {
        console.log('[WhisperTranscriber] Response:', data);
      }

      // Handle verbose_json response
      if (typeof data === 'object' && 'text' in data) {
        return {
          text: data.text,
          language: data.language,
          duration: data.duration,
        };
      }

      // Handle text response
      if (typeof data === 'string') {
        return { text: data };
      }

      return { text: String(data) };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('TIMEOUT', `Request timed out after ${this.timeout}ms`);
      }

      if (this.isTranscriptionError(error)) {
        throw error;
      }

      throw this.createError('UNKNOWN', `Transcription failed: ${String(error)}`);
    }
  }

  /**
   * Create a structured transcription error
   */
  private createError(
    code: TranscriptionErrorCode,
    message: string,
    statusCode?: number
  ): TranscriptionError {
    const error = new Error(message) as TranscriptionError;
    error.code = code;
    error.statusCode = statusCode;
    error.name = 'TranscriptionError';
    return error;
  }

  /**
   * Check if an error is a TranscriptionError
   */
  private isTranscriptionError(error: unknown): error is TranscriptionError {
    return (
      error instanceof Error &&
      'code' in error &&
      typeof (error as TranscriptionError).code === 'string'
    );
  }
}

/**
 * Create a WhisperTranscriber instance
 *
 * @param config - Transcriber configuration
 * @returns WhisperTranscriber instance
 *
 * @example
 * ```typescript
 * const transcriber = createWhisperTranscriber({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   timeout: 30000,
 * });
 *
 * const { text } = await transcriber.transcribe(audioFile);
 * ```
 */
export function createWhisperTranscriber(
  config: WhisperTranscriberConfig
): WhisperTranscriber {
  return new WhisperTranscriber(config);
}
