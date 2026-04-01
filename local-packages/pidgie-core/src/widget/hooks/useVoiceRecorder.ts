/**
 * useVoiceRecorder Hook
 *
 * React hook for managing microphone recording in the browser.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioAnalyser } from './useAudioAnalyser.js';

/**
 * Voice recorder state
 */
export type VoiceRecorderState = 'idle' | 'recording' | 'processing';

/**
 * Voice recorder options
 */
export interface UseVoiceRecorderOptions {
  /** Maximum recording duration in milliseconds (default: 60000 = 1 minute) */
  maxDurationMs?: number;
  /** Audio MIME type to use (default: 'audio/webm;codecs=opus') */
  mimeType?: string;
  /** Callback when recording starts */
  onRecordingStart?: () => void;
  /** Callback when recording stops with audio blob */
  onRecordingStop?: (audioBlob: Blob) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Voice recorder return type
 */
export interface UseVoiceRecorderReturn {
  /** Current recorder state */
  state: VoiceRecorderState;
  /** Whether the recorder is currently recording */
  isRecording: boolean;
  /** Whether the recorder is processing */
  isProcessing: boolean;
  /** Recording duration in milliseconds */
  durationMs: number;
  /** Whether the browser supports voice recording */
  isSupported: boolean;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get audio blob */
  stopRecording: () => Promise<Blob | null>;
  /** Cancel recording without returning audio */
  cancelRecording: () => void;
  /** Error if any */
  error: Error | null;
  /** Real-time audio levels (0-1) for visual feedback, 5 bars */
  audioLevels: number[];
}

/**
 * Hook for managing voice recording
 *
 * @example
 * ```tsx
 * function VoiceInput() {
 *   const {
 *     isRecording,
 *     durationMs,
 *     startRecording,
 *     stopRecording,
 *     isSupported,
 *   } = useVoiceRecorder({
 *     onRecordingStop: async (blob) => {
 *       const formData = new FormData();
 *       formData.append('audio', blob);
 *       await fetch('/api/transcribe', { method: 'POST', body: formData });
 *     },
 *   });
 *
 *   if (!isSupported) return <span>Voice not supported</span>;
 *
 *   return (
 *     <button onClick={isRecording ? stopRecording : startRecording}>
 *       {isRecording ? `Recording ${Math.floor(durationMs / 1000)}s` : 'Start Recording'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useVoiceRecorder(
  options: UseVoiceRecorderOptions = {}
): UseVoiceRecorderReturn {
  const {
    maxDurationMs = 60000,
    mimeType = 'audio/webm;codecs=opus',
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const analyser = useAudioAnalyser();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);
  const maxDurationTimeoutRef = useRef<number | null>(null);
  const resolveFnRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices;

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Clear max duration timeout
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear media recorder
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const err = new Error('Voice recording is not supported in this browser');
      setError(err);
      onError?.(err);
      return;
    }

    if (state !== 'idle') {
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      analyser.start(stream);

      // Determine best MIME type
      const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
      });
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: supportedMimeType });
        setState('idle');
        setDurationMs(0);
        cleanup();

        // Notify via callback
        onRecordingStop?.(audioBlob);

        // Resolve promise if waiting
        if (resolveFnRef.current) {
          resolveFnRef.current(audioBlob);
          resolveFnRef.current = null;
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        const err = new Error('Recording error occurred');
        setError(err);
        onError?.(err);
        setState('idle');
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState('recording');
      onRecordingStart?.();

      // Update duration every 100ms
      durationIntervalRef.current = window.setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current);
      }, 100);

      // Auto-stop at max duration
      maxDurationTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, maxDurationMs);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      onError?.(error);
      cleanup();
    }
  }, [isSupported, state, mimeType, maxDurationMs, onRecordingStart, onRecordingStop, onError, cleanup]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (state !== 'recording' || !mediaRecorderRef.current) {
      return null;
    }

    setState('processing');
    analyser.stop();

    return new Promise((resolve) => {
      resolveFnRef.current = resolve;
      mediaRecorderRef.current?.stop();
    });
  }, [state, analyser]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (state === 'idle') return;

    setState('idle');
    setDurationMs(0);
    analyser.stop();
    cleanup();
    resolveFnRef.current?.(null);
    resolveFnRef.current = null;
  }, [state, analyser, cleanup]);

  return {
    state,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    durationMs,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    audioLevels: analyser.audioLevels,
  };
}
