/**
 * TTS API Endpoint
 *
 * Generates Japanese audio using VoiceVox.
 * Returns audio as WAV or data URL.
 *
 * GET /api/tts?text=こんにちは&format=wav
 * GET /api/tts?text=こんにちは&format=dataurl
 */

import { synthesizeSpeech, isVoicevoxAvailable, VOICEVOX_SPEAKERS } from './voicevox';

// Simple in-memory cache for audio
const audioCache = new Map<string, { data: ArrayBuffer; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

function getCacheKey(text: string, speakerId: number): string {
  return `${speakerId}:${text}`;
}

function cleanCache() {
  if (audioCache.size <= MAX_CACHE_SIZE) return;

  const now = Date.now();
  const entries = Array.from(audioCache.entries());

  // Remove expired entries
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }

  // If still too large, remove oldest
  if (audioCache.size > MAX_CACHE_SIZE) {
    const sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.slice(0, audioCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      audioCache.delete(key);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, format = 'wav', speaker = '2' } = req.query;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Missing text parameter' });
    return;
  }

  if (text.length > 500) {
    res.status(400).json({ error: 'Text too long (max 500 chars)' });
    return;
  }

  const speakerId = parseInt(speaker, 10) || VOICEVOX_SPEAKERS.SHIKOKU_METAN_NORMAL;

  try {
    // Check if VoiceVox is available
    const available = await isVoicevoxAvailable();
    if (!available) {
      res.status(503).json({
        error: 'VoiceVox not available',
        message: 'TTS engine is not running. Start VoiceVox with: docker run -p 50021:50021 voicevox/voicevox_engine',
      });
      return;
    }

    // Check cache
    const cacheKey = getCacheKey(text, speakerId);
    const cached = audioCache.get(cacheKey);

    let audioBuffer: ArrayBuffer;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      audioBuffer = cached.data;
    } else {
      // Generate new audio
      audioBuffer = await synthesizeSpeech(text, { speakerId });

      // Cache it
      audioCache.set(cacheKey, { data: audioBuffer, timestamp: Date.now() });
      cleanCache();
    }

    if (format === 'dataurl') {
      const base64 = Buffer.from(audioBuffer).toString('base64');
      const dataUrl = `data:audio/wav;base64,${base64}`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).json({ audioUrl: dataUrl });
    } else {
      // Return raw WAV
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(Buffer.from(audioBuffer));
    }
  } catch (err: unknown) {
    console.error('[TTS] Error:', err);
    res.status(500).json({
      error: 'TTS generation failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
