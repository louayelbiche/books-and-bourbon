/**
 * Transcriber Adapter Types
 *
 * Interface definitions for transcription service adapters.
 */

import type { TranscriptionResult, TranscriberOptions } from '../types.js';

/**
 * Base transcriber adapter interface
 *
 * Implement this interface to add support for different transcription services.
 */
export interface TranscriberAdapter {
  /**
   * Transcribe audio to text
   *
   * @param audio - Audio data as Buffer (Node.js) or Blob (browser)
   * @param options - Transcription options
   * @returns Transcription result with text and metadata
   */
  transcribe(
    audio: Buffer | Blob,
    options?: TranscriberOptions
  ): Promise<TranscriptionResult>;

  /**
   * Check if the transcriber is available (e.g., API key configured)
   */
  isAvailable(): boolean;

  /**
   * Get list of supported audio formats
   */
  getSupportedFormats(): string[];

  /**
   * Get the maximum file size supported (in bytes)
   */
  getMaxFileSize(): number;
}

/**
 * Base configuration for transcriber adapters
 */
export interface BaseTranscriberConfig {
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * OpenAI Whisper transcriber configuration
 */
export interface WhisperTranscriberConfig extends BaseTranscriberConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Whisper model to use (default: 'whisper-1') */
  model?: 'whisper-1';
  /** Base URL for OpenAI API (useful for proxies) */
  baseURL?: string;
}

/**
 * Transcription error with structured information
 */
export interface TranscriptionError extends Error {
  /** Error code for programmatic handling */
  code: TranscriptionErrorCode;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Original error from the provider */
  cause?: Error;
}

/**
 * Transcription error codes
 */
export type TranscriptionErrorCode =
  | 'TRANSCRIBER_NOT_AVAILABLE'
  | 'INVALID_AUDIO'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'UNKNOWN';
