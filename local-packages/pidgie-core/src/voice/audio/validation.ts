/**
 * Audio Validation Utilities
 *
 * Validate audio files before transcription.
 */

import type {
  AudioValidationConfig,
  AudioValidationResult,
  AudioValidationErrorCode,
} from '../types.js';
import {
  MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_DURATION_SECONDS,
  getSupportedExtensions,
  isSupportedMimeType,
  isSupportedExtension,
  detectFormatFromBuffer,
} from './formats.js';

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: Required<AudioValidationConfig> = {
  maxSizeBytes: MAX_FILE_SIZE_BYTES,
  maxDurationSeconds: DEFAULT_MAX_DURATION_SECONDS,
  allowedFormats: getSupportedExtensions(),
};

/**
 * Validate audio file for transcription
 *
 * @param file - Audio file to validate (File, Blob, or Buffer with metadata)
 * @param config - Validation configuration
 * @returns Validation result with status and details
 *
 * @example
 * ```typescript
 * const file = formData.get('audio') as File;
 * const result = await validateAudio(file, { maxSizeBytes: 10 * 1024 * 1024 });
 *
 * if (!result.valid) {
 *   return Response.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export async function validateAudio(
  file: File | Blob | AudioFileInput,
  config: AudioValidationConfig = {}
): Promise<AudioValidationResult> {
  const mergedConfig = { ...DEFAULT_VALIDATION_CONFIG, ...config };

  // Handle different input types
  let size: number;
  let mimeType: string | undefined;
  let fileName: string | undefined;
  let buffer: Buffer | Uint8Array | undefined;

  if (file instanceof Blob) {
    size = file.size;
    mimeType = file.type || undefined;
    fileName = file instanceof File ? file.name : undefined;
    // Read first bytes for magic byte detection
    const slice = file.slice(0, 12);
    buffer = new Uint8Array(await slice.arrayBuffer());
  } else if (isAudioFileInput(file)) {
    size = file.size;
    mimeType = file.mimeType;
    fileName = file.fileName;
    buffer = file.buffer;
  } else {
    return createError('INVALID_INPUT', 'Invalid input: expected File, Blob, or AudioFileInput');
  }

  // Check for empty file
  if (size === 0) {
    return createError('EMPTY_FILE', 'Audio file is empty');
  }

  // Check file size
  if (size > mergedConfig.maxSizeBytes) {
    const maxMB = Math.round(mergedConfig.maxSizeBytes / (1024 * 1024));
    const fileMB = (size / (1024 * 1024)).toFixed(1);
    return createError(
      'FILE_TOO_LARGE',
      `File size ${fileMB}MB exceeds maximum ${maxMB}MB`
    );
  }

  // Detect format
  let detectedFormat: string | undefined;

  // Try MIME type first
  if (mimeType && isSupportedMimeType(mimeType)) {
    detectedFormat = mimeType;
  }

  // Try file extension
  if (!detectedFormat && fileName) {
    const ext = fileName.split('.').pop();
    if (ext && isSupportedExtension(ext)) {
      detectedFormat = ext;
    }
  }

  // Try magic bytes
  if (!detectedFormat && buffer) {
    const formatInfo = detectFormatFromBuffer(buffer);
    if (formatInfo) {
      detectedFormat = formatInfo.extension;
    }
  }

  // Validate format
  if (!detectedFormat) {
    const allowed = mergedConfig.allowedFormats.join(', ');
    return createError(
      'INVALID_FORMAT',
      `Unsupported audio format. Allowed formats: ${allowed}`
    );
  }

  return {
    valid: true,
    format: detectedFormat,
    sizeBytes: size,
  };
}

/**
 * Audio file input for validation (alternative to File/Blob)
 */
export interface AudioFileInput {
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType?: string;
  /** File name (for extension detection) */
  fileName?: string;
  /** Buffer for magic byte detection */
  buffer?: Buffer | Uint8Array;
}

/**
 * Type guard for AudioFileInput
 */
function isAudioFileInput(value: unknown): value is AudioFileInput {
  return (
    typeof value === 'object' &&
    value !== null &&
    'size' in value &&
    typeof (value as AudioFileInput).size === 'number'
  );
}

/**
 * Create an error result
 */
function createError(
  code: AudioValidationErrorCode,
  error: string
): AudioValidationResult {
  return { valid: false, code, error };
}

/**
 * Quick check if a file extension is allowed
 *
 * @param fileName - File name to check
 * @param allowedFormats - List of allowed extensions (optional, uses defaults)
 * @returns true if the extension is allowed
 */
export function isAllowedExtension(
  fileName: string,
  allowedFormats: string[] = getSupportedExtensions()
): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  return allowedFormats.includes(ext);
}

/**
 * Quick check if a MIME type is allowed
 *
 * @param mimeType - MIME type to check
 * @returns true if the MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return isSupportedMimeType(mimeType);
}
