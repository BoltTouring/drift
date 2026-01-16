/**
 * Drift Snippet Hooks
 * 
 * Custom hooks for fetching, managing, and interacting with snippets.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCallback, useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

import type { Snippet, SnippetInteraction, UserPreferences } from '@/types/snippet';
import { 
  DRIFT_SNIPPET_KIND, 
  eventToSnippet, 
  validateDriftSnippetEvent 
} from '@/types/nostr';
import {
  SnippetStorage,
  InteractionStorage,
  PreferencesStorage,
  CacheStorage,
  StatsStorage,
  DailyDriftStorage,
} from '@/lib/storage';
import { rankSnippets, rebuildPersonalizationProfile } from '@/lib/personalization';
import { generateSnippets } from '@/lib/snippetGenerator';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook to fetch and manage snippets from Nostr and local storage
 */
export function useSnippets(preferences: UserPreferences) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['snippets', preferences.targetLanguage, preferences.maxSnippetLength],
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.timeout(5000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      try {
        // Fetch Drift snippets from Nostr
        const events = await nostr.query([
          {
            kinds: [DRIFT_SNIPPET_KIND],
            '#L': ['drift'],
            '#l': [preferences.targetLanguage],
            limit: 100,
          },
        ], { signal: combinedSignal });

        // Validate and convert to snippets
        const nostrSnippets = events
          .filter(validateDriftSnippetEvent)
          .map(eventToSnippet)
          .filter((s): s is Snippet => s !== null);

        // Filter by preferences
        let filtered = nostrSnippets;

        // Filter by length class
        const lengthOrder = ['word', 'phrase', 'sentence', 'paragraph'];
        const maxIndex = lengthOrder.indexOf(preferences.maxSnippetLength);
        filtered = filtered.filter(s => 
          lengthOrder.indexOf(s.lengthClass) <= maxIndex
        );

        // Filter sensitive content if needed
        if (preferences.hideSensitive) {
          filtered = filtered.filter(s => 
            !s.safetyFlags.sensitive && 
            !s.safetyFlags.profanity && 
            !s.safetyFlags.adult
          );
        }

        // If we have a dialect filter, boost those snippets
        if (preferences.dialectFilter) {
          filtered.sort((a, b) => {
            const aMatch = a.dialectTag === preferences.dialectFilter ? 1 : 0;
            const bMatch = b.dialectTag === preferences.dialectFilter ? 1 : 0;
            return bMatch - aMatch;
          });
        }

        // Cache snippets for offline use
        const toCache = filtered.slice(0, preferences.offlineCacheSize);
        await CacheStorage.cacheSnippets(toCache);

        // Save to local storage
        await SnippetStorage.bulkSave(filtered);

        // Rank snippets by personalization
        const ranked = await rankSnippets(filtered);

        return ranked;
      } catch (error) {
        console.warn('Failed to fetch from Nostr, using cache:', error);
        
        // Fall back to cached snippets
        const cached = await CacheStorage.getCachedSnippets();
        if (cached.length > 0) {
          return cached;
        }

        // Generate AI snippets as last resort
        const generated = await generateSnippets({
          language: preferences.targetLanguage,
          lengthClass: preferences.maxSnippetLength,
          dialect: preferences.dialectGeneration,
          allowSensitive: !preferences.hideSensitive,
        }, preferences.offlineCacheSize);

        await CacheStorage.cacheSnippets(generated);
        return generated;
      }
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch snippets from followed accounts
 */
export function useFollowedSnippets(preferences: UserPreferences) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['snippets-followed', user?.pubkey, preferences.targetLanguage],
    queryFn: async ({ signal }) => {
      if (!user) return [];

      const timeout = AbortSignal.timeout(5000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      try {
        // First get the user's follow list
        const followEvents = await nostr.query([
          {
            kinds: [3],
            authors: [user.pubkey],
            limit: 1,
          },
        ], { signal: combinedSignal });

        if (followEvents.length === 0) return [];

        const followedPubkeys = followEvents[0].tags
          .filter(([name]) => name === 'p')
          .map(([, pubkey]) => pubkey);

        if (followedPubkeys.length === 0) return [];

        // Fetch snippets from followed accounts
        const events = await nostr.query([
          {
            kinds: [DRIFT_SNIPPET_KIND],
            authors: followedPubkeys,
            '#L': ['drift'],
            limit: 50,
          },
        ], { signal: combinedSignal });

        const snippets = events
          .filter(validateDriftSnippetEvent)
          .map(eventToSnippet)
          .filter((s): s is Snippet => s !== null);

        return snippets;
      } catch (error) {
        console.warn('Failed to fetch followed snippets:', error);
        return [];
      }
    },
    enabled: !!user && preferences.prioritizeFollowed,
    staleTime: 60000,
  });
}

