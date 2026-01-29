/**
 * Media Service
 *
 * Fetches engaging media for snippets.
 * Uses curated Unsplash photos with Ken Burns animation.
 */

/**
 * Curated Unsplash photo IDs organized by mood/theme
 * These are verified high-quality photos that work well for Japanese learning
 */
const CURATED_PHOTOS: Record<string, string[]> = {
  // Japan cityscapes & streets
  city: [
    'Ai2TRdvI6gM', // Tokyo street
    'bwOAixLG0uc', // Japanese alley
    '4kCnBoKFJwM', // Shibuya crossing
    'sD5_XALmmC0', // Japan street night
    'gYdjZzXNWlg', // Tokyo tower
  ],
  // Nature & sakura
  nature: [
    'FxU8KV7psMY', // Cherry blossoms
    'E4bmIPHU0cs', // Japanese garden
    'rH8O0FHFpfw', // Mt Fuji
    '7H77FWkK_x4', // Bamboo forest
    'nKO_1QyFh9o', // Japanese maple
  ],
  // Food
  food: [
    'iy_MT2ifklc', // Ramen
    'SU1LFoeEUkk', // Sushi
    '_Of-Rqn7thI', // Japanese food
    'MqT0asuoIcU', // Bento
    'IGfIGP5ONV0', // Tea ceremony
  ],
  // Cozy/aesthetic
  aesthetic: [
    'FV_PxCqJd88', // Lofi aesthetic
    'KQT93MBCUqE', // Rain window
    'f7uCQM2QWSI', // Cozy interior
    '9aOswReDKPo', // Neon japan
    'iGYiBhdNTpE', // Japan night
  ],
  // Default/general Japan
  default: [
    'GLf7bAwCdYg', // Fushimi shrine
    'dGMkHjpTpK0', // Temple
    'ATgfRqpFfFI', // Lanterns
    '7tDGb3HrITg', // Japan roof
    'CjYFPYyJO8Q', // Torii gate
  ],
};

/**
 * Get mood category from text content
 */
function getMoodCategory(text: string, mediaPrompt?: string): string {
  const lowerText = (text + ' ' + (mediaPrompt || '')).toLowerCase();

  const moodKeywords: Record<string, string[]> = {
    food: ['eat', 'food', 'delicious', 'hungry', '食べ', 'おいしい', 'ramen', 'sushi', 'drink', '飲'],
    nature: ['flower', 'tree', 'mountain', 'river', 'ocean', '花', '山', '海', 'sakura', 'garden', 'forest'],
    city: ['city', 'train', 'station', 'shop', 'street', '駅', '街', '店', 'tokyo', 'walk', 'building'],
    aesthetic: ['rain', 'night', 'quiet', 'alone', 'think', 'feel', 'cozy', 'warm', 'cold'],
  };

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return mood;
    }
  }

  return 'default';
}

/**
 * Fetch a themed image for the snippet
 * Ken Burns animation will be applied via CSS
 */
export async function fetchGif(text: string, mediaPrompt?: string): Promise<string | null> {
  const mood = getMoodCategory(text, mediaPrompt);
  const photos = CURATED_PHOTOS[mood] || CURATED_PHOTOS.default;
  const photoId = photos[Math.floor(Math.random() * photos.length)];

  // Use Lorem Picsum with seed for consistent but varied images
  // The seed ensures same text gets same image, but different texts get different images
  const seed = hashCode(text + mood);
  const url = `https://picsum.photos/seed/${seed}/800/1200`;

  console.log('[Media] Using image seed:', seed, 'mood:', mood);
  return url;
}

/**
 * Simple hash function for generating consistent seeds
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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
