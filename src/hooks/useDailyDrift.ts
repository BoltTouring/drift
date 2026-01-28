/**
 * Drift Daily Drift Session Hook
 * 
 * Manages the daily practice session state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DailyDriftStorage, StatsStorage } from '@/lib/storage';
import type { DailyDriftSession, UserStats } from '@/types/snippet';
import { usePreferences } from './usePreferences';

/**
 * Hook to manage daily drift session
 */
export function useDailyDrift() {
  const queryClient = useQueryClient();
  const { preferences } = usePreferences();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['daily-drift'],
    queryFn: async () => {
      return DailyDriftStorage.getToday();
    },
    staleTime: 10000,
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const target = preferences?.dailyDriftTarget || 10;
      return DailyDriftStorage.startSession(target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-drift'] });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<DailyDriftSession>) => {
      return DailyDriftStorage.updateSession(updates);
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData(['daily-drift'], newSession);
      
      // Update stats if session was just completed
      if (newSession?.completed && !session?.completed) {
        updateStatsOnCompletion(newSession);
      }
    },
  });

  const isActive = !!session?.startedAt && !session?.completed;
  const isCompleted = !!session?.completed;
  const progress = session ? session.viewed / session.target : 0;
  const remaining = session ? Math.max(0, session.target - session.viewed) : 0;

  return {
    session,
    isLoading,
    error,
    isActive,
    isCompleted,
    progress,
    remaining,
    startSession: startSessionMutation.mutate,
    startSessionAsync: startSessionMutation.mutateAsync,
    updateSession: updateSessionMutation.mutate,
    isStarting: startSessionMutation.isPending,
  };
}

/**
 * Update stats when a daily drift session is completed
 */
async function updateStatsOnCompletion(session: DailyDriftSession): Promise<void> {
  try {
    const stats = await StatsStorage.get();
    
    // Add session to history
    const existingIndex = stats.dailySessions.findIndex(s => s.date === session.date);
    if (existingIndex >= 0) {
      stats.dailySessions[existingIndex] = session;
    } else {
      stats.dailySessions.unshift(session);
    }
    
    // Keep only last 90 days
    stats.dailySessions = stats.dailySessions.slice(0, 90);
    
    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // Check if yesterday was completed
    const yesterdaySession = stats.dailySessions.find(s => s.date === yesterday);
    
    if (yesterdaySession?.completed) {
      stats.currentStreak += 1;
    } else if (session.date === today) {
      stats.currentStreak = 1;
    }
    
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
    
    await StatsStorage.save(stats);
  } catch (error) {
    console.error('Failed to update stats on completion:', error);
  }
}

/**
 * Hook to get user stats
 */
export function useStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      return StatsStorage.get();
    },
    staleTime: 30000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['daily-history'],
    queryFn: async () => {
      return DailyDriftStorage.getHistory(30);
    },
    staleTime: 60000,
  });

  // Compute derived stats
  const last7Days = history.filter(s => {
    const date = new Date(s.date);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return date >= weekAgo;
  });

  const last30Days = history;

  const completedLast7 = last7Days.filter(s => s.completed).length;
  const completedLast30 = last30Days.filter(s => s.completed).length;

  const consistencyLast7 = last7Days.length > 0 
    ? Math.round((completedLast7 / 7) * 100) 
    : 0;
  const consistencyLast30 = last30Days.length > 0 
    ? Math.round((completedLast30 / 30) * 100) 
    : 0;

  return {
    stats,
    history,
    isLoading,
    error,
    completedLast7,
    completedLast30,
    consistencyLast7,
    consistencyLast30,
  };
}

/**
 * Generate calendar heatmap data
 */
export function useCalendarHeatmap(days: number = 30) {
  const { history } = useStats();

  const heatmapData: { date: string; value: number; completed: boolean }[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const session = history.find(s => s.date === dateStr);

    heatmapData.push({
      date: dateStr,
      value: session?.viewed || 0,
      completed: session?.completed || false,
    });
  }

  return heatmapData.reverse();
}
