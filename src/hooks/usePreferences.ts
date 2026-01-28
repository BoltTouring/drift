/**
 * Drift User Preferences Hook
 * 
 * Manages user preferences stored locally in IndexedDB.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PreferencesStorage } from '@/lib/storage';
import type { UserPreferences } from '@/types/snippet';

/**
 * Hook to get and update user preferences
 */
export function usePreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      return PreferencesStorage.get();
    },
    staleTime: Infinity, // Preferences don't change unless we update them
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      return PreferencesStorage.update(updates);
    },
    onSuccess: (newPrefs) => {
      queryClient.setQueryData(['preferences'], newPrefs);
      // Invalidate snippets query when preferences change
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return PreferencesStorage.reset();
    },
    onSuccess: (newPrefs) => {
      queryClient.setQueryData(['preferences'], newPrefs);
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });

  return {
    preferences: preferences!,
    isLoading,
    error,
    updatePreferences: updateMutation.mutate,
    updatePreferencesAsync: updateMutation.mutateAsync,
    resetPreferences: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

/**
 * Available languages for the app
 */
export const AVAILABLE_LANGUAGES = [
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
] as const;

/**
 * Japanese dialect options
 */
export const JAPANESE_DIALECTS = [
  { code: '標準語', name: 'Standard', nativeName: '標準語' },
  { code: '関西弁', name: 'Kansai', nativeName: '関西弁' },
  { code: '博多弁', name: 'Hakata', nativeName: '博多弁' },
  { code: 'custom', name: 'Custom', nativeName: 'カスタム' },
] as const;

/**
 * Length class options
 */
export const LENGTH_CLASSES = [
  { code: 'word', name: '1 word', description: 'Single vocabulary words' },
  { code: 'phrase', name: '1 phrase', description: 'Short expressions' },
  { code: 'sentence', name: '1 sentence', description: 'Complete sentences' },
  { code: 'paragraph', name: '2-3 sentences', description: 'Short paragraphs' },
] as const;

/**
 * Furigana mode options
 */
export const FURIGANA_MODES = [
  { code: 'off', name: 'Off', description: 'No furigana' },
  { code: 'on', name: 'On', description: 'Show furigana on all kanji' },
  { code: 'unknown-only', name: 'Unknown only', description: 'Show furigana only on unknown words' },
] as const;

/**
 * Daily drift target options
 */
export const DAILY_TARGETS = [
  { value: 5, name: '5 snippets', description: 'Quick daily practice' },
  { value: 10, name: '10 snippets', description: 'Standard practice' },
  { value: 15, name: '15 snippets', description: 'Intensive practice' },
] as const;

/**
 * Offline cache size options
 */
export const CACHE_SIZES = [
  { value: 50, name: '50 snippets', description: 'Light cache' },
  { value: 100, name: '100 snippets', description: 'Standard cache' },
] as const;
