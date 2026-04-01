/**
 * Factory for creating voice transcription API route handlers.
 *
 * Wraps pidgie-core voice utilities with session validation,
 * rate limiting, and configurable language detection.
 */

import {
  createWhisperTranscriber,
  handleVoiceRequest,
} from '@runwell/pidgie-core/voice';
import { createLogger, logError } from '@runwell/logger';

const voiceLogger = createLogger('voice-handler');

export interface VoiceHandlerSessionStore {
  get(id: string): unknown | null;
}

export interface CreateVoiceHandlerOptions {
  sessionStore: VoiceHandlerSessionStore;
  /** Max file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Whisper timeout in ms (default: 30000) */
  timeout?: number;
  /**
   * Extract language hint from session.
   * Pidgie uses website.language; shopimate uses 'en'.
   */
  getLanguage?: (session: unknown) => string | undefined;
  /** Enable rate limiting per session (default: true) */
  enableRateLimit?: boolean;
  /** Rate limit: max requests per minute (default: 10) */
  rateLimitPerMinute?: number;
}

// Simple in-memory rate limit
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodically clean expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000).unref();

function checkRateLimit(sessionId: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(sessionId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

export function createVoiceHandler(options: CreateVoiceHandlerOptions) {
  const {
    sessionStore,
    maxSizeBytes = 10 * 1024 * 1024,
    timeout = 30000,
    getLanguage,
    enableRateLimit = true,
    rateLimitPerMinute = 10,
  } = options;

  return async function POST(request: Request): Promise<Response> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: 'Voice transcription is not configured' },
          { status: 503 }
        );
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return Response.json(
          { error: 'Invalid request: expected multipart/form-data' },
          { status: 400 }
        );
      }

      const audioFile = formData.get('audio') as File | null;
      const sessionId = formData.get('sessionId') as string | null;

      if (!sessionId || typeof sessionId !== 'string') {
        return Response.json(
          { error: 'Session ID is required' },
          { status: 400 }
        );
      }

      const session = sessionStore.get(sessionId);
      if (!session) {
        return Response.json(
          { error: 'Session not found or expired' },
          { status: 404 }
        );
      }

      // Rate limiting
      if (enableRateLimit && !checkRateLimit(sessionId, rateLimitPerMinute)) {
        return Response.json(
          { error: 'Too many voice requests' },
          { status: 429 }
        );
      }

      const transcriber = createWhisperTranscriber({ apiKey, timeout });

      const language = getLanguage ? getLanguage(session as Record<string, unknown>) : undefined;

      const result = await handleVoiceRequest(audioFile, {
        transcriber,
        language,
        validation: { maxSizeBytes },
      });

      if (!result.success) {
        return Response.json(
          { error: result.error, code: result.code },
          { status: result.status }
        );
      }

      return Response.json({
        text: result.transcription!.text,
        language: result.transcription!.language,
        duration: result.transcription!.duration,
      });
    } catch (error) {
      voiceLogger.error('Voice handler error', logError(error));
      return Response.json(
        { error: 'Voice transcription failed' },
        { status: 500 }
      );
    }
  };
}
