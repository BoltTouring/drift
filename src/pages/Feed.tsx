/**
 * Drift Feed Page
 * 
 * The main TikTok-style vertical swipe feed for language learning.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Settings, BookOpen, BarChart3, Star, Menu, Play, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { usePreferences } from '@/hooks/usePreferences';
import { useSnippets, useSnippetInteraction, useFollowedSnippets } from '@/hooks/useSnippets';
import { useUnknownWords } from '@/hooks/useUnknownWords';
import { useDailyDrift } from '@/hooks/useDailyDrift';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SwipeFeed } from '@/components/drift/SwipeFeed';
import { WordLookupSheet } from '@/components/drift/WordLookupSheet';
import { ZapSplitDialog } from '@/components/drift/ZapSplitDialog';
import { DailyDriftProgress } from '@/components/drift/DailyDriftProgress';
import type { Snippet } from '@/types/snippet';
import { DEFAULT_PREFERENCES } from '@/types/snippet';
import { cn } from '@/lib/utils';

export default function Feed() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, isLoading: prefsLoading } = usePreferences();
  const { user } = useCurrentUser();

  // Use defaults while loading
  const prefs = preferences || DEFAULT_PREFERENCES;

  // Fetch snippets
  const { data: snippets = [], isLoading: snippetsLoading, error } = useSnippets(prefs);
  const { data: followedSnippets = [] } = useFollowedSnippets(prefs);

  // Combine and deduplicate snippets, prioritizing followed if enabled
  const allSnippets = useMemo(() => {
    if (prefs.prioritizeFollowed && followedSnippets.length > 0) {
      const followedIds = new Set(followedSnippets.map(s => s.id));
      const otherSnippets = snippets.filter(s => !followedIds.has(s.id));
      return [...followedSnippets, ...otherSnippets];
    }
    return snippets;
  }, [snippets, followedSnippets, prefs.prioritizeFollowed]);

  // Current feed state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [zapSnippet, setZapSnippet] = useState<Snippet | null>(null);
  const [interactions, setInteractions] = useState<Map<string, { liked?: boolean; disliked?: boolean; saved?: boolean }>>(
    new Map()
  );

  // Dwell time tracking
  const dwellStartRef = useRef<number>(Date.now());
  const currentSnippetIdRef = useRef<string | null>(null);

  // Hooks
  const { unknownWordSet } = useUnknownWords(prefs.targetLanguage);
  const {
    recordView,
    updateDwellTime,
    recordLike,
    recordDislike,
    recordSave,
    recordMeaningReveal,
    recordWordTap,
    recordSkip,
    recordZap,
  } = useSnippetInteraction();
  const { session, isActive, updateSession } = useDailyDrift();

  // Track dwell time when snippet changes
  useEffect(() => {
    const currentSnippet = allSnippets[currentIndex];
    if (!currentSnippet) return;

    // Record dwell time for previous snippet
    if (currentSnippetIdRef.current && currentSnippetIdRef.current !== currentSnippet.id) {
      const dwellTime = Date.now() - dwellStartRef.current;
      updateDwellTime(currentSnippetIdRef.current, dwellTime);
    }

    // Start tracking new snippet
    currentSnippetIdRef.current = currentSnippet.id;
    dwellStartRef.current = Date.now();
    recordView(currentSnippet.id);

    // Update daily drift session
    if (isActive) {
      updateSession({ viewed: (session?.viewed ?? 0) + 1 });
    }
  }, [currentIndex, allSnippets, recordView, updateDwellTime, isActive, session, updateSession]);

  // Handlers
  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const handleLike = useCallback((snippet: Snippet) => {
    recordLike(snippet.id);
    setInteractions(prev => new Map(prev).set(snippet.id, { ...prev.get(snippet.id), liked: true, disliked: false }));
    toast({ title: '👍 Liked!', duration: 1000 });
  }, [recordLike, toast]);

  const handleDislike = useCallback((snippet: Snippet) => {
    recordDislike(snippet.id);
    setInteractions(prev => new Map(prev).set(snippet.id, { ...prev.get(snippet.id), disliked: true, liked: false }));
    toast({ title: '👎 Disliked', duration: 1000 });
  }, [recordDislike, toast]);

  const handleSave = useCallback((snippet: Snippet) => {
    const current = interactions.get(snippet.id);
    const newSaved = !current?.saved;
    recordSave(snippet.id, newSaved);
    setInteractions(prev => new Map(prev).set(snippet.id, { ...prev.get(snippet.id), saved: newSaved }));
    toast({ title: newSaved ? '⭐ Saved!' : 'Removed from saved', duration: 1000 });
  }, [interactions, recordSave, toast]);

  const handleZap = useCallback((snippet: Snippet) => {
    if (!user) {
      toast({ 
        title: 'Login required', 
        description: 'You need to be logged in to send zaps.',
        variant: 'destructive',
      });
      return;
    }
    setZapSnippet(snippet);
  }, [user, toast]);

  const handleZapComplete = useCallback((amount: number) => {
    if (zapSnippet) {
      recordZap(zapSnippet.id, amount);
    }
    setZapSnippet(null);
  }, [zapSnippet, recordZap]);

  const handleWordTap = useCallback((word: string, snippet: Snippet) => {
    setSelectedWord(word);
    recordWordTap(snippet.id, word);
  }, [recordWordTap]);

  const handleMeaningReveal = useCallback((snippet: Snippet) => {
    recordMeaningReveal(snippet.id);
  }, [recordMeaningReveal]);

  const handleSkip = useCallback((snippet: Snippet) => {
    recordSkip(snippet.id);
  }, [recordSkip]);

  const isLoading = prefsLoading || snippetsLoading;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm z-20">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌊</span>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Drift
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Daily Drift indicator */}
          {isActive && session && (
            <DailyDriftProgress
              viewed={session.viewed}
              target={session.target}
              compact
            />
          )}

          <Button variant="ghost" size="icon" asChild>
            <Link to="/saved">
              <Star className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/words">
              <BookOpen className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/stats">
              <BarChart3 className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Feed */}
      <main className="flex-1 overflow-hidden">
        <SwipeFeed
          snippets={allSnippets}
          currentIndex={currentIndex}
          onIndexChange={handleIndexChange}
          onLike={handleLike}
          onDislike={handleDislike}
          onSave={handleSave}
          onZap={handleZap}
          onWordTap={handleWordTap}
          onMeaningReveal={handleMeaningReveal}
          onSkip={handleSkip}
          preferences={{
            furiganaMode: prefs.furiganaMode,
            autoAdvance: prefs.autoAdvance,
            targetLanguage: prefs.targetLanguage,
            dictionaryMode: prefs.dictionaryMode,
          }}
          unknownWordSet={unknownWordSet}
          interactions={interactions}
          isLoading={isLoading}
        />
      </main>

      {/* Daily Drift start button (when not active) */}
      {!isActive && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <Button
            size="lg"
            className="gap-2 rounded-full shadow-lg px-6"
            onClick={() => navigate('/daily-drift')}
          >
            <Target className="h-5 w-5" />
            Start Daily Drift
          </Button>
        </div>
      )}

      {/* Word lookup sheet */}
      <WordLookupSheet
        word={selectedWord}
        language={prefs.targetLanguage}
        dictionaryMode={prefs.dictionaryMode}
        onClose={() => setSelectedWord(null)}
      />

      {/* Zap split dialog */}
      <ZapSplitDialog
        snippet={zapSnippet}
        open={!!zapSnippet}
        onOpenChange={(open) => !open && setZapSnippet(null)}
        onZapComplete={handleZapComplete}
      />
    </div>
  );
}
