/**
 * Drift Settings Page
 * 
 * Manage all app preferences.
 */

import { ArrowLeft, Languages, BookOpen, Type, MessageSquare, Shield, Users, Target, Zap, HardDrive, RotateCcw, LogIn, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { usePreferences, AVAILABLE_LANGUAGES, JAPANESE_DIALECTS, LENGTH_CLASSES, FURIGANA_MODES, DAILY_TARGETS, CACHE_SIZES } from '@/hooks/usePreferences';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { clearAllData } from '@/lib/storage';
import { LoginArea } from '@/components/auth/LoginArea';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { preferences, updatePreferences, resetPreferences, isUpdating } = usePreferences();
  const { user } = useCurrentUser();

  const isJapanese = preferences?.targetLanguage === 'ja';

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      resetPreferences();
      toast({ title: 'Settings reset', description: 'All preferences restored to defaults.' });
    }
  };

  const handleClearData = async () => {
    if (confirm('This will delete all your local data including saved snippets, word lists, and statistics. Are you sure?')) {
      await clearAllData();
      toast({ title: 'Data cleared', description: 'All local data has been deleted.' });
      navigate('/');
    }
  };

  if (!preferences) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Login with Nostr to sync and publish content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginArea className="w-full" />
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Language
            </CardTitle>
            <CardDescription>
              Choose your target language for learning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Language</Label>
              <Select
                value={preferences.targetLanguage}
                onValueChange={(value) => updatePreferences({ targetLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dictionary Mode</Label>
              <RadioGroup
                value={preferences.dictionaryMode}
                onValueChange={(value: 'L-L' | 'L-E') => updatePreferences({ dictionaryMode: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="L-E" id="dict-le" />
                  <Label htmlFor="dict-le">
                    {isJapanese ? 'J-E (Japanese → English)' : 'L-E (Bilingual)'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="L-L" id="dict-ll" />
                  <Label htmlFor="dict-ll">
                    {isJapanese ? 'J-J (Japanese only)' : 'L-L (Monolingual)'}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Japanese-specific settings */}
        {isJapanese && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Japanese Settings
              </CardTitle>
              <CardDescription>
                Furigana and dialect preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Furigana Display</Label>
                <RadioGroup
                  value={preferences.furiganaMode}
                  onValueChange={(value: 'off' | 'on' | 'unknown-only') => 
                    updatePreferences({ furiganaMode: value })
                  }
                  className="space-y-2"
                >
                  {FURIGANA_MODES.map((mode) => (
                    <div key={mode.code} className="flex items-center space-x-2">
                      <RadioGroupItem value={mode.code} id={`furigana-${mode.code}`} />
                      <Label htmlFor={`furigana-${mode.code}`} className="flex-1">
                        <span className="font-medium">{mode.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {mode.description}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Dialect Filter</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Prefer content in this dialect
                </p>
                <Select
                  value={preferences.dialectFilter || '標準語'}
                  onValueChange={(value) => updatePreferences({ dialectFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JAPANESE_DIALECTS.map((dialect) => (
                      <SelectItem key={dialect.code} value={dialect.code}>
                        {dialect.nativeName} ({dialect.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dialect for AI Generation</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Generate AI snippets in this dialect
                </p>
                <Select
                  value={preferences.dialectGeneration || '標準語'}
                  onValueChange={(value) => updatePreferences({ dialectGeneration: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JAPANESE_DIALECTS.map((dialect) => (
                      <SelectItem key={dialect.code} value={dialect.code}>
                        {dialect.nativeName} ({dialect.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Content
            </CardTitle>
            <CardDescription>
              Control what kind of content you see
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max Snippet Length</Label>
              <RadioGroup
                value={preferences.maxSnippetLength}
                onValueChange={(value: 'word' | 'phrase' | 'sentence' | 'paragraph') => 
                  updatePreferences({ maxSnippetLength: value })
                }
                className="space-y-2"
              >
                {LENGTH_CLASSES.map((length) => (
                  <div key={length.code} className="flex items-center space-x-2">
                    <RadioGroupItem value={length.code} id={`length-${length.code}`} />
                    <Label htmlFor={`length-${length.code}`} className="flex-1">
                      <span className="font-medium">{length.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {length.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety
            </CardTitle>
            <CardDescription>
              Content filtering options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Hide Sensitive Content</Label>
                <p className="text-sm text-muted-foreground">
                  Filter out content marked as sensitive, profanity, or adult
                </p>
              </div>
              <Switch
                checked={preferences.hideSensitive}
                onCheckedChange={(checked) => updatePreferences({ hideSensitive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Feed
            </CardTitle>
            <CardDescription>
              Personalization options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Prioritize Followed Accounts</Label>
                <p className="text-sm text-muted-foreground">
                  Show content from people you follow first
                </p>
              </div>
              <Switch
                checked={preferences.prioritizeFollowed}
                onCheckedChange={(checked) => updatePreferences({ prioritizeFollowed: checked })}
                disabled={!user}
              />
            </div>

            {user && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Publish Reactions to Nostr</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your likes/dislikes publicly (default: private)
                  </p>
                </div>
                <Switch
                  checked={preferences.publishReactions}
                  onCheckedChange={(checked) => updatePreferences({ publishReactions: checked })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Drift */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Drift
            </CardTitle>
            <CardDescription>
              Your daily practice goal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Daily Target</Label>
              <RadioGroup
                value={String(preferences.dailyDriftTarget)}
                onValueChange={(value) => 
                  updatePreferences({ dailyDriftTarget: parseInt(value) as 5 | 10 | 15 })
                }
                className="space-y-2"
              >
                {DAILY_TARGETS.map((target) => (
                  <div key={target.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(target.value)} id={`target-${target.value}`} />
                    <Label htmlFor={`target-${target.value}`} className="flex-1">
                      <span className="font-medium">{target.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {target.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-advance after Like/Dislike</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically go to next snippet after rating
                </p>
              </div>
              <Switch
                checked={preferences.autoAdvance}
                onCheckedChange={(checked) => updatePreferences({ autoAdvance: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>
              Offline caching options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Offline Cache Size</Label>
              <RadioGroup
                value={String(preferences.offlineCacheSize)}
                onValueChange={(value) => 
                  updatePreferences({ offlineCacheSize: parseInt(value) as 50 | 100 })
                }
                className="flex gap-4"
              >
                {CACHE_SIZES.map((size) => (
                  <div key={size.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={String(size.value)} id={`cache-${size.value}`} />
                    <Label htmlFor={`cache-${size.value}`}>{size.name}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="h-5 w-5" />
              Reset
            </CardTitle>
            <CardDescription>
              Danger zone - these actions cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleReset}
            >
              Reset Settings to Default
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleClearData}
            >
              Clear All Local Data
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Drift — Language Immersion Feed</p>
          <p className="mt-1">
            <a 
              href="https://shakespeare.diy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Vibed with Shakespeare
            </a>
            {' • '}
            <a 
              href="https://soapbox.pub/mkstack" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Vibed with MKStack
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
