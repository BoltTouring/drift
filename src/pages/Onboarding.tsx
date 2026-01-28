/**
 * Onboarding Page
 * 
 * First-launch experience to seed user preferences.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePreferences } from '@/hooks/usePreferences';
import { cn } from '@/lib/utils';

const CONTENT_OPTIONS = [
  { 
    id: 'daily-life', 
    label: 'Daily Life', 
    emoji: '🏠',
    description: 'Everyday conversations and situations',
    topics: ['daily-life', 'casual', 'conversation'],
  },
  { 
    id: 'casual', 
    label: 'Casual Conversation', 
    emoji: '💬',
    description: 'Friendly, informal chat',
    topics: ['casual', 'conversation', 'friends'],
  },
  { 
    id: 'formal', 
    label: 'Formal', 
    emoji: '👔',
    description: 'Business and polite language',
    topics: ['formal', 'business', 'work'],
  },
  { 
    id: 'slang', 
    label: 'Slang & Internet', 
    emoji: '🔥',
    description: 'Modern slang and online expressions',
    topics: ['slang', 'internet', 'youth'],
  },
  { 
    id: 'dialect', 
    label: 'Dialect-focused', 
    emoji: '🗾',
    description: 'Regional dialects and expressions',
    topics: ['dialect', 'regional', 'culture'],
  },
  { 
    id: 'mixed', 
    label: 'Mixed', 
    emoji: '🎲',
    description: 'A bit of everything',
    topics: ['daily-life', 'casual', 'formal', 'slang'],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updatePreferences } = usePreferences();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedOption) return;

    setIsSubmitting(true);

    // Find the selected option
    const option = CONTENT_OPTIONS.find(o => o.id === selectedOption);
    
    if (option) {
      // Update preferences based on selection
      // For now, just mark onboarding as complete
      // In a full implementation, this would seed topic weights
      localStorage.setItem('drift:onboarded', 'true');
    }

    setIsSubmitting(false);
    navigate('/feed');
  };

  const handleSkip = () => {
    localStorage.setItem('drift:onboarded', 'true');
    navigate('/feed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🌊</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Welcome to Drift
          </h1>
          <p className="text-muted-foreground mt-2">
            Language immersion, TikTok style
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              What kind of content do you want right now?
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose one to get started. You can always change this later.
            </p>
          </div>

          <div className="grid gap-3">
            {CONTENT_OPTIONS.map((option) => (
              <Card
                key={option.id}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedOption === option.id
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => setSelectedOption(option.id)}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <span className="text-3xl">{option.emoji}</span>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {selectedOption === option.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3 pt-4">
            <Button
              className="w-full"
              size="lg"
              onClick={handleContinue}
              disabled={!selectedOption || isSubmitting}
            >
              {isSubmitting ? 'Getting started...' : 'Let\'s Go!'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        <p>Japanese-first, but works for any language</p>
      </footer>
    </div>
  );
}