/**
 * Hook to manage snippet interactions
 */
export function useSnippetInteraction() {
  const queryClient = useQueryClient();

  const recordView = useCallback(async (snippetId: string) => {
    await InteractionStorage.update(snippetId, {
      viewedAt: Date.now(),
    });
    await StatsStorage.increment('totalSnippetsViewed');
    await DailyDriftStorage.updateSession({ 
      viewed: (await DailyDriftStorage.getToday())?.viewed ?? 0 + 1 
    });
  }, []);

  const updateDwellTime = useCallback(async (snippetId: string, dwellTime: number) => {
    await InteractionStorage.update(snippetId, { dwellTime });
  }, []);

  const recordLike = useCallback(async (snippetId: string) => {
    await InteractionStorage.update(snippetId, { liked: true, disliked: false });
    const session = await DailyDriftStorage.getToday();
    if (session) {
      await DailyDriftStorage.updateSession({ likes: session.likes + 1 });
    }
    // Rebuild personalization in background
    rebuildPersonalizationProfile().catch(console.error);
  }, []);

  const recordDislike = useCallback(async (snippetId: string) => {
    await InteractionStorage.update(snippetId, { disliked: true, liked: false });
    const session = await DailyDriftStorage.getToday();
    if (session) {
      await DailyDriftStorage.updateSession({ dislikes: session.dislikes + 1 });
    }
    rebuildPersonalizationProfile().catch(console.error);
  }, []);

  const recordSave = useCallback(async (snippetId: string, saved: boolean) => {
    await InteractionStorage.update(snippetId, { saved });
    const session = await DailyDriftStorage.getToday();
    if (session && saved) {
      await DailyDriftStorage.updateSession({ saves: session.saves + 1 });
    }
    queryClient.invalidateQueries({ queryKey: ['saved-snippets'] });
  }, [queryClient]);

  const recordMeaningReveal = useCallback(async (snippetId: string) => {
    await InteractionStorage.update(snippetId, { meaningRevealed: true });
  }, []);

  const recordWordTap = useCallback(async (snippetId: string, word: string) => {
    const existing = await InteractionStorage.get(snippetId);
    const wordsTapped = existing?.wordsTapped || [];
    if (!wordsTapped.includes(word)) {
      wordsTapped.push(word);
      await InteractionStorage.update(snippetId, { wordsTapped });
      const session = await DailyDriftStorage.getToday();
      if (session) {
        await DailyDriftStorage.updateSession({ wordTaps: session.wordTaps + 1 });
      }
    }
  }, []);

  const recordSkip = useCallback(async (snippetId: string) => {
    await InteractionStorage.update(snippetId, { wasSkip: true });
    rebuildPersonalizationProfile().catch(console.error);
  }, []);

  const recordZap = useCallback(async (snippetId: string, amount: number) => {
    const existing = await InteractionStorage.get(snippetId);
    const currentZapped = existing?.zappedAmount || 0;
    await InteractionStorage.update(snippetId, { zappedAmount: currentZapped + amount });
    await StatsStorage.increment('totalZapsSent');
    await StatsStorage.increment('totalZapAmount', amount);
    const session = await DailyDriftStorage.getToday();
    if (session) {
      await DailyDriftStorage.updateSession({ zapAmount: session.zapAmount + amount });
    }
  }, []);

  return {
    recordView,
    updateDwellTime,
    recordLike,
    recordDislike,
    recordSave,
    recordMeaningReveal,
    recordWordTap,
    recordSkip,
    recordZap,
  };
}

/**
 * Hook to get saved snippets
 */
export function useSavedSnippets() {
  return useQuery({
    queryKey: ['saved-snippets'],
    queryFn: async () => {
      return SnippetStorage.getSaved();
    },
    staleTime: 30000,
  });
}

/**
 * Hook to get a single snippet's interaction data
 */
export function useSnippetInteractionData(snippetId: string | undefined) {
  return useQuery({
    queryKey: ['interaction', snippetId],
    queryFn: async () => {
      if (!snippetId) return null;
      return InteractionStorage.get(snippetId);
    },
    enabled: !!snippetId,
    staleTime: 10000,
  });
}
