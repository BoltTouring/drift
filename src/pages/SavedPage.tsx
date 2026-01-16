/**
 * Saved Snippets Page
 * 
 * View and manage saved snippets.
 */

import { ArrowLeft, Star, Trash2, BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSavedSnippets, useSnippetInteraction } from '@/hooks/useSnippets';
import { usePreferences } from '@/hooks/usePreferences';
import { useToast } from '@/hooks/useToast';
import { WordLookupSheet } from '@/components/drift/WordLookupSheet';
import { JapaneseText } from '@/components/drift/JapaneseText';
import { useUnknownWords } from '@/hooks/useUnknownWords';
import type { Snippet } from '@/types/snippet';
import { cn } from '@/lib/utils';

export default function SavedPage() {
  const { data: savedSnippets = [], isLoading } = useSavedSnippets();
  const { preferences } = usePreferences();
  const { recordSave } = useSnippetInteraction();
  const { toast } = useToast();
  const { unknownWordSet } = useUnknownWords(preferences?.targetLanguage);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const handleRemove = async (snippet: Snippet) => {
    await recordSave(snippet.id, false);
    toast({ title: 'Removed from saved', duration: 1000 });
  };

  const handleWordTap = (word: string) => {
    setSelectedWord(word);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Saved Snippets
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          </div>
        ) : savedSnippets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No saved snippets yet</h2>
              <p className="text-muted-foreground mb-4">
                Tap the star icon on any snippet to save it for later review.
              </p>
              <Button asChild>
                <Link to="/feed">
                  Start Learning
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {savedSnippets.length} saved snippet{savedSnippets.length !== 1 ? 's' : ''}
            </p>

            {savedSnippets.map((snippet) => (
              <SavedSnippetCard
                key={snippet.id}
                snippet={snippet}
                preferences={preferences}
                unknownWordSet={unknownWordSet}
                onRemove={() => handleRemove(snippet)}
                onWordTap={handleWordTap}
              />
            ))}
          </div>
        )}
      </div>

      {/* Word lookup sheet */}
      <WordLookupSheet
        word={selectedWord}
        language={preferences?.targetLanguage || 'ja'}
        dictionaryMode={preferences?.dictionaryMode || 'L-E'}
        onClose={() => setSelectedWord(null)}
      />
    </div>
  );
}

interface SavedSnippetCardProps {
  snippet: Snippet;
  preferences: ReturnType<typeof usePreferences>['preferences'];
  unknownWordSet: Set<string>;
  onRemove: () => void;
  onWordTap: (word: string) => void;
}

function SavedSnippetCard({ 
  snippet, 
  preferences,
  unknownWordSet,
  onRemove, 
  onWordTap 
}: SavedSnippetCardProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const isJapanese = snippet.language === 'ja';

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Text */}
          <div className={cn(
            "text-lg",
            isJapanese && "text-xl"
          )}>
            {isJapanese ? (
              <JapaneseText
                text={snippet.text}
                showFurigana={preferences?.furiganaMode === 'on'}
                furiganaMode={preferences?.furiganaMode || 'off'}
                unknownWordSet={unknownWordSet}
                onWordTap={onWordTap}
              />
            ) : (
              <span>{snippet.text}</span>
            )}
          </div>

          {/* Translation toggle */}
          {snippet.translation && (
            <div className={cn(
              "overflow-hidden transition-all",
              showTranslation ? "max-h-20" : "max-h-0"
            )}>
              <p className="text-muted-foreground pt-2 border-t">
                {snippet.translation}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {snippet.translation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranslation(!showTranslation)}
                >
                  {showTranslation ? 'Hide' : 'Show'} translation
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Tags */}
              <div className="flex gap-1 mr-2">
                {snippet.topicTags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded">
                    #{tag}
                  </span>
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
