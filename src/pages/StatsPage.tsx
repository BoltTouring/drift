/**
 * Stats Page
 * 
 * Personal statistics and learning progress.
 */

import { ArrowLeft, BarChart3, TrendingUp, Calendar, Target, BookOpen, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStats, useCalendarHeatmap } from '@/hooks/useDailyDrift';
import { PersonalizationStorage } from '@/lib/storage';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function StatsPage() {
  const { 
    stats, 
    history, 
    isLoading, 
    completedLast7, 
    completedLast30,
    consistencyLast7,
    consistencyLast30,
  } = useStats();

  const heatmapData = useCalendarHeatmap(30);

  const { data: profile } = useQuery({
    queryKey: ['personalization-profile'],
    queryFn: () => PersonalizationStorage.get(),
  });

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistics
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Streak */}
        <Card className="bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Current Streak
                </p>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Longest: {stats.longestStreak} days
                </p>
              </div>
              <div className="text-6xl">🔥</div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity
            </CardTitle>
            <CardDescription>
              Last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarHeatmap data={heatmapData} />
          </CardContent>
        </Card>

        {/* Consistency */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {consistencyLast7}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Last 7 days
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedLast7}/7 completed
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {consistencyLast30}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Last 30 days
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedLast30}/30 completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              All Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatItem
                icon={<Target className="h-5 w-5" />}
                label="Snippets Viewed"
                value={stats.totalSnippetsViewed}
              />
              <StatItem
                icon={<BookOpen className="h-5 w-5" />}
                label="Words Learned"
                value={stats.totalKnownWords}
              />
              <StatItem
                icon={<Star className="h-5 w-5 text-yellow-500" />}
                label="Unknown Words"
                value={stats.totalUnknownWords}
              />
              <StatItem
                icon={<Zap className="h-5 w-5 text-yellow-500" />}
                label="Sats Zapped"
                value={stats.totalZapAmount}
              />
            </div>
          </CardContent>
        </Card>

        {/* Taste Profile */}
        {profile && profile.topicWeights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Taste Profile</CardTitle>
              <CardDescription>
                Topics you engage with most
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Topics */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Favorite Topics</p>
                <div className="flex flex-wrap gap-2">
                  {profile.topicWeights
                    .filter(t => t.weight > 0)
                    .slice(0, 6)
                    .map(topic => (
                      <span
                        key={topic.topic}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        #{topic.topic}
                      </span>
                    ))}
                </div>
              </div>

              {/* Preferred Difficulty */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Difficulty Sweet Spot</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Easy</span>
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div
                        key={level}
                        className={cn(
                          "flex-1 h-3 rounded-full",
                          level >= profile.preferredDifficultyMin && 
                          level <= profile.preferredDifficultyMax
                            ? "bg-primary"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">Hard</span>
                </div>
              </div>

              {/* Preferred Length */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Preferred Length</p>
                <span className="inline-block px-3 py-1 bg-muted rounded-full text-sm capitalize">
                  {profile.preferredLength}
                </span>
              </div>

              {/* Dialect preferences */}
              {profile.dialectWeights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Dialect Preferences</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.dialectWeights
                      .filter(d => d.weight > 0)
                      .map(dialect => (
                        <span
                          key={dialect.dialect}
                          className="px-3 py-1 bg-muted rounded-full text-sm"
                        >
                          {dialect.dialect}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatItem({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="shrink-0 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-lg font-semibold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

interface CalendarHeatmapProps {
  data: { date: string; value: number; completed: boolean }[];
}

function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const weeks: { date: string; value: number; completed: boolean }[][] = [];
  let currentWeek: { date: string; value: number; completed: boolean }[] = [];

  // Group by weeks (Sunday start)
  data.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    if (index === 0) {
      // Pad the first week
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({ date: '', value: 0, completed: false });
      }
    }

    currentWeek.push(day);

    if (dayOfWeek === 6 || index === data.length - 1) {
      // Pad the last week
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', value: 0, completed: false });
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getIntensity = (value: number): string => {
    if (value === 0) return 'bg-muted';
    if (value < 5) return 'bg-green-200 dark:bg-green-900';
    if (value < 10) return 'bg-green-400 dark:bg-green-700';
    if (value < 15) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-2">
      {/* Day labels */}
      <div className="flex gap-1 ml-0">
        {dayLabels.map((label, i) => (
          <div key={i} className="w-4 h-4 text-[10px] text-muted-foreground text-center">
            {label}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-col gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  "w-4 h-4 rounded-sm transition-colors",
                  day.date ? getIntensity(day.value) : "bg-transparent",
                  day.completed && "ring-1 ring-primary ring-offset-1"
                )}
                title={day.date ? `${day.date}: ${day.value} snippets${day.completed ? ' ✓' : ''}` : ''}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mt-2">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-muted" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
        <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
        <span>More</span>
      </div>
    </div>
  );
}
