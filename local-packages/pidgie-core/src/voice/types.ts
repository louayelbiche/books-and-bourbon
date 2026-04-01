/**
 * Voice Module Types
 *
 * Core type definitions for voice transcription capabilities.
 */

/**
 * Transcription result returned by transcribers
 */
export interface TranscriptionResult {
  /** Transcribed text */
  text: string;
  /** Detected language code (e.g., 'en', 'es') */
  language?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Confidence score (0-1) */
  confidence?: number;
}

/**
 * Options for transcription
 */
export interface TranscriberOptions {
  /** Language hint for transcription (ISO 639-1 code) */
  language?: string;
  /** Custom prompt to guide transcription style */
  prompt?: string;
  /** Response format */
  responseFormat?: 'json' | 'text' | 'verbose_json';
  /** Temperature for transcription (0-1) */
  temperature?: number;
}

/**
 * Audio validation configuration
 */
export interface AudioValidationConfig {
  /** Maximum file size in bytes (default: 25MB - Whisper limit) */
  maxSizeBytes?: number;
  /** Maximum audio duration in seconds (default: 120s) */
  maxDurationSeconds?: number;
  /** Allowed audio formats (default: ['webm', 'mp3', 'wav', 'm4a', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg']) */
  allowedFormats?: string[];
}

/**
 * Result of audio validation
 */
export interface AudioValidationResult {
  /** Whether the audio is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Error code for programmatic handling */
  code?: AudioValidationErrorCode;
  /** Detected format (if valid) */
  format?: string;
  /** File size in bytes */
  sizeBytes?: number;
}

/**
 * Audio validation error codes
 */
export type AudioValidationErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'DURATION_TOO_LONG'
  | 'EMPTY_FILE'
  | 'INVALID_INPUT';

/**
 * Supported audio formats with their MIME types
 */
export interface AudioFormat {
  /** File extension (without dot) */
  extension: string;
  /** MIME type */
  mimeType: string;
  /** Magic bytes for format detection (optional) */
  magicBytes?: number[];
}
