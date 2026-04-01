/**
 * Audio Format Definitions
 *
 * Supported audio formats for voice transcription.
 */

import type { AudioFormat } from '../types.js';

/**
 * Supported audio formats for Whisper transcription
 *
 * Based on OpenAI Whisper supported formats:
 * https://platform.openai.com/docs/guides/speech-to-text
 */
export const SUPPORTED_FORMATS: AudioFormat[] = [
  {
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    magicBytes: [0xff, 0xfb], // MP3 frame sync
  },
  {
    extension: 'mp4',
    mimeType: 'audio/mp4',
    magicBytes: [0x00, 0x00, 0x00], // ftyp header start
  },
  {
    extension: 'm4a',
    mimeType: 'audio/mp4',
    magicBytes: [0x00, 0x00, 0x00], // ftyp header start
  },
  {
    extension: 'mpga',
    mimeType: 'audio/mpeg',
    magicBytes: [0xff, 0xfb],
  },
  {
    extension: 'mpeg',
    mimeType: 'audio/mpeg',
    magicBytes: [0xff, 0xfb],
  },
  {
    extension: 'wav',
    mimeType: 'audio/wav',
    magicBytes: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  },
  {
    extension: 'webm',
    mimeType: 'audio/webm',
    magicBytes: [0x1a, 0x45, 0xdf, 0xa3], // EBML header
  },
  {
    extension: 'ogg',
    mimeType: 'audio/ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53], // "OggS"
  },
  {
    extension: 'oga',
    mimeType: 'audio/ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53],
  },
];

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return SUPPORTED_FORMATS.map((f) => f.extension);
}

/**
 * Get all supported MIME types
 */
export function getSupportedMimeTypes(): string[] {
  return [...new Set(SUPPORTED_FORMATS.map((f) => f.mimeType))];
}

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return SUPPORTED_FORMATS.some((f) => f.mimeType === normalized);
}

/**
 * Check if a file extension is supported
 */
export function isSupportedExtension(extension: string): boolean {
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return SUPPORTED_FORMATS.some((f) => f.extension === normalized);
}

/**
 * Get format info by extension
 */
export function getFormatByExtension(extension: string): AudioFormat | undefined {
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return SUPPORTED_FORMATS.find((f) => f.extension === normalized);
}

/**
 * Get format info by MIME type
 */
export function getFormatByMimeType(mimeType: string): AudioFormat | undefined {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return SUPPORTED_FORMATS.find((f) => f.mimeType === normalized);
}

/**
 * Detect format from buffer magic bytes
 */
export function detectFormatFromBuffer(buffer: Buffer | Uint8Array): AudioFormat | undefined {
  if (buffer.length < 4) return undefined;

  for (const format of SUPPORTED_FORMATS) {
    if (!format.magicBytes) continue;

    const matches = format.magicBytes.every((byte, index) => buffer[index] === byte);
    if (matches) return format;
  }

  return undefined;
}

/**
 * Maximum file size for Whisper API (25MB)
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Default maximum audio duration (2 minutes)
 */
export const DEFAULT_MAX_DURATION_SECONDS = 120;
