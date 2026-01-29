/**
 * Drift Snippet Types
 * 
 * These types define the core data model for the Drift language learning app.
 */

/** BCP-47 language tags for supported languages */
export type LanguageCode = 
  | 'ja' // Japanese
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'zh' // Chinese
  | 'ko' // Korean
  | 'pt' // Portuguese
  | 'it' // Italian
  | 'ru' // Russian
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'th' // Thai
  | 'vi' // Vietnamese
  | string; // Allow other BCP-47 tags

/** Japanese dialect tags */
export type JapaneseDialect =
  | '標準語' // Standard Japanese
  | '関西弁' // Kansai dialect
  | '博多弁' // Hakata dialect
  | 'custom';

/** Content length classification */
export type LengthClass = 
  | 'word'      // Single word
  | 'phrase'    // Short phrase
  | 'sentence'  // Single sentence
  | 'paragraph'; // 2-3 sentences

/** Difficulty level (1-5 scale) */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Safety flags for content moderation */
export interface SafetyFlags {
  sensitive: boolean;
  profanity: boolean;
  adult: boolean;
}

/** Source information for a snippet */
export interface SnippetSource {
  /** Original Nostr event ID if from Nostr */
  nostrOriginalEventId?: string;
  /** Pubkey of the curator who created this snippet */
  curatorPubkey?: string;
  /** Pubkey of the original author (from the source post) */
  originalAuthorPubkey?: string;
  /** Whether this snippet was AI-generated */
  isAiGenerated?: boolean;
}

/** Popularity counters for a snippet */
export interface PopularityCounters {
  likes: number;
  dislikes: number;
  saves: number;
  zaps: number;
  zapAmount: number; // Total sats zapped
}

/**
 * Canonical Snippet object
 * This is the main data structure for a learning snippet in Drift.
 */
export interface Snippet {
  /** Unique identifier (Nostr event ID or local UUID) */
  id: string;
  /** The text content to learn */
  text: string;
  /** BCP-47 language code */
  language: LanguageCode;
  /** Optional dialect tag (especially for Japanese) */
  dialectTag?: string;
  /** Topic tags for categorization */
  topicTags: string[];
  /** Length classification */
  lengthClass: LengthClass;
  /** Difficulty estimate (1-5) */
  difficultyEstimate: DifficultyLevel;
  /** Source metadata */
  source: SnippetSource;
  /** Unix timestamp of creation */
  createdAt: number;
  /** Safety flags for content filtering */
  safetyFlags: SafetyFlags;
  /** Popularity counters (may be updated from Nostr) */
  popularity: PopularityCounters;
  /** Optional translation (if fetched/generated) */
  translation?: string;
  /** For Japanese: furigana reading data */
  furigana?: FuriganaSegment[];
  /** 🎬 Optional AI media prompt (image/video background) */
  mediaPrompt?: string;
  /** Generated image URL from mediaPrompt */
  mediaUrl?: string;
  /** 🔊 Cached audio URL for TTS (pre-generated, native quality) */
  audioUrl?: string;
}

/**
 * Furigana segment for Japanese text
 * Maps a surface form to its reading.
 */
export interface FuriganaSegment {
  /** The text as displayed */
  surface: string;
  /** The reading in hiragana/katakana */
  reading: string;
  /** Whether this is a kanji word that needs furigana */
  isKanji: boolean;
}

/**
 * User interaction with a snippet (local signals)
 */
export interface SnippetInteraction {
  snippetId: string;
  /** Timestamp when the snippet was first viewed */
  viewedAt: number;
  /** Total dwell time in milliseconds */
  dwellTime: number;
  /** Whether the user liked this snippet */
  liked?: boolean;
  /** Whether the user disliked this snippet */
  disliked?: boolean;
  /** Whether the user saved this snippet */
  saved?: boolean;
  /** Amount zapped (in sats) */
  zappedAmount?: number;
  /** Whether the meaning was revealed */
  meaningRevealed?: boolean;
  /** Words that were tapped for lookup */
  wordsTapped: string[];
  /** Whether this was a fast skip (swipe within 1 second) */
  wasSkip?: boolean;
}

/**
 * Unknown word entry
 */
