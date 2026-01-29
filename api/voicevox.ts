/**
 * VoiceVox TTS Client
 *
 * Generates natural Japanese audio using VoiceVox.
 * VoiceVox must be running locally or on a server.
 *
 * Default endpoint: http://localhost:50021
 * Docker: docker run -p 50021:50021 voicevox/voicevox_engine
 */

// VoiceVox speaker IDs (some popular voices)
export const VOICEVOX_SPEAKERS = {
  SHIKOKU_METAN_NORMAL: 2,      // 四国めたん - ノーマル (clear, good for learning)
  ZUNDAMON_NORMAL: 3,           // ずんだもん - ノーマル (cute, popular)
  TSUMUGI_NORMAL: 8,            // 春日部つむぎ - ノーマル (young female)
  RITSU_NORMAL: 9,              // 波音リツ - ノーマル (calm)
  HIMARI_NORMAL: 14,            // 冥鳴ひまり - ノーマル (mature)
  KOTAROU_NORMAL: 21,           // 剣崎雌雄 - ノーマル (male)
} as const;

export type VoicevoxSpeakerId = typeof VOICEVOX_SPEAKERS[keyof typeof VOICEVOX_SPEAKERS];

export interface VoicevoxOptions {
  /** VoiceVox engine URL (default: http://localhost:50021) */
  baseUrl?: string;
  /** Speaker ID (default: SHIKOKU_METAN_NORMAL) */
  speakerId?: VoicevoxSpeakerId;
  /** Speaking speed (0.5-2.0, default: 1.0) */
  speedScale?: number;
  /** Pitch scale (0.5-2.0, default: 1.0) */
  pitchScale?: number;
  /** Intonation scale (0.0-2.0, default: 1.0) */
  intonationScale?: number;
  /** Volume scale (0.0-2.0, default: 1.0) */
  volumeScale?: number;
}

const DEFAULT_OPTIONS: Required<VoicevoxOptions> = {
  baseUrl: process.env.VOICEVOX_URL || 'http://localhost:50021',
  speakerId: VOICEVOX_SPEAKERS.SHIKOKU_METAN_NORMAL,
  speedScale: 0.9, // Slightly slower for learners
  pitchScale: 1.0,
  intonationScale: 1.0,
  volumeScale: 1.0,
};

/**
 * Generate audio from Japanese text using VoiceVox
 * Returns WAV audio as ArrayBuffer
 */
export async function synthesizeSpeech(
  text: string,
  options: VoicevoxOptions = {}
): Promise<ArrayBuffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Create audio query
  const queryUrl = new URL('/audio_query', opts.baseUrl);
  queryUrl.searchParams.set('text', text);
  queryUrl.searchParams.set('speaker', String(opts.speakerId));

  const queryResponse = await fetch(queryUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!queryResponse.ok) {
    throw new Error(`VoiceVox audio_query failed: ${queryResponse.status}`);
  }

  const audioQuery = await queryResponse.json();

  // Apply speed/pitch adjustments
  audioQuery.speedScale = opts.speedScale;
  audioQuery.pitchScale = opts.pitchScale;
  audioQuery.intonationScale = opts.intonationScale;
  audioQuery.volumeScale = opts.volumeScale;

  // Step 2: Synthesize audio
  const synthUrl = new URL('/synthesis', opts.baseUrl);
  synthUrl.searchParams.set('speaker', String(opts.speakerId));

  const synthResponse = await fetch(synthUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery),
  });

  if (!synthResponse.ok) {
    throw new Error(`VoiceVox synthesis failed: ${synthResponse.status}`);
  }

  return synthResponse.arrayBuffer();
}

/**
 * Generate audio and return as base64 data URL
 * Useful for embedding directly in responses
 */
export async function synthesizeToDataUrl(
  text: string,
  options: VoicevoxOptions = {}
): Promise<string> {
  const audioBuffer = await synthesizeSpeech(text, options);
  const base64 = Buffer.from(audioBuffer).toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

/**
 * Check if VoiceVox is available
 */
export async function isVoicevoxAvailable(
  baseUrl: string = DEFAULT_OPTIONS.baseUrl
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available speakers
 */
export async function getSpeakers(
  baseUrl: string = DEFAULT_OPTIONS.baseUrl
): Promise<Array<{ name: string; styles: Array<{ id: number; name: string }> }>> {
  const response = await fetch(`${baseUrl}/speakers`);
  if (!response.ok) {
    throw new Error(`Failed to get speakers: ${response.status}`);
  }
  return response.json();
}
