/**
 * Voice Module
 *
 * Voice input capabilities for pidgie-core using pluggable transcription adapters.
 *
 * @example
 * ```typescript
 * import {
 *   createWhisperTranscriber,
 *   validateAudio,
 *   handleVoiceRequest,
 * } from '@runwell/pidgie-core/voice';
 *
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
 *   // Pass transcribed text to agent
 *   const response = await agent.chat(result.transcription.text, context);
 * }
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Core types
  TranscriptionResult,
  TranscriberOptions,
  AudioValidationConfig,
  AudioValidationResult,
  AudioValidationErrorCode,
  AudioFormat,
} from './types.js';

export type {
  // Transcriber types
  TranscriberAdapter,
  BaseTranscriberConfig,
  WhisperTranscriberConfig,
  TranscriptionError,
  TranscriptionErrorCode,
} from './transcribers/types.js';

export type {
  // Factory types
  TranscriberProvider,
  TranscriberConfigMap,
} from './transcribers/factory.js';

export type {
  // Handler types
  VoiceHandlerOptions,
  VoiceHandlerResult,
} from './handlers/voice-handler.js';

// =============================================================================
// Transcribers
// =============================================================================

export { WhisperTranscriber, createWhisperTranscriber } from './transcribers/whisper.js';
export { createTranscriber } from './transcribers/factory.js';

// =============================================================================
// Audio Validation
// =============================================================================

export {
  validateAudio,
  isAllowedExtension,
  isAllowedMimeType,
  DEFAULT_VALIDATION_CONFIG,
  type AudioFileInput,
} from './audio/validation.js';

// =============================================================================
// Audio Formats
// =============================================================================

export {
  SUPPORTED_FORMATS,
  getSupportedExtensions,
  getSupportedMimeTypes,
  isSupportedMimeType,
  isSupportedExtension,
  getFormatByExtension,
  getFormatByMimeType,
  detectFormatFromBuffer,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_DURATION_SECONDS,
} from './audio/formats.js';

// =============================================================================
// Handlers
// =============================================================================

export {
  handleVoiceRequest,
  createVoiceResponse,
} from './handlers/voice-handler.js';
