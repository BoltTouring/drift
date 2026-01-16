/**
 * Daily Drift Mode Page
 * 
 * Start and manage daily practice sessions.
 */

import { useNavigate } from 'react-router-dom';
import { Target, Play, Trophy, Zap, Star, BookOpen, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferences } from '@/hooks/usePreferences';
import { useDailyDrift } from '@/hooks/useDailyDrift';
import { DailyDriftProgress } from '@/components/drift/DailyDriftProgress';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function DailyDrift() {
  const navigate = useNavigate();
  const { preferences } = usePreferences();
  const { 
    session, 
    isActive, 
    isCompleted, 
    startSession, 
    isStarting,
  } = useDailyDrift();

  const handleStart = async () => {
    await startSession();
    navigate('/feed');
  };

  const handleContinue = () => {
    navigate('/feed');
  };

  // Show completion summary
  if (isCompleted && session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Daily Drift</h1>
        </header>

        <div className="max-w-md mx-auto space-y-6">
          {/* Celebration */}
          <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-bounce">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">🎉 Great Job!</h2>
            <p className="text-muted-foreground">
              You completed your Daily Drift for today!
            </p>
          </div>

          {/* Summary stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={<Target className="h-5 w-5" />}
                  label="Snippets"
                  value={session.viewed}
                />
                <StatCard
                  icon={<span className="text-lg">👍</span>}
                  label="Likes"
                  value={session.likes}
                />
                <StatCard
                  icon={<Star className="h-5 w-5 text-yellow-500" />}
                  label="Saved"
                  value={session.saves}
                />
                <StatCard
                  icon={<BookOpen className="h-5 w-5" />}
                  label="Word Taps"
                  value={session.wordTaps}
                />
                {session.zapAmount > 0 && (
                  <StatCard
                    icon={<Zap className="h-5 w-5 text-yellow-500" />}
                    label="Zapped"
                    value={`${session.zapAmount} sats`}
                    fullWidth
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" size="lg" asChild>
              <Link to="/feed">
                <Play className="h-5 w-5 mr-2" />
                Keep Learning
              </Link>
            </Button>
            <Button variant="outline" className="w-full" size="lg" asChild>
              <Link to="/stats">
                View Stats
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show active session status
  if (isActive && session) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Daily Drift</h1>
        </header>

        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Session in Progress
              </CardTitle>
              <CardDescription>
                Keep going! You're doing great.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DailyDriftProgress
                viewed={session.viewed}
                target={session.target}
              />

              <div className="grid grid-cols-3 gap-3 pt-4">
                <MiniStat label="Likes" value={session.likes} emoji="👍" />
                <MiniStat label="Saved" value={session.saves} emoji="⭐" />
                <MiniStat label="Words" value={session.wordTaps} emoji="📚" />
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleContinue}
          >
            <Play className="h-5 w-5 mr-2" />
            Continue Learning
          </Button>
        </div>
      </div>
    );
  }

  // Start new session
  return (
    <div className="min-h-screen bg-background p-4">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/feed">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Daily Drift</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <Target className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ready to Drift?</h2>
          <p className="text-muted-foreground">
            Complete your daily practice to build consistency.
          </p>
        </div>

        {/* Target info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {preferences?.dailyDriftTarget || 10}
              </div>
              <p className="text-muted-foreground">snippets to complete</p>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Tips for today:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                Tap any word to see its meaning
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                Like content you want to see more of
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                Save snippets for later review
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-500" />
                Wait for the meaning button before peeking!
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Start button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? (
            'Starting...'
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Start Daily Drift
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  fullWidth 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-muted/50",
      fullWidth && "col-span-2"
    )}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <div className="text-lg mb-1">{emoji}</div>
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
