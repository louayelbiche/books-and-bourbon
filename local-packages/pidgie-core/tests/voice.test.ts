/**
 * Voice Module Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAudio,
  isAllowedExtension,
  isAllowedMimeType,
  getSupportedExtensions,
  getSupportedMimeTypes,
  isSupportedExtension,
  isSupportedMimeType,
  detectFormatFromBuffer,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_DURATION_SECONDS,
  createWhisperTranscriber,
  handleVoiceRequest,
} from '../src/voice/index.js';

describe('Audio Formats', () => {
  describe('getSupportedExtensions', () => {
    it('should return array of supported extensions', () => {
      const extensions = getSupportedExtensions();
      expect(extensions).toContain('mp3');
      expect(extensions).toContain('wav');
      expect(extensions).toContain('webm');
      expect(extensions).toContain('m4a');
      expect(extensions).toContain('ogg');
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('should return array of supported MIME types', () => {
      const mimeTypes = getSupportedMimeTypes();
      expect(mimeTypes).toContain('audio/mpeg');
      expect(mimeTypes).toContain('audio/wav');
      expect(mimeTypes).toContain('audio/webm');
      expect(mimeTypes).toContain('audio/mp4');
      expect(mimeTypes).toContain('audio/ogg');
    });
  });

  describe('isSupportedExtension', () => {
    it('should return true for supported extensions', () => {
      expect(isSupportedExtension('mp3')).toBe(true);
      expect(isSupportedExtension('wav')).toBe(true);
      expect(isSupportedExtension('.webm')).toBe(true);
      expect(isSupportedExtension('M4A')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isSupportedExtension('txt')).toBe(false);
      expect(isSupportedExtension('pdf')).toBe(false);
      expect(isSupportedExtension('aac')).toBe(false);
    });
  });

  describe('isSupportedMimeType', () => {
    it('should return true for supported MIME types', () => {
      expect(isSupportedMimeType('audio/mpeg')).toBe(true);
      expect(isSupportedMimeType('audio/wav')).toBe(true);
      expect(isSupportedMimeType('audio/webm')).toBe(true);
    });

    it('should handle MIME types with parameters', () => {
      expect(isSupportedMimeType('audio/mpeg; codecs=mp3')).toBe(true);
      expect(isSupportedMimeType('audio/webm; codecs=opus')).toBe(true);
    });

    it('should return false for unsupported MIME types', () => {
      expect(isSupportedMimeType('audio/aac')).toBe(false);
      expect(isSupportedMimeType('video/mp4')).toBe(false);
      expect(isSupportedMimeType('text/plain')).toBe(false);
    });
  });

  describe('detectFormatFromBuffer', () => {
    it('should detect WAV format from magic bytes', () => {
      const wavBuffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      const format = detectFormatFromBuffer(wavBuffer);
      expect(format?.extension).toBe('wav');
    });

    it('should detect OGG format from magic bytes', () => {
      const oggBuffer = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x00, 0x00, 0x00]);
      const format = detectFormatFromBuffer(oggBuffer);
      expect(format?.extension).toBe('ogg');
    });

    it('should detect WebM format from magic bytes', () => {
      const webmBuffer = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
      const format = detectFormatFromBuffer(webmBuffer);
      expect(format?.extension).toBe('webm');
    });

    it('should return undefined for unknown format', () => {
      // Use bytes that don't match any known magic bytes
      const unknownBuffer = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
      const format = detectFormatFromBuffer(unknownBuffer);
      expect(format).toBeUndefined();
    });

    it('should return undefined for buffer too small', () => {
      const smallBuffer = new Uint8Array([0x52, 0x49]);
      const format = detectFormatFromBuffer(smallBuffer);
      expect(format).toBeUndefined();
    });
  });

  describe('constants', () => {
    it('should have correct MAX_FILE_SIZE_BYTES (25MB)', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
    });

    it('should have correct DEFAULT_MAX_DURATION_SECONDS (120s)', () => {
      expect(DEFAULT_MAX_DURATION_SECONDS).toBe(120);
    });
  });
});

describe('Audio Validation', () => {
  describe('validateAudio with Blob', () => {
    it('should accept valid audio file', async () => {
      // Create a fake WAV file with magic bytes
      const wavMagic = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]);
      const blob = new Blob([wavMagic, new Uint8Array(1000)], { type: 'audio/wav' });

      const result = await validateAudio(blob);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('audio/wav');
      expect(result.sizeBytes).toBe(1008);
    });

    it('should reject empty file', async () => {
      const blob = new Blob([], { type: 'audio/wav' });

      const result = await validateAudio(blob);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('EMPTY_FILE');
    });

    it('should reject file exceeding size limit', async () => {
      // Create a blob that exceeds 10MB limit in config
      const largeData = new Uint8Array(11 * 1024 * 1024);
      const blob = new Blob([largeData], { type: 'audio/wav' });

      const result = await validateAudio(blob, { maxSizeBytes: 10 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('FILE_TOO_LARGE');
    });

    it('should reject unsupported format', async () => {
      // Use unknown magic bytes and unsupported MIME type
      const unknownBytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, ...new Array(96).fill(0)]);
      const blob = new Blob([unknownBytes], { type: 'audio/aac' });

      const result = await validateAudio(blob);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_FORMAT');
    });
  });

  describe('validateAudio with File', () => {
    it('should detect format from filename extension', async () => {
      const file = new File([new Uint8Array(100)], 'recording.mp3', { type: '' });

      const result = await validateAudio(file);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('mp3');
    });
  });

  describe('isAllowedExtension', () => {
    it('should check against default formats', () => {
      expect(isAllowedExtension('test.mp3')).toBe(true);
      expect(isAllowedExtension('test.wav')).toBe(true);
      expect(isAllowedExtension('test.txt')).toBe(false);
    });

    it('should check against custom format list', () => {
      expect(isAllowedExtension('test.mp3', ['mp3'])).toBe(true);
      expect(isAllowedExtension('test.wav', ['mp3'])).toBe(false);
    });
  });

  describe('isAllowedMimeType', () => {
    it('should delegate to isSupportedMimeType', () => {
      expect(isAllowedMimeType('audio/mpeg')).toBe(true);
      expect(isAllowedMimeType('audio/aac')).toBe(false);
    });
  });
});

describe('WhisperTranscriber', () => {
  describe('createWhisperTranscriber', () => {
    it('should create transcriber instance', () => {
      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      expect(transcriber).toBeDefined();
      expect(transcriber.isAvailable()).toBe(true);
    });

    it('should report unavailable without API key', () => {
      const transcriber = createWhisperTranscriber({ apiKey: '' });
      expect(transcriber.isAvailable()).toBe(false);
    });

    it('should return supported formats', () => {
      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      const formats = transcriber.getSupportedFormats();
      expect(formats).toContain('mp3');
      expect(formats).toContain('wav');
      expect(formats).toContain('webm');
    });

    it('should return max file size', () => {
      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      expect(transcriber.getMaxFileSize()).toBe(MAX_FILE_SIZE_BYTES);
    });
  });

  describe('transcribe', () => {
    it('should throw error if not available', async () => {
      const transcriber = createWhisperTranscriber({ apiKey: '' });
      const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });

      await expect(transcriber.transcribe(blob)).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should handle successful transcription', async () => {
      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Hello world',
            language: 'en',
            duration: 2.5,
          }),
      });
      global.fetch = mockFetch;

      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });

      const result = await transcriber.transcribe(blob);
      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
      expect(result.duration).toBe(2.5);

      // Verify request
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer test-key' },
        })
      );
    });

    it('should handle API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      });
      global.fetch = mockFetch;

      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });

      await expect(transcriber.transcribe(blob)).rejects.toMatchObject({
        code: 'API_ERROR',
        statusCode: 400,
      });
    });

    it('should handle rate limiting', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      });
      global.fetch = mockFetch;

      const transcriber = createWhisperTranscriber({ apiKey: 'test-key' });
      const blob = new Blob([new Uint8Array(100)], { type: 'audio/wav' });

      await expect(transcriber.transcribe(blob)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        statusCode: 429,
      });
    });
  });
});

describe('Voice Handler', () => {
  let mockTranscriber: ReturnType<typeof createWhisperTranscriber>;

  beforeEach(() => {
    mockTranscriber = createWhisperTranscriber({ apiKey: 'test-key' });
    // Mock fetch for transcription
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Test transcription', language: 'en' }),
    });
  });

  describe('handleVoiceRequest', () => {
    it('should return error for missing file', async () => {
      const result = await handleVoiceRequest(null, { transcriber: mockTranscriber });

      expect(result.success).toBe(false);
      expect(result.code).toBe('MISSING_FILE');
      expect(result.status).toBe(400);
    });

    it('should return error if transcriber not available', async () => {
      const unavailableTranscriber = createWhisperTranscriber({ apiKey: '' });
      const file = new File([new Uint8Array(100)], 'test.mp3');

      const result = await handleVoiceRequest(file, { transcriber: unavailableTranscriber });

      expect(result.success).toBe(false);
      expect(result.code).toBe('TRANSCRIBER_NOT_AVAILABLE');
      expect(result.status).toBe(503);
    });

    it('should return error for invalid audio', async () => {
      const file = new File([new Uint8Array(0)], 'test.mp3');

      const result = await handleVoiceRequest(file, { transcriber: mockTranscriber });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMPTY_FILE');
      expect(result.status).toBe(400);
    });

    it('should return success with transcription', async () => {
      const file = new File([new Uint8Array(100)], 'test.mp3');

      const result = await handleVoiceRequest(file, { transcriber: mockTranscriber });

      expect(result.success).toBe(true);
      expect(result.transcription?.text).toBe('Test transcription');
      expect(result.transcription?.language).toBe('en');
      expect(result.status).toBe(200);
    });

    it('should return error for empty transcription', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: '', language: 'en' }),
      });

      const file = new File([new Uint8Array(100)], 'test.mp3');

      const result = await handleVoiceRequest(file, { transcriber: mockTranscriber });

      expect(result.success).toBe(false);
      expect(result.code).toBe('EMPTY_TRANSCRIPTION');
      expect(result.status).toBe(400);
    });

    it('should pass language option to transcriber', async () => {
      const file = new File([new Uint8Array(100)], 'test.mp3');

      await handleVoiceRequest(file, {
        transcriber: mockTranscriber,
        language: 'es',
      });

      // Verify FormData includes language
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData.get('language')).toBe('es');
    });
  });
});
