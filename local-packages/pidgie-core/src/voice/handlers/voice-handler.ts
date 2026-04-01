/**
 * Voice Handler Utilities
 *
 * Helper functions for handling voice transcription in API routes.
 */

import type { TranscriptionResult, AudioValidationConfig } from '../types.js';
import type { TranscriberAdapter, TranscriptionError } from '../transcribers/types.js';
import { validateAudio } from '../audio/validation.js';

/**
 * Voice request handling options
 */
export interface VoiceHandlerOptions {
  /** Transcriber instance to use */
  transcriber: TranscriberAdapter;
  /** Audio validation configuration */
  validation?: AudioValidationConfig;
  /** Language hint for transcription */
  language?: string;
  /** Custom prompt for transcription style */
  prompt?: string;
}

/**
 * Voice request handling result
 */
export interface VoiceHandlerResult {
  /** Whether the request was successful */
  success: boolean;
  /** Transcription result (if successful) */
  transcription?: TranscriptionResult;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  code?: string;
  /** HTTP status code to return */
  status: number;
}

/**
 * Handle a voice transcription request
 *
 * Validates the audio file and transcribes it using the provided transcriber.
 *
 * @param audioFile - Audio file from form data
 * @param options - Handler options
 * @returns Handler result with transcription or error
 *
 * @example
 * ```typescript
 * // In your API route
 * export async function POST(request: Request) {
 *   const formData = await request.formData();
 *   const audioFile = formData.get('audio') as File;
 *
 *   const transcriber = createWhisperTranscriber({
 *     apiKey: process.env.OPENAI_API_KEY!,
 *   });
 *
 *   const result = await handleVoiceRequest(audioFile, { transcriber });
 *
 *   if (!result.success) {
 *     return Response.json({ error: result.error }, { status: result.status });
 *   }
 *
 *   // Continue with agent.chat(result.transcription.text, ...)
 * }
 * ```
 */
export async function handleVoiceRequest(
  audioFile: File | Blob | null | undefined,
  options: VoiceHandlerOptions
): Promise<VoiceHandlerResult> {
  const { transcriber, validation, language, prompt } = options;

  // Check for missing file
  if (!audioFile) {
    return {
      success: false,
      error: 'No audio file provided',
      code: 'MISSING_FILE',
      status: 400,
    };
  }

  // Check transcriber availability
  if (!transcriber.isAvailable()) {
    return {
      success: false,
      error: 'Voice transcription is not configured',
      code: 'TRANSCRIBER_NOT_AVAILABLE',
      status: 503,
    };
  }

  // Validate audio
  const validationResult = await validateAudio(audioFile, validation);
  if (!validationResult.valid) {
    return {
      success: false,
      error: validationResult.error,
      code: validationResult.code,
      status: 400,
    };
  }

  // Transcribe
  try {
    const transcription = await transcriber.transcribe(audioFile, {
      language,
      prompt,
    });

    // Check for empty transcription
    if (!transcription.text || transcription.text.trim() === '') {
      return {
        success: false,
        error: 'No speech detected in audio',
        code: 'EMPTY_TRANSCRIPTION',
        status: 400,
      };
    }

    return {
      success: true,
      transcription,
      status: 200,
    };
  } catch (error) {
    return handleTranscriptionError(error);
  }
}

/**
 * Handle transcription errors and return appropriate result
 */
function handleTranscriptionError(error: unknown): VoiceHandlerResult {
  if (isTranscriptionError(error)) {
    const statusMap: Record<string, number> = {
      TRANSCRIBER_NOT_AVAILABLE: 503,
      INVALID_AUDIO: 400,
      API_ERROR: 502,
      TIMEOUT: 504,
      RATE_LIMITED: 429,
      UNKNOWN: 500,
    };

    return {
      success: false,
      error: error.message,
      code: error.code,
      status: statusMap[error.code] || 500,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown transcription error',
    code: 'UNKNOWN',
    status: 500,
  };
}

/**
 * Type guard for TranscriptionError
 */
function isTranscriptionError(error: unknown): error is TranscriptionError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as TranscriptionError).code === 'string'
  );
}

/**
 * Create a JSON response for voice handler results
 *
 * @param result - Voice handler result
 * @returns Response object
 */
export function createVoiceResponse(result: VoiceHandlerResult): Response {
  if (result.success) {
    return Response.json({
      text: result.transcription!.text,
      language: result.transcription!.language,
      duration: result.transcription!.duration,
    });
  }

  return Response.json(
    { error: result.error, code: result.code },
    { status: result.status }
  );
}
