/**
 * Drift Swipe Feed
 * 
 * A TikTok-style vertical swipe feed for language learning snippets.
 * Supports smooth touch and mouse wheel gestures.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import type { Snippet } from '@/types/snippet';
import { SnippetCard } from './SnippetCard';

interface SwipeFeedProps {
  snippets: Snippet[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onLike: (snippet: Snippet) => void;
  onDislike: (snippet: Snippet) => void;
  onSave: (snippet: Snippet) => void;
  onZap: (snippet: Snippet) => void;
  onWordTap: (word: string, snippet: Snippet) => void;
  onMeaningReveal: (snippet: Snippet) => void;
  onSkip: (snippet: Snippet) => void;
  preferences: {
    furiganaMode: 'off' | 'on' | 'unknown-only';
    autoAdvance: boolean;
    targetLanguage: string;
    dictionaryMode: 'L-L' | 'L-E';
  };
  unknownWordSet: Set<string>;
  interactions: Map<string, { liked?: boolean; disliked?: boolean; saved?: boolean }>;
  isLoading?: boolean;
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.5;

export function SwipeFeed({
  snippets,
  currentIndex,
  onIndexChange,
  onLike,
  onDislike,
  onSave,
  onZap,
  onWordTap,
  onMeaningReveal,
  onSkip,
  preferences,
  unknownWordSet,
  interactions,
  isLoading,
}: SwipeFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startTimeRef = useRef<number>(0);

  const canGoNext = currentIndex < snippets.length - 1;
  const canGoPrev = currentIndex > 0;

  const goToNext = useCallback(() => {
    if (canGoNext && !isAnimating) {
      // Check if this was a fast swipe (skip)
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed < 1000 && startTimeRef.current > 0) {
        onSkip(snippets[currentIndex]);
      }
      setIsAnimating(true);
      onIndexChange(currentIndex + 1);
      startTimeRef.current = Date.now();
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [canGoNext, isAnimating, currentIndex, onIndexChange, onSkip, snippets]);

  const goToPrev = useCallback(() => {
    if (canGoPrev && !isAnimating) {
      setIsAnimating(true);
      onIndexChange(currentIndex - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [canGoPrev, isAnimating, currentIndex, onIndexChange]);

  // Touch/drag gestures
  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], last, cancel, active }) => {
      // Prevent drag if it looks like a word tap (very small movement)
      if (Math.abs(my) < 10 && !active) {
        return;
      }

      if (active) {
        setDragOffset(my);
      }

      if (last) {
        const shouldSwipe = 
          Math.abs(my) > SWIPE_THRESHOLD || 
          Math.abs(vy) > VELOCITY_THRESHOLD;

        if (shouldSwipe) {
          if (dy < 0 && canGoNext) {
            // Swiping up = next
            goToNext();
          } else if (dy > 0 && canGoPrev) {
            // Swiping down = prev
            goToPrev();
          }
        }

        // Reset offset
        setDragOffset(0);
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      rubberband: 0.2,
      bounds: { top: -200, bottom: 200 },
      preventDefault: true,
    }
  );

  // Mouse wheel support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout: ReturnType<typeof setTimeout>;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      accumulatedDelta += e.deltaY;

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (accumulatedDelta > SWIPE_THRESHOLD) {
          goToNext();
        } else if (accumulatedDelta < -SWIPE_THRESHOLD) {
          goToPrev();
        }
        accumulatedDelta = 0;
      }, 50);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [goToNext, goToPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        goToNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Track view time when index changes
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentIndex]);

  // Handle action with auto-advance
  const handleAction = useCallback((action: () => void) => {
    action();
    if (preferences.autoAdvance) {
      setTimeout(goToNext, 200);
    }
  }, [preferences.autoAdvance, goToNext]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">🌊</div>
        <h2 className="text-2xl font-bold mb-2">No snippets yet</h2>
        <p className="text-muted-foreground">
          We're loading fresh content for you. Check your connection or try again later.
        </p>
      </div>
    );
  }

  const currentSnippet = snippets[currentIndex];
  const interaction = interactions.get(currentSnippet?.id);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden touch-none select-none bg-background"
      {...bind()}
    >
      {/* Current card */}
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-300 ease-out",
          isAnimating && "transition-transform"
        )}
        style={{
          transform: `translateY(${dragOffset}px)`,
        }}
      >
        {currentSnippet && (
          <SnippetCard
            snippet={currentSnippet}
            isActive={true}
            furiganaMode={preferences.furiganaMode}
            unknownWordSet={unknownWordSet}
            interaction={interaction}
            onLike={() => handleAction(() => onLike(currentSnippet))}
            onDislike={() => handleAction(() => onDislike(currentSnippet))}
            onSave={() => onSave(currentSnippet)}
            onZap={() => onZap(currentSnippet)}
            onWordTap={(word) => onWordTap(word, currentSnippet)}
            onMeaningReveal={() => onMeaningReveal(currentSnippet)}
            dictionaryMode={preferences.dictionaryMode}
            targetLanguage={preferences.targetLanguage}
          />
        )}
      </div>

      {/* Progress indicator */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
        {snippets.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
          const actualIndex = Math.max(0, currentIndex - 2) + idx;
          return (
            <div
              key={actualIndex}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                actualIndex === currentIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              )}
            />
          );
        })}
      </div>

      {/* Swipe hint (shown on first card) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none animate-bounce">
          <div className="text-muted-foreground text-sm flex flex-col items-center">
            <svg
              className="w-6 h-6 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span>Swipe up for next</span>
          </div>
        </div>
      )}
    </div>
  );
}