export interface UnknownWord {
  /** The word surface form */
  word: string;
  /** Language code */
  language: LanguageCode;
  /** Optional reading (for Japanese) */
  reading?: string;
  /** Timestamp when first marked unknown */
  firstSeenAt: number;
  /** Timestamp when last seen */
  lastSeenAt: number;
  /** Number of times encountered */
  encounterCount: number;
  /** Whether the user has marked this as known */
  isKnown: boolean;
  /** Optional definition/translation */
  definition?: string;
}

/**
 * Topic preference weight
 */
export interface TopicWeight {
  topic: string;
  weight: number; // -1 to 1, where positive = preferred
  interactionCount: number;
}

/**
 * User preferences for the app
 */
export interface UserPreferences {
  /** Target language for learning */
  targetLanguage: LanguageCode;
  /** Dictionary mode: L-L (monolingual) or L-E (bilingual) */
  dictionaryMode: 'L-L' | 'L-E';
  /** Furigana display mode (Japanese only) */
  furiganaMode: 'off' | 'on' | 'unknown-only';
  /** Maximum snippet length preference */
  maxSnippetLength: LengthClass;
  /** Dialect filter preference (boost content with this dialect) */
  dialectFilter?: string;
  /** Dialect for AI generation */
  dialectGeneration?: string;
  /** Whether to hide sensitive content */
  hideSensitive: boolean;
  /** Whether to prioritize followed accounts */
  prioritizeFollowed: boolean;
  /** Daily drift target (number of snippets) */
  dailyDriftTarget: 5 | 10 | 15;
  /** Auto-advance after like/dislike */
  autoAdvance: boolean;
  /** Offline cache size (number of snippets) */
  offlineCacheSize: 50 | 100;
  /** Whether to publish reactions to Nostr */
  publishReactions: boolean;
}

/**
 * Personalization profile computed from local signals
 */
export interface PersonalizationProfile {
  /** Topic weights from interactions */
  topicWeights: TopicWeight[];
  /** Dialect preference weights */
  dialectWeights: { dialect: string; weight: number }[];
  /** Preferred length class based on engagement */
  preferredLength: LengthClass;
  /** Preferred difficulty range */
  preferredDifficultyMin: DifficultyLevel;
  preferredDifficultyMax: DifficultyLevel;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Daily drift session data
 */
export interface DailyDriftSession {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Target number of snippets */
  target: number;
  /** Number of snippets viewed */
  viewed: number;
  /** Number of likes */
  likes: number;
  /** Number of dislikes */
  dislikes: number;
  /** Number of saves */
  saves: number;
  /** Number of word taps */
  wordTaps: number;
  /** Total zap amount */
  zapAmount: number;
  /** Whether the session was completed */
  completed: boolean;
  /** Start time of the session */
  startedAt?: number;
  /** End time of the session */
  completedAt?: number;
}

/**
 * Stats for the stats page
 */
export interface UserStats {
  /** Daily session history */
  dailySessions: DailyDriftSession[];
  /** Total snippets viewed all time */
  totalSnippetsViewed: number;
  /** Total words marked unknown */
  totalUnknownWords: number;
  /** Total words marked known */
  totalKnownWords: number;
  /** Total zaps sent */
  totalZapsSent: number;
  /** Total zap amount sent */
  totalZapAmount: number;
  /** Streak count (consecutive days) */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
}

/** Default user preferences */
export const DEFAULT_PREFERENCES: UserPreferences = {
  targetLanguage: 'ja',
  dictionaryMode: 'L-E',
  furiganaMode: 'unknown-only',
  maxSnippetLength: 'sentence',
  dialectFilter: '標準語',
  dialectGeneration: '標準語',
  hideSensitive: true,
  prioritizeFollowed: true,
  dailyDriftTarget: 10,
  autoAdvance: false,
  offlineCacheSize: 50,
  publishReactions: false,
};

/** Default personalization profile */
export const DEFAULT_PERSONALIZATION: PersonalizationProfile = {
  topicWeights: [],
  dialectWeights: [],
  preferredLength: 'sentence',
  preferredDifficultyMin: 2,
  preferredDifficultyMax: 4,
  updatedAt: 0,
};

/** Default user stats */
export const DEFAULT_STATS: UserStats = {
  dailySessions: [],
  totalSnippetsViewed: 0,
  totalUnknownWords: 0,
  totalKnownWords: 0,
  totalZapsSent: 0,
  totalZapAmount: 0,
  currentStreak: 0,
  longestStreak: 0,
};
