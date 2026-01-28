/**
 * Drift Local Storage Layer
 * 
 * Uses IndexedDB via idb-keyval for persistent local storage.
 * All user data is stored locally for privacy-first personalization.
 */

import { get, set, del, keys, createStore, type UseStore } from 'idb-keyval';
import type {
  Snippet,
  SnippetInteraction,
  UnknownWord,
  UserPreferences,
  PersonalizationProfile,
  DailyDriftSession,
  UserStats,
  DEFAULT_PREFERENCES,
  DEFAULT_PERSONALIZATION,
  DEFAULT_STATS,
} from '@/types/snippet';

// Create separate stores for different data types
const snippetsStore = createStore('drift-snippets', 'snippets');
const interactionsStore = createStore('drift-interactions', 'interactions');
const wordsStore = createStore('drift-words', 'words');
const preferencesStore = createStore('drift-preferences', 'preferences');
const cacheStore = createStore('drift-cache', 'cache');

// Keys for singleton data
const PREFERENCES_KEY = 'user-preferences';
const PERSONALIZATION_KEY = 'personalization-profile';
const STATS_KEY = 'user-stats';
const DAILY_DRIFT_KEY = 'daily-drift';

/**
 * Snippet Storage
 */
export const SnippetStorage = {
  async save(snippet: Snippet): Promise<void> {
    await set(snippet.id, snippet, snippetsStore);
  },

  async get(id: string): Promise<Snippet | undefined> {
    return get<Snippet>(id, snippetsStore);
  },

  async getAll(): Promise<Snippet[]> {
    const allKeys = await keys(snippetsStore);
    const snippets: Snippet[] = [];
    for (const key of allKeys) {
      const snippet = await get<Snippet>(key as string, snippetsStore);
      if (snippet) {
        snippets.push(snippet);
      }
    }
    return snippets;
  },

  async getSaved(): Promise<Snippet[]> {
    const allSnippets = await this.getAll();
    const interactions = await InteractionStorage.getAll();
    const savedIds = new Set(
      interactions
        .filter(i => i.saved)
        .map(i => i.snippetId)
    );
    return allSnippets.filter(s => savedIds.has(s.id));
  },

  async delete(id: string): Promise<void> {
    await del(id, snippetsStore);
  },

  async bulkSave(snippets: Snippet[]): Promise<void> {
    for (const snippet of snippets) {
      await set(snippet.id, snippet, snippetsStore);
    }
  },

  async clear(): Promise<void> {
    const allKeys = await keys(snippetsStore);
    for (const key of allKeys) {
      await del(key, snippetsStore);
    }
  },
};

/**
 * Interaction Storage
 */
export const InteractionStorage = {
  async save(interaction: SnippetInteraction): Promise<void> {
    await set(interaction.snippetId, interaction, interactionsStore);
  },

  async get(snippetId: string): Promise<SnippetInteraction | undefined> {
    return get<SnippetInteraction>(snippetId, interactionsStore);
  },

  async getAll(): Promise<SnippetInteraction[]> {
    const allKeys = await keys(interactionsStore);
    const interactions: SnippetInteraction[] = [];
    for (const key of allKeys) {
      const interaction = await get<SnippetInteraction>(key as string, interactionsStore);
      if (interaction) {
        interactions.push(interaction);
      }
    }
    return interactions;
  },

  async update(
    snippetId: string,
    updates: Partial<SnippetInteraction>
  ): Promise<SnippetInteraction> {
    let existing = await this.get(snippetId);
    if (!existing) {
      existing = {
        snippetId,
        viewedAt: Date.now(),
        dwellTime: 0,
        wordsTapped: [],
      };
    }
    const updated = { ...existing, ...updates };
    await this.save(updated);
    return updated;
  },

  async clear(): Promise<void> {
    const allKeys = await keys(interactionsStore);
    for (const key of allKeys) {
      await del(key, interactionsStore);
    }
  },
};

/**
 * Unknown Words Storage
 */
