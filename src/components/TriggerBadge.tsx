import { TriggerScore } from '@/types';
import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

interface TriggerBadgeProps {
  trigger: TriggerScore;
  rank: number;
  className?: string;
  style?: CSSProperties;
}

export const TriggerBadge = ({ trigger, rank, className, style }: TriggerBadgeProps) => {
  const severityLevel = trigger.avgSeverity >= 3 ? 'high' : trigger.avgSeverity >= 2 ? 'medium' : 'low';
  
  const bgColors = {
    high: 'bg-accent/10 border-accent/30',
    medium: 'bg-warning/10 border-warning/30',
    low: 'bg-muted border-border',
  };

  const textColors = {
    high: 'text-accent',
    medium: 'text-warning',
    low: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02]',
        bgColors[severityLevel],
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          severityLevel === 'high' ? 'bg-accent text-accent-foreground' :
          severityLevel === 'medium' ? 'bg-warning text-warning-foreground' :
          'bg-muted-foreground/20 text-muted-foreground'
        )}>
          {rank}
        </div>
        <div>
          <p className="font-semibold text-foreground capitalize">{trigger.ingredient}</p>
          <p className="text-xs text-muted-foreground">
            {trigger.occurrences} occurrences
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn('text-lg font-bold', textColors[severityLevel])}>
          {trigger.avgSeverity}/5
        </p>
        <p className="text-xs text-muted-foreground">avg severity</p>
      </div>
    </div>
  );
};
