/**
 * TTS Hook
 *
 * React hook for text-to-speech functionality.
 * Prefers cached audio URLs, falls back to AI TTS, then browser TTS.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSpeech, stopTTS, preloadVoices } from '@/lib/tts';

export interface UseTTSOptions {
  language?: string;
  /** Pre-generated audio URL (highest quality, cached) */
  audioUrl?: string;
  /** Auto-play when component mounts or audioUrl changes */
  autoPlay?: boolean;
}

export interface UseTTSResult {
  /** Play audio for the given text (or use cached audioUrl) */
  speak: (text: string) => Promise<void>;
  /** Stop current playback */
  stop: () => void;
  /** Play the cached audioUrl directly */
  playAudio: () => Promise<void>;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSResult {
  const { language = 'ja-JP', audioUrl, autoPlay = false } = options;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayedRef = useRef(false);

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

  // Play a specific audio URL
  const playAudioUrl = useCallback(
    async (url: string): Promise<boolean> => {
      try {
        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise((resolve) => {
          audio.onplay = () => {
            setIsPlaying(true);
            setIsLoading(false);
          };
          audio.onended = () => {
            setIsPlaying(false);
            resolve(true);
          };
          audio.onerror = () => {
            setError('Audio playback failed');
            setIsPlaying(false);
            setIsLoading(false);
            resolve(false);
          };

          audio.play().catch(() => {
            // Autoplay blocked - user needs to interact first
            setIsLoading(false);
            resolve(false);
          });
        });
      } catch {
        return false;
      }
    },
    []
  );

  // Play cached audio directly
  const playAudio = useCallback(async () => {
    if (!audioUrl) {
      setError('No audio URL available');
      return;
    }

    stop();
    setError(null);
    setIsLoading(true);

    await playAudioUrl(audioUrl);
  }, [audioUrl, stop, playAudioUrl]);

  // Speak text - uses cached URL if available, otherwise generates
  const speak = useCallback(
    async (text: string) => {
      stop();
      setError(null);
      setIsLoading(true);

      // 1. Try cached audio URL first (best quality)
      if (audioUrl) {
        const success = await playAudioUrl(audioUrl);
        if (success) return;
      }

      // 2. Try VoiceVox TTS generation (if server is running)
      try {
        const generatedUrl = await generateSpeech({ text, language });

        if (generatedUrl) {
          await playAudioUrl(generatedUrl);
          return;
        }
      } catch (err) {
        // VoiceVox not available - this is fine, audio is optional
        console.info('[TTS] VoiceVox not running');
      }

      // 3. No audio available - this is okay, not an error
      setIsLoading(false);
    },
    [audioUrl, language, stop, playAudioUrl]
  );

  // Auto-play when audioUrl is available and autoPlay is enabled
  useEffect(() => {
    if (autoPlay && audioUrl && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      // Small delay to allow component to settle
      const timer = setTimeout(() => {
        playAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, audioUrl, playAudio]);

  // Reset autoplay flag when audioUrl changes
  useEffect(() => {
    hasAutoPlayedRef.current = false;
  }, [audioUrl]);

  return {
    speak,
    stop,
    playAudio,
    isPlaying,
    isLoading,
    error,
  };
}
