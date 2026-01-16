/**
 * Daily Drift Progress Component
 * 
 * Shows progress towards daily drift target.
 */

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Target, Check } from 'lucide-react';

interface DailyDriftProgressProps {
  viewed: number;
  target: number;
  compact?: boolean;
  className?: string;
}

export function DailyDriftProgress({
  viewed,
  target,
  compact = false,
  className,
}: DailyDriftProgressProps) {
  const progress = Math.min(100, (viewed / target) * 100);
  const isComplete = viewed >= target;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isComplete 
            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            : "bg-primary/10 text-primary"
        )}>
          {isComplete ? (
            <Check className="h-3 w-3" />
          ) : (
            <Target className="h-3 w-3" />
          )}
          <span>{viewed}/{target}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          {isComplete ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Daily Drift Complete!
              </span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium">Daily Drift Progress</span>
            </>
          )}
        </span>
        <span className="text-muted-foreground">
          {viewed} / {target}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