export const WordStorage = {
  async save(word: UnknownWord): Promise<void> {
    const key = `${word.language}:${word.word}`;
    await set(key, word, wordsStore);
  },

  async get(language: string, word: string): Promise<UnknownWord | undefined> {
    const key = `${language}:${word}`;
    return get<UnknownWord>(key, wordsStore);
  },

  async getAll(language?: string): Promise<UnknownWord[]> {
    const allKeys = await keys(wordsStore);
    const words: UnknownWord[] = [];
    for (const key of allKeys) {
      if (language && !String(key).startsWith(`${language}:`)) {
        continue;
      }
      const word = await get<UnknownWord>(key as string, wordsStore);
      if (word) {
        words.push(word);
      }
    }
    return words;
  },

  async getUnknown(language?: string): Promise<UnknownWord[]> {
    const all = await this.getAll(language);
    return all.filter(w => !w.isKnown);
  },

  async getKnown(language?: string): Promise<UnknownWord[]> {
    const all = await this.getAll(language);
    return all.filter(w => w.isKnown);
  },

  async markKnown(language: string, word: string): Promise<void> {
    const existing = await this.get(language, word);
    if (existing) {
      existing.isKnown = true;
      await this.save(existing);
    }
  },

  async markUnknown(
    language: string,
    word: string,
    reading?: string,
    definition?: string
  ): Promise<UnknownWord> {
    const existing = await this.get(language, word);
    const now = Date.now();

    if (existing) {
      existing.isKnown = false;
      existing.lastSeenAt = now;
      existing.encounterCount += 1;
      if (reading) existing.reading = reading;
      if (definition) existing.definition = definition;
      await this.save(existing);
      return existing;
    }

    const newWord: UnknownWord = {
      word,
      language,
      reading,
      definition,
      firstSeenAt: now,
      lastSeenAt: now,
      encounterCount: 1,
      isKnown: false,
    };
    await this.save(newWord);
    return newWord;
  },

  async delete(language: string, word: string): Promise<void> {
    const key = `${language}:${word}`;
    await del(key, wordsStore);
  },

  async clear(): Promise<void> {
    const allKeys = await keys(wordsStore);
    for (const key of allKeys) {
      await del(key, wordsStore);
    }
  },
};

/**
 * Preferences Storage
 */
export const PreferencesStorage = {
  async get(): Promise<UserPreferences> {
    const prefs = await get<UserPreferences>(PREFERENCES_KEY, preferencesStore);
    if (!prefs) {
      const { DEFAULT_PREFERENCES } = await import('@/types/snippet');
      return { ...DEFAULT_PREFERENCES };
    }
    return prefs;
  },

  async save(preferences: UserPreferences): Promise<void> {
    await set(PREFERENCES_KEY, preferences, preferencesStore);
  },

  async update(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await this.save(updated);
    return updated;
  },

  async reset(): Promise<UserPreferences> {
    const { DEFAULT_PREFERENCES } = await import('@/types/snippet');
    const defaults = { ...DEFAULT_PREFERENCES };
    await this.save(defaults);
    return defaults;
  },
};

/**
 * Personalization Profile Storage
 */
export const PersonalizationStorage = {
  async get(): Promise<PersonalizationProfile> {
    const profile = await get<PersonalizationProfile>(PERSONALIZATION_KEY, preferencesStore);
    if (!profile) {
      const { DEFAULT_PERSONALIZATION } = await import('@/types/snippet');
      return { ...DEFAULT_PERSONALIZATION };
    }
    return profile;
  },

  async save(profile: PersonalizationProfile): Promise<void> {
    await set(PERSONALIZATION_KEY, profile, preferencesStore);
  },

  async update(updates: Partial<PersonalizationProfile>): Promise<PersonalizationProfile> {
    const current = await this.get();
    const updated = { ...current, ...updates, updatedAt: Date.now() };
    await this.save(updated);
    return updated;
  },

  async reset(): Promise<PersonalizationProfile> {
    const { DEFAULT_PERSONALIZATION } = await import('@/types/snippet');
    const defaults = { ...DEFAULT_PERSONALIZATION };
    await this.save(defaults);
    return defaults;
  },
};

