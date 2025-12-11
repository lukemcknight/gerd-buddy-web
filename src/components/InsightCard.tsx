import { DailyInsight } from '@/types';
import { Flame, Clock, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

interface InsightCardProps {
  insight: DailyInsight;
  className?: string;
  style?: CSSProperties;
}

const iconMap = {
  trigger: Flame,
  time: Clock,
  positive: Sparkles,
  streak: TrendingUp,
};

const severityColors = {
  low: 'border-success/30 bg-success-light',
  medium: 'border-warning/30 bg-warning-light',
  high: 'border-accent/30 bg-accent-light',
};

const severityIconColors = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-accent',
};

export const InsightCard = ({ insight, className, style }: InsightCardProps) => {
  const Icon = iconMap[insight.type] || AlertTriangle;
  const severity = insight.severity || 'low';

  return (
    <div
      className={cn(
        'insight-card border-l-4 animate-fade-in',
        severityColors[severity],
        className
      )}
      style={style}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', severityIconColors[severity])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground leading-tight">
            {insight.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>
      </div>
    </div>
  );
};
