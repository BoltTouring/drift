/**
 * Unknown Words Page
 * 
 * Manage vocabulary - unknown and known words.
 */

import { useState } from 'react';
import { ArrowLeft, BookOpen, Search, Check, X, Trash2, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useUnknownWords } from '@/hooks/useUnknownWords';
import { usePreferences } from '@/hooks/usePreferences';
import { useToast } from '@/hooks/useToast';
import type { UnknownWord } from '@/types/snippet';
import { cn } from '@/lib/utils';

export default function WordsPage() {
  const { preferences } = usePreferences();
  const { 
    unknownWords, 
    knownWords, 
    markKnown, 
    markUnknown, 
    deleteWord,
    isUpdating 
  } = useUnknownWords(preferences?.targetLanguage);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('unknown');

  const isJapanese = preferences?.targetLanguage === 'ja';

  const filteredUnknown = unknownWords.filter(word => 
    word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.reading?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredKnown = knownWords.filter(word => 
    word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.reading?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarkKnown = (word: UnknownWord) => {
    markKnown({ word: word.word, wordLanguage: word.language });
    toast({ title: '✓ Marked as known', duration: 1000 });
  };

  const handleMarkUnknown = (word: UnknownWord) => {
    markUnknown({ 
      word: word.word, 
      wordLanguage: word.language, 
      reading: word.reading, 
      definition: word.definition 
    });
    toast({ title: '📚 Added back to study list', duration: 1000 });
  };

  const handleDelete = (word: UnknownWord) => {
    if (confirm(`Remove "${word.word}" from your word list?`)) {
      deleteWord({ word: word.word, wordLanguage: word.language });
      toast({ title: 'Word removed', duration: 1000 });
    }
  };

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = preferences?.targetLanguage === 'ja' ? 'ja-JP' : preferences?.targetLanguage || 'en';
      speechSynthesis.speak(utterance);
    }
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
            <BookOpen className="h-5 w-5" />
            Word Library
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{unknownWords.length}</div>
              <div className="text-sm text-muted-foreground">Learning</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold text-green-500">{knownWords.length}</div>
              <div className="text-sm text-muted-foreground">Known</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="unknown" className="flex-1">
              Learning ({filteredUnknown.length})
            </TabsTrigger>
            <TabsTrigger value="known" className="flex-1">
              Known ({filteredKnown.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unknown" className="space-y-2 mt-4">
            {filteredUnknown.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'No matching words found' 
                      : 'No words in your learning list yet. Tap words while reading to add them!'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredUnknown.map((word) => (
                <WordCard
                  key={`${word.language}:${word.word}`}
                  word={word}
                  isJapanese={isJapanese}
                  onMarkKnown={() => handleMarkKnown(word)}
                  onDelete={() => handleDelete(word)}
                  onSpeak={() => handleSpeak(word.word)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="known" className="space-y-2 mt-4">
            {filteredKnown.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Check className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'No matching words found' 
                      : 'Words you mark as known will appear here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredKnown.map((word) => (
                <WordCard
                  key={`${word.language}:${word.word}`}
                  word={word}
                  isJapanese={isJapanese}
                  isKnown
                  onMarkUnknown={() => handleMarkUnknown(word)}
                  onDelete={() => handleDelete(word)}
                  onSpeak={() => handleSpeak(word.word)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface WordCardProps {
  word: UnknownWord;
  isJapanese: boolean;
  isKnown?: boolean;
  onMarkKnown?: () => void;
  onMarkUnknown?: () => void;
  onDelete: () => void;
  onSpeak: () => void;
}

function WordCard({ 
  word, 
  isJapanese, 
  isKnown,
  onMarkKnown, 
  onMarkUnknown,
  onDelete, 
  onSpeak 
}: WordCardProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          {/* Word */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium",
                isJapanese ? "text-xl" : "text-lg"
              )}>
                {word.word}
              </span>
              {isJapanese && word.reading && (
                <span className="text-sm text-muted-foreground">
                  【{word.reading}】
                </span>
              )}
            </div>
            {word.definition && (
              <p className="text-sm text-muted-foreground truncate">
                {word.definition}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {word.encounterCount} views
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onSpeak}>
              <Volume2 className="h-4 w-4" />
            </Button>
            {isKnown ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onMarkUnknown}
                className="text-yellow-500"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onMarkKnown}
                className="text-green-500"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
