/**
 * Word Lookup Bottom Sheet
 * 
 * Shows word definition, reading, and quick actions when a word is tapped.
 */

import { useState, useEffect } from 'react';
import { Check, X, Volume2, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useWordLookup, useUnknownWords } from '@/hooks/useUnknownWords';
import type { LanguageCode } from '@/types/snippet';
import { containsKanji } from '@/lib/japanese';

interface WordLookupSheetProps {
  word: string | null;
  language: LanguageCode;
  dictionaryMode: 'L-L' | 'L-E';
  onClose: () => void;
}

export function WordLookupSheet({
  word,
  language,
  dictionaryMode,
  onClose,
}: WordLookupSheetProps) {
  const [lookupResult, setLookupResult] = useState<{
    word: string;
    reading?: string;
    definition: string;
    partOfSpeech?: string;
    examples?: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { lookupWord } = useWordLookup();
  const { markUnknown, markKnown, isWordUnknown, isUpdating } = useUnknownWords(language);

  const isUnknown = word ? isWordUnknown(word) : false;
  const isJapanese = language === 'ja';
  const hasKanji = word ? containsKanji(word) : false;

  // Look up word when it changes
  useEffect(() => {
    if (word) {
      setIsLoading(true);
      lookupWord(word, language, dictionaryMode)
        .then((result) => {
          setLookupResult(result);
        })
        .catch((error) => {
          console.error('Word lookup failed:', error);
          setLookupResult({
            word,
            definition: 'Definition not available',
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setLookupResult(null);
    }
  }, [word, language, dictionaryMode, lookupWord]);

  const handleMarkUnknown = () => {
    if (word) {
      markUnknown({
        word,
        wordLanguage: language,
        reading: lookupResult?.reading,
        definition: lookupResult?.definition,
      });
    }
  };

  const handleMarkKnown = () => {
    if (word) {
      markKnown({ word, wordLanguage: language });
    }
  };

  const handleSpeak = () => {
    if (word && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = language === 'ja' ? 'ja-JP' : language;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <Sheet open={!!word} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-3">
            <span className={cn(
              isJapanese ? "text-3xl" : "text-2xl",
              "font-bold"
            )}>
              {word}
            </span>
            {isJapanese && hasKanji && lookupResult?.reading && (
              <span className="text-lg text-muted-foreground">
                【{lookupResult.reading}】
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSpeak}
              className="ml-auto"
              aria-label="Pronounce"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </SheetTitle>
          <SheetDescription>
            {dictionaryMode === 'L-E' ? 'Definition' : 
              isJapanese ? '意味' : 'Definition'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Definition */}
          <div className="min-h-[60px]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Looking up...</span>
              </div>
            ) : lookupResult ? (
              <div className="space-y-2">
                {lookupResult.partOfSpeech && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {lookupResult.partOfSpeech}
                  </span>
                )}
                <p className="text-lg">{lookupResult.definition}</p>
                {lookupResult.examples && lookupResult.examples.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">Examples:</p>
                    {lookupResult.examples.map((example, i) => (
                      <p key={i} className="text-sm italic">"{example}"</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No definition available</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant={isUnknown ? "outline" : "default"}
              className="flex-1 gap-2"
              onClick={handleMarkUnknown}
              disabled={isUpdating || isUnknown}
            >
              <BookOpen className="h-4 w-4" />
              {isUnknown ? 'Marked Unknown' : 'Mark Unknown'}
            </Button>
            <Button
              variant={!isUnknown ? "outline" : "default"}
              className="flex-1 gap-2"
              onClick={handleMarkKnown}
              disabled={isUpdating || !isUnknown}
            >
              <Check className="h-4 w-4" />
              Mark Known
            </Button>
          </div>

          {/* Status indicator */}
          <div className="text-center">
            <span className={cn(
              "text-sm px-3 py-1 rounded-full",
              isUnknown 
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" 
                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            )}>
              {isUnknown ? '📚 In your study list' : '✓ Known word'}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
