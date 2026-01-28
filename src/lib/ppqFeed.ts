/**
 * PPQ.ai Feed Loader
 * 
 * Fetches AI-generated language learning content from /api/feed.
 * Falls back to placeholder data if the API is unavailable (static-only deployment).
 */

export interface PPQFeedItem {
  id: string;
  jp: string; // Japanese text
  en: string; // English translation
  level: 'N5' | 'N4' | 'N3' | 'N2'; // JLPT level
  mediaPrompt?: string; // Optional image generation prompt
}

/**
 * Placeholder feed data (5 sample items)
 * Used when /api/feed is unavailable (static-only deployment)
 */
const PLACEHOLDER_FEED: PPQFeedItem[] = [
  {
    id: 'placeholder-1',
    jp: '今日は天気がいいですね。',
    en: 'The weather is nice today, isn\'t it?',
    level: 'N5',
    mediaPrompt: 'A sunny day with clear blue sky and people enjoying outdoor activities',
  },
  {
    id: 'placeholder-2',
    jp: 'コーヒーを飲みながら本を読んでいます。',
    en: 'I\'m reading a book while drinking coffee.',
    level: 'N4',
    mediaPrompt: 'A person reading a book at a cozy café with a cup of coffee',
  },
  {
    id: 'placeholder-3',
    jp: '来週の予定を確認しましょう。',
    en: 'Let\'s check next week\'s schedule.',
    level: 'N4',
    mediaPrompt: 'A calendar or planner showing weekly schedule',
  },
  {
    id: 'placeholder-4',
    jp: 'この映画、めっちゃ面白かった！',
    en: 'This movie was really interesting!',
    level: 'N3',
    mediaPrompt: 'A movie theater or cinema scene with excited audience',
  },
  {
    id: 'placeholder-5',
    jp: 'お忙しいところ恐れ入りますが、ご確認いただけますでしょうか。',
    en: 'I apologize for bothering you while you\'re busy, but could you please check this?',
    level: 'N2',
    mediaPrompt: 'A professional office setting with polite business interaction',
  },
];

/**
 * Fetch feed from /api/feed endpoint
 * Falls back to placeholder data if unavailable
 */
export async function fetchPPQFeed(): Promise<PPQFeedItem[]> {
  try {
    const response = await fetch('/api/feed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to fail fast if endpoint doesn't exist
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (Array.isArray(data) && data.length > 0) {
      // Basic validation - check if items have required fields
      const isValid = data.every((item: unknown) => 
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'jp' in item &&
        'en' in item &&
        'level' in item
      );

      if (isValid) {
        return data as PPQFeedItem[];
      }
    }

    throw new Error('Invalid API response format');
  } catch (error) {
    // API unavailable - use placeholder and log warning
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(
        '%c[Drift] AI feed API unavailable (static deployment). Using placeholder content.\n' +
        'To enable AI-generated content, deploy with server-side support (e.g., Vercel, Netlify Functions).',
        'color: #f59e0b; font-weight: bold;'
      );
    } else {
      console.warn('[Drift] Failed to fetch AI feed, using placeholder:', error);
    }
    
    return PLACEHOLDER_FEED;
  }
}

/**
 * Convert PPQ feed item to Drift Snippet
 */
export function ppqItemToSnippet(item: PPQFeedItem, language: string = 'ja'): import('@/types/snippet').Snippet {
  const now = Math.floor(Date.now() / 1000);
  
  // Map JLPT level to difficulty (1-5 scale)
  const levelToDifficulty: Record<string, 1 | 2 | 3 | 4 | 5> = {
    'N5': 1,
    'N4': 2,
    'N3': 3,
    'N2': 4,
  };

  // Estimate length class from text
  const textLength = item.jp.length;
  let lengthClass: 'word' | 'phrase' | 'sentence' | 'paragraph' = 'sentence';
  if (textLength < 10) lengthClass = 'word';
  else if (textLength < 30) lengthClass = 'phrase';
  else if (textLength < 80) lengthClass = 'sentence';
  else lengthClass = 'paragraph';

  return {
    id: item.id,
    text: item.jp,
    language: language as import('@/types/snippet').LanguageCode,
    translation: item.en,
    dialectTag: '標準語',
    topicTags: ['ai-generated', 'media-backed'],
    lengthClass,
    difficultyEstimate: levelToDifficulty[item.level] || 3,
    source: {
      isAiGenerated: true,
      curatorPubkey: undefined,
      originalAuthorPubkey: undefined,
    },
    createdAt: now,
    safetyFlags: {
      sensitive: false,
      profanity: false,
      adult: false,
    },
    popularity: {
      likes: 0,
      dislikes: 0,
      saves: 0,
      zaps: 0,
      zapAmount: 0,
    },
    // Note: mediaPrompt is available but not stored in Snippet structure
  };
}
