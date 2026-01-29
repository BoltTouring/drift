/**
 * Media Service
 *
 * Fetches engaging media (GIFs, animated images) for snippets.
 * Uses Tenor (Google's GIF API) for anime/Japanese content.
 */

// Tenor API - free tier, generous limits
// Get your own key at: https://developers.google.com/tenor/guides/quickstart
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public demo key

interface TenorMedia {
  gif: { url: string };
  mediumgif: { url: string };
  tinygif: { url: string };
}

interface TenorResult {
  id: string;
  media_formats: TenorMedia;
}

interface TenorResponse {
  results: TenorResult[];
}

// Cache to avoid duplicate API calls
const mediaCache = new Map<string, string>();

/**
 * Search terms that work well for Japanese learning content
 */
const JAPANESE_SEARCH_MODIFIERS = [
  'anime',
  'japan',
  'japanese',
  'kawaii',
  'manga',
  'sakura',
  'tokyo',
];

/**
 * Mood/context to search term mappings
 */
const MOOD_SEARCH_TERMS: Record<string, string[]> = {
  greeting: ['hello anime', 'wave anime', 'bow japanese'],
  food: ['eating anime', 'delicious anime', 'ramen', 'sushi'],
  weather: ['rain anime', 'sunny anime', 'snow japan'],
  emotion: ['happy anime', 'sad anime', 'excited anime'],
  nature: ['cherry blossom', 'mountain japan', 'ocean anime'],
  city: ['tokyo', 'japan city', 'train japan'],
  school: ['anime school', 'studying anime', 'classroom anime'],
  love: ['heart anime', 'love anime', 'blush anime'],
  work: ['working anime', 'office japan', 'tired anime'],
  default: ['anime aesthetic', 'lofi anime', 'japan vibes'],
};

/**
 * Extract mood/context from text to find relevant GIFs
 */
function extractSearchTerms(text: string, mediaPrompt?: string): string {
  const lowerText = (text + ' ' + (mediaPrompt || '')).toLowerCase();

  // Check for mood keywords
  for (const [mood, terms] of Object.entries(MOOD_SEARCH_TERMS)) {
    if (mood === 'default') continue;

    const moodKeywords: Record<string, string[]> = {
      greeting: ['hello', 'hi', 'こんにちは', 'おはよう', 'good morning', 'good evening'],
      food: ['eat', 'food', 'delicious', 'hungry', '食べ', 'おいしい', 'ramen', 'sushi'],
      weather: ['weather', 'rain', 'sunny', 'snow', 'cold', 'hot', '天気', '雨', '晴れ'],
      emotion: ['happy', 'sad', 'angry', 'excited', 'tired', '嬉しい', '悲しい', '疲れ'],
      nature: ['flower', 'tree', 'mountain', 'river', 'ocean', '花', '山', '海', 'sakura'],
      city: ['city', 'train', 'station', 'shop', 'street', '駅', '街', '店'],
      school: ['school', 'study', 'learn', 'student', '学校', '勉強', '学生'],
      love: ['love', 'like', 'heart', '好き', '愛', 'crush'],
      work: ['work', 'office', 'job', 'busy', '仕事', '忙しい'],
    };

    if (moodKeywords[mood]?.some(kw => lowerText.includes(kw))) {
      return terms[Math.floor(Math.random() * terms.length)];
    }
  }

  // Default: random anime aesthetic
  const defaults = MOOD_SEARCH_TERMS.default;
  return defaults[Math.floor(Math.random() * defaults.length)];
}

/**
 * Fetch a GIF from Tenor based on text content
 */
export async function fetchGif(text: string, mediaPrompt?: string): Promise<string | null> {
  const searchTerm = extractSearchTerms(text, mediaPrompt);
  const cacheKey = `gif-${searchTerm}`;

  // Check cache (but allow some variety)
  if (mediaCache.has(cacheKey) && Math.random() > 0.3) {
    return mediaCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://tenor.googleapis.com/v2/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=20&media_filter=gif,mediumgif`
    );

    if (!response.ok) {
      console.warn('[Media] Tenor API error:', response.status);
      return null;
    }

    const data: TenorResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log('[Media] No results for:', searchTerm);
      return null;
    }

    // Pick a random GIF from results for variety
    const randomIndex = Math.floor(Math.random() * Math.min(data.results.length, 10));
    const gif = data.results[randomIndex];

    // Use mediumgif for balance of quality and performance
    const url = gif.media_formats?.mediumgif?.url || gif.media_formats?.gif?.url;

    if (url) {
      mediaCache.set(cacheKey, url);
      console.log('[Media] Found GIF:', url.substring(0, 50));
    }
    return url || null;
  } catch (error) {
    console.warn('[Media] Failed to fetch GIF:', error);
    return null;
  }
}

/**
 * Get a static image URL with Ken Burns animation applied via CSS
 * Uses Unsplash for high-quality images
 */
export function getAnimatedImageUrl(mediaPrompt?: string): string {
  const keywords = mediaPrompt
    ? mediaPrompt.toLowerCase().replace(/[^a-z\s]/g, '').split(' ')
        .filter(word => word.length > 3).slice(0, 2).join(',')
    : 'japan,aesthetic';

  // Add Japanese modifier for relevance
  const modifier = JAPANESE_SEARCH_MODIFIERS[Math.floor(Math.random() * JAPANESE_SEARCH_MODIFIERS.length)];
  const query = `${keywords},${modifier}`;

  return `https://source.unsplash.com/768x1344/?${encodeURIComponent(query)}`;
}

/**
 * Determine media type from URL
 */
export function getMediaType(url: string): 'gif' | 'image' | 'video' {
  if (url.includes('.gif') || url.includes('giphy.com')) {
    return 'gif';
  }
  if (url.includes('.mp4') || url.includes('.webm')) {
    return 'video';
  }
  return 'image';
}

/**
 * Preload media for smoother transitions
 */
export function preloadMedia(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const type = getMediaType(url);

    if (type === 'video') {
      const video = document.createElement('video');
      video.onloadeddata = () => resolve();
      video.onerror = reject;
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    }
  });
}
