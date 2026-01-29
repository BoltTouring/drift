/**
 * Text-to-Speech Service
 *
 * Provides AI-generated audio for snippets using PPQ.ai (OpenAI-compatible TTS).
 * Falls back to browser TTS when API is unavailable.
 */

// Audio cache to avoid regenerating
const audioCache = new Map<string, string>();

export interface TTSOptions {
  text: string;
  language?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

/**
 * Generate speech audio from text using PPQ.ai TTS
 * Returns a blob URL for the audio
 */
export async function generateSpeech(options: TTSOptions): Promise<string | null> {
  const { text, voice = 'nova', speed = 1.0 } = options;

  // Check cache first
  const cacheKey = `${text}-${voice}-${speed}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const apiKey = import.meta.env.VITE_PPQ_API_KEY as string | undefined;

  if (!apiKey) {
    console.warn('[TTS] No API key, falling back to browser TTS');
    return null;
  }

  try {
    const response = await fetch('https://api.ppq.ai/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    // Get audio blob and create URL
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Cache it
    audioCache.set(cacheKey, audioUrl);

    return audioUrl;
  } catch (error) {
    console.warn('[TTS] API failed, falling back to browser TTS:', error);
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
