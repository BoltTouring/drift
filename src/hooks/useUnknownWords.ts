/**
 * Drift Unknown Words Hook
 * 
 * Manages the user's unknown/known word vocabulary list.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WordStorage, StatsStorage } from '@/lib/storage';
import type { UnknownWord, LanguageCode } from '@/types/snippet';

/**
 * Hook to manage unknown words
 */
export function useUnknownWords(language?: LanguageCode) {
  const queryClient = useQueryClient();

  const { data: allWords = [], isLoading, error } = useQuery({
    queryKey: ['unknown-words', language],
    queryFn: async () => {
      return WordStorage.getAll(language);
    },
    staleTime: 30000,
  });

  const unknownWords = allWords.filter(w => !w.isKnown);
  const knownWords = allWords.filter(w => w.isKnown);
  const unknownWordSet = new Set(unknownWords.map(w => w.word.toLowerCase()));

  const markUnknownMutation = useMutation({
    mutationFn: async ({ 
      word, 
      wordLanguage, 
      reading, 
      definition 
    }: { 
      word: string; 
      wordLanguage: LanguageCode; 
      reading?: string; 
      definition?: string;
    }) => {
      const result = await WordStorage.markUnknown(wordLanguage, word, reading, definition);
      await StatsStorage.increment('totalUnknownWords');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-words'] });
    },
  });

  const markKnownMutation = useMutation({
    mutationFn: async ({ word, wordLanguage }: { word: string; wordLanguage: LanguageCode }) => {
      await WordStorage.markKnown(wordLanguage, word);
      await StatsStorage.increment('totalKnownWords');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-words'] });
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: async ({ word, wordLanguage }: { word: string; wordLanguage: LanguageCode }) => {
      await WordStorage.delete(wordLanguage, word);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-words'] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await WordStorage.clear();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unknown-words'] });
    },
  });

  const isWordUnknown = (word: string): boolean => {
    return unknownWordSet.has(word.toLowerCase());
  };

  const getWord = async (wordLanguage: LanguageCode, word: string): Promise<UnknownWord | undefined> => {
    return WordStorage.get(wordLanguage, word);
  };

  return {
    allWords,
    unknownWords,
    knownWords,
    unknownWordSet,
    isLoading,
    error,
    markUnknown: markUnknownMutation.mutate,
    markUnknownAsync: markUnknownMutation.mutateAsync,
    markKnown: markKnownMutation.mutate,
    markKnownAsync: markKnownMutation.mutateAsync,
    deleteWord: deleteWordMutation.mutate,
    clearAll: clearAllMutation.mutate,
    isWordUnknown,
    getWord,
    isUpdating: markUnknownMutation.isPending || markKnownMutation.isPending,
  };
}

/**
 * Hook to get word lookup functionality
 */
export function useWordLookup() {
  // This is a stub for future dictionary API integration
  // For now, it returns placeholder data

  const lookupWord = async (
    word: string,
    language: LanguageCode,
    mode: 'L-L' | 'L-E' = 'L-E'
  ): Promise<{
    word: string;
    reading?: string;
    definition: string;
    partOfSpeech?: string;
    examples?: string[];
  }> => {
    // Stub implementation
    // In a real app, this would call a dictionary API

    // For Japanese, provide some mock readings
    if (language === 'ja') {
      const mockReadings: Record<string, string> = {
        '今日': 'きょう',
        '天気': 'てんき',
        '食べ': 'たべ',
        '飲み': 'のみ',
        '電車': 'でんしゃ',
        '仕事': 'しごと',
        '勉強': 'べんきょう',
        '日本語': 'にほんご',
        '美味しい': 'おいしい',
        '楽しい': 'たのしい',
      };

      const mockDefinitions: Record<string, { en: string; ja: string }> = {
        '今日': { en: 'today', ja: '本日。この日。' },
        '天気': { en: 'weather', ja: '空模様。気象状態。' },
        '電車': { en: 'train', ja: '電気で動く鉄道車両。' },
        '仕事': { en: 'work, job', ja: '職業。労働。' },
        '勉強': { en: 'study', ja: '学問や技術を習得すること。' },
        '日本語': { en: 'Japanese language', ja: '日本の言語。' },
      };

      const reading = mockReadings[word];
      const definitions = mockDefinitions[word];
      const definition = definitions 
        ? (mode === 'L-E' ? definitions.en : definitions.ja)
        : (mode === 'L-E' ? `Definition of "${word}"` : `「${word}」の意味`);

      return {
        word,
        reading,
        definition,
      };
    }

    // For other languages
    return {
      word,
      definition: `Definition of "${word}"`,
    };
  };

  return {
    lookupWord,
  };
}
