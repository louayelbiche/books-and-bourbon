/**
 * useAudioAnalyser Hook
 *
 * Extracts real-time frequency data from a MediaStream using Web Audio API.
 * Returns normalized audio levels for visual feedback (e.g., waveform bars).
 */

import { useRef, useCallback, useState } from 'react';

const BAR_COUNT = 5;
const INITIAL_LEVELS = Array(BAR_COUNT).fill(0) as number[];

export function useAudioAnalyser() {
  const [audioLevels, setAudioLevels] = useState<number[]>(INITIAL_LEVELS);
  const contextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  const start = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 32;
    source.connect(analyser);
    contextRef.current = ctx;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const step = Math.max(1, Math.floor(data.length / BAR_COUNT));

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const levels = Array.from({ length: BAR_COUNT }, (_, i) => data[i * step] / 255);
      setAudioLevels(levels);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    contextRef.current?.close();
    contextRef.current = null;
    setAudioLevels(INITIAL_LEVELS);
  }, []);

  return { audioLevels, start, stop };
}
