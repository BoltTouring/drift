/**
 * TTS Hook
 *
 * React hook for text-to-speech functionality.
 * Uses AI TTS when available, falls back to browser TTS.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSpeech, playBrowserTTS, stopTTS, preloadVoices } from '@/lib/tts';

export interface UseTTSOptions {
  language?: string;
}

export interface UseTTSResult {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSResult {
  const { language = 'ja-JP' } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload voices on mount
  useEffect(() => {
    preloadVoices();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopTTS();
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopTTS();
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      // Stop any current playback
      stop();
      setError(null);
      setIsLoading(true);

      try {
        // Try AI TTS first
        const audioUrl = await generateSpeech({ text, language });

        if (audioUrl) {
          // Play AI-generated audio
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onplay = () => setIsPlaying(true);
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            setError('Audio playback failed');
            setIsPlaying(false);
          };

          await audio.play();
        } else {
          // Fall back to browser TTS
          setIsPlaying(true);
          playBrowserTTS(text, language);

          // Browser TTS doesn't have reliable end event, estimate duration
          const estimatedDuration = Math.max(text.length * 150, 1000);
          setTimeout(() => setIsPlaying(false), estimatedDuration);
        }
      } catch (err) {
        console.error('[TTS] Error:', err);
        setError(err instanceof Error ? err.message : 'TTS failed');

        // Try browser TTS as last resort
        try {
          setIsPlaying(true);
          playBrowserTTS(text, language);
          const estimatedDuration = Math.max(text.length * 150, 1000);
          setTimeout(() => setIsPlaying(false), estimatedDuration);
        } catch {
          setIsPlaying(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [language, stop]
  );

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    error,
  };
}
