import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { InsightCard } from '@/components/InsightCard';
import { ProgressRing } from '@/components/ProgressRing';
import { Button } from '@/components/ui/button';
import { getUser, getMeals, getSymptoms, getDaysSinceStart } from '@/lib/storage';
import { generateDailyInsights } from '@/lib/triggerEngine';
import { DailyInsight } from '@/types';
import { Plus, Utensils, Activity, Flame } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<DailyInsight[]>([]);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0, days: 0 });

  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/onboarding');
      return;
    }

    const meals = getMeals();
    const symptoms = getSymptoms();
    const days = getDaysSinceStart();

    setInsights(generateDailyInsights(meals, symptoms));
    setStats({
      meals: meals.length,
      symptoms: symptoms.length,
      days: Math.min(days + 1, 7),
    });
  }, [navigate]);

  const progressPercent = Math.min((stats.days / 7) * 100, 100);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with Progress */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">
                AcidTrack
              </h1>
            </div>
            <p className="text-muted-foreground">
              Day {stats.days} of 7
            </p>
          </div>
          <ProgressRing progress={progressPercent} size={70} strokeWidth={6}>
            <span className="text-sm font-bold text-primary">{stats.days}/7</span>
          </ProgressRing>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{stats.meals}</p>
            <p className="text-sm text-muted-foreground">Meals logged</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-3xl font-bold text-accent">{stats.symptoms}</p>
            <p className="text-sm text-muted-foreground">Symptoms</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/log-meal" className="block">
            <Button className="btn-primary-gradient w-full h-auto py-6 flex-col gap-2">
              <Utensils className="w-6 h-6" />
              <span className="font-semibold">Log Meal</span>
            </Button>
          </Link>
          <Link to="/log-symptom" className="block">
            <Button className="btn-accent-gradient w-full h-auto py-6 flex-col gap-2">
              <Activity className="w-6 h-6" />
              <span className="font-semibold">Log Symptom</span>
            </Button>
          </Link>
        </div>

        {/* Today's Insights */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Today's Insights
            </h2>
            <Link 
              to="/insights" 
              className="text-sm text-primary font-medium hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 2).map((insight, index) => (
              <InsightCard 
                key={index} 
                insight={insight} 
                className={`stagger-${index + 1}`}
              />
            ))}
            {insights.length === 0 && (
              <div className="card-elevated p-6 text-center">
                <p className="text-muted-foreground">
                  Start logging meals and symptoms to see insights!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA for Report */}
        {stats.days >= 7 && (
          <Link to="/report" className="block">
            <div className="card-glow p-5 text-center animate-pulse-soft">
              <p className="font-semibold text-primary mb-1">
                🎉 Your 7-day report is ready!
              </p>
              <p className="text-sm text-muted-foreground">
                Tap to view your top GERD triggers
              </p>
            </div>
          </Link>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