/**
 * Stats Storage
 */
export const StatsStorage = {
  async get(): Promise<UserStats> {
    const stats = await get<UserStats>(STATS_KEY, preferencesStore);
    if (!stats) {
      const { DEFAULT_STATS } = await import('@/types/snippet');
      return { ...DEFAULT_STATS };
    }
    return stats;
  },

  async save(stats: UserStats): Promise<void> {
    await set(STATS_KEY, stats, preferencesStore);
  },

  async increment(field: keyof Pick<UserStats, 'totalSnippetsViewed' | 'totalUnknownWords' | 'totalKnownWords' | 'totalZapsSent' | 'totalZapAmount'>, amount = 1): Promise<void> {
    const stats = await this.get();
    (stats[field] as number) += amount;
    await this.save(stats);
  },

  async reset(): Promise<UserStats> {
    const { DEFAULT_STATS } = await import('@/types/snippet');
    const defaults = { ...DEFAULT_STATS };
    await this.save(defaults);
    return defaults;
  },
};

/**
 * Daily Drift Session Storage
 */
export const DailyDriftStorage = {
  getDateKey(date?: Date): string {
    const d = date || new Date();
    return d.toISOString().split('T')[0];
  },

  async getToday(): Promise<DailyDriftSession | undefined> {
    const key = `${DAILY_DRIFT_KEY}:${this.getDateKey()}`;
    return get<DailyDriftSession>(key, preferencesStore);
  },

  async getSession(date: string): Promise<DailyDriftSession | undefined> {
    const key = `${DAILY_DRIFT_KEY}:${date}`;
    return get<DailyDriftSession>(key, preferencesStore);
  },

  async saveSession(session: DailyDriftSession): Promise<void> {
    const key = `${DAILY_DRIFT_KEY}:${session.date}`;
    await set(key, session, preferencesStore);
  },

  async startSession(target: number): Promise<DailyDriftSession> {
    const date = this.getDateKey();
    const existing = await this.getSession(date);
    
    if (existing && existing.startedAt) {
      // Resume existing session
      return existing;
    }

    const session: DailyDriftSession = {
      date,
      target,
      viewed: 0,
      likes: 0,
      dislikes: 0,
      saves: 0,
      wordTaps: 0,
      zapAmount: 0,
      completed: false,
      startedAt: Date.now(),
    };

    await this.saveSession(session);
    return session;
  },

  async updateSession(updates: Partial<DailyDriftSession>): Promise<DailyDriftSession | undefined> {
    const session = await this.getToday();
    if (!session) return undefined;

    const updated = { ...session, ...updates };
    
    // Check if completed
    if (updated.viewed >= updated.target && !updated.completed) {
      updated.completed = true;
      updated.completedAt = Date.now();
    }

    await this.saveSession(updated);
    return updated;
  },

  async getHistory(days = 30): Promise<DailyDriftSession[]> {
    const sessions: DailyDriftSession[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = this.getDateKey(date);
      const session = await this.getSession(dateKey);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  },
};

/**
 * Cache Storage (for offline snippets)
 */
export const CacheStorage = {
  async cacheSnippets(snippets: Snippet[]): Promise<void> {
    await set('cached-snippets', snippets, cacheStore);
    await set('cache-timestamp', Date.now(), cacheStore);
  },

  async getCachedSnippets(): Promise<Snippet[]> {
    const snippets = await get<Snippet[]>('cached-snippets', cacheStore);
    return snippets || [];
  },

  async getCacheTimestamp(): Promise<number | undefined> {
    return get<number>('cache-timestamp', cacheStore);
  },

  async clearCache(): Promise<void> {
    await del('cached-snippets', cacheStore);
    await del('cache-timestamp', cacheStore);
  },
};

/**
 * Clear all Drift data
 */
export async function clearAllData(): Promise<void> {
  await SnippetStorage.clear();
  await InteractionStorage.clear();
  await WordStorage.clear();
  await PreferencesStorage.reset();
  await PersonalizationStorage.reset();
  await StatsStorage.reset();
  await CacheStorage.clearCache();
}
