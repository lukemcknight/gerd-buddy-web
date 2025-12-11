import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { InsightCard } from '@/components/InsightCard';
import { TriggerBadge } from '@/components/TriggerBadge';
import { getMeals, getSymptoms } from '@/lib/storage';
import { generateDailyInsights, calculateTriggers } from '@/lib/triggerEngine';
import { DailyInsight, TriggerScore } from '@/types';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const Insights = () => {
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  const [triggers, setTriggers] = useState<TriggerScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const meals = getMeals();
    const symptoms = getSymptoms();
    
    setInsights(generateDailyInsights(meals, symptoms));
    setTriggers(calculateTriggers(meals, symptoms));
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <AppLayout title="Insights">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Insights">
      <div className="space-y-8">
        {/* Suspected Triggers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-display font-semibold text-foreground">
              Suspected Triggers
            </h2>
          </div>
          
          {triggers.length > 0 ? (
            <div className="space-y-3">
              {triggers.slice(0, 5).map((trigger, index) => (
                <TriggerBadge
                  key={trigger.ingredient}
                  trigger={trigger}
                  rank={index + 1}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
                />
              ))}
            </div>
          ) : (
            <div className="card-elevated p-6 text-center">
              <p className="text-muted-foreground">
                Log more meals and symptoms to identify triggers.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We need at least 2 symptom events with meals logged before.
              </p>
            </div>
          )}
        </section>

        {/* All Insights */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">
              Patterns & Tips
            </h2>
          </div>
          
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <InsightCard
                key={index}
                insight={insight}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` } as React.CSSProperties}
              />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Insights;
