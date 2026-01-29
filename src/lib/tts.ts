/**
 * Text-to-Speech Service
 *
 * Provides AI-generated audio for snippets using VoiceVox TTS.
 * VoiceVox provides natural-sounding Japanese speech synthesis.
 */

// Audio cache to avoid regenerating
const audioCache = new Map<string, string>();

export interface TTSOptions {
  text: string;
  language?: string;
  speaker?: number; // VoiceVox speaker ID (default: 四国めたん)
}

/**
 * Generate speech audio from text using VoiceVox TTS
 * Returns a blob URL for the audio, or null if unavailable
 */
export async function generateSpeech(options: TTSOptions): Promise<string | null> {
  const { text, speaker = 2 } = options;

  // Check cache first
  const cacheKey = `${text}-${speaker}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  try {
    // Try our VoiceVox API endpoint
    const params = new URLSearchParams({
      text,
      speaker: speaker.toString(),
      format: 'mp3',
    });

    const response = await fetch(`/api/tts?${params}`);

    if (!response.ok) {
      // VoiceVox not available - that's okay, audio is optional
      console.info('[TTS] VoiceVox not available (run docker to enable)');
      return null;
    }

    // Get audio blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Cache it
    audioCache.set(cacheKey, audioUrl);

    return audioUrl;
  } catch (error) {
    // Network error or API not running - audio is optional
    console.info('[TTS] TTS API not available:', error);
    return null;
  }
}

/**
 * Play text using browser's built-in TTS (fallback)
 */
export function playBrowserTTS(text: string, language: string = 'ja-JP'): void {
  if (!('speechSynthesis' in window)) {
    console.warn('[TTS] Browser TTS not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.9; // Slightly slower for learning

  // Try to find a Japanese voice
  const voices = window.speechSynthesis.getVoices();
  const japaneseVoice = voices.find(
    (v) => v.lang.startsWith('ja') && v.name.includes('Google')
  ) || voices.find((v) => v.lang.startsWith('ja'));

  if (japaneseVoice) {
    utterance.voice = japaneseVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing TTS playback
 */
export function stopTTS(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Preload voices (needed for some browsers)
 */
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Some browsers need this event
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };

    // Timeout fallback
    setTimeout(() => resolve([]), 1000);
  });
}

/**
 * Clean up cached audio URLs to free memory
 */
export function clearAudioCache(): void {
  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url);
  }
  audioCache.clear();
}
