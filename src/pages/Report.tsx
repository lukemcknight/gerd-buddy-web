import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { TriggerBadge } from '@/components/TriggerBadge';
import { ProgressRing } from '@/components/ProgressRing';
import { getMeals, getSymptoms, getDaysSinceStart } from '@/lib/storage';
import { generateTriggerReport } from '@/lib/triggerEngine';
import { TriggerReport } from '@/types';
import { FileText, Clock, TrendingDown, Calendar, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Report = () => {
  const [report, setReport] = useState<TriggerReport | null>(null);
  const [days, setDays] = useState(0);

  useEffect(() => {
    const meals = getMeals();
    const symptoms = getSymptoms();
    const dayCount = getDaysSinceStart() + 1;

    setDays(dayCount);
    setReport(generateTriggerReport(meals, symptoms));
  }, []);

  const handleShare = () => {
    const text = report ? 
      `My AcidTrack Report:\n\nTop Triggers:\n${report.topTriggers.slice(0, 3).map((t, i) => `${i + 1}. ${t.ingredient}`).join('\n')}\n\nLate eating risk: ${report.lateEatingRisk}%\nWorst time: ${report.worstTimeOfDay}` :
      'Check out AcidTrack for GERD tracking!';
    
    if (navigator.share) {
      navigator.share({ title: 'My GERD Trigger Report', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Report copied to clipboard!');
    }
  };

  const progressPercent = Math.min((days / 7) * 100, 100);
  const isComplete = days >= 7;

  return (
    <AppLayout title="7-Day Report">
      <div className="space-y-6">
        {/* Progress Header */}
        <div className="card-elevated p-6 text-center">
          <ProgressRing progress={progressPercent} size={100} strokeWidth={8}>
            <div className="text-center">
              <span className="text-2xl font-bold text-primary">{Math.min(days, 7)}</span>
              <span className="text-sm text-muted-foreground">/7</span>
            </div>
          </ProgressRing>
          <h2 className="text-lg font-semibold mt-4">
            {isComplete ? '🎉 Report Complete!' : `Day ${days} of 7`}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isComplete 
              ? 'Your personalized trigger report is ready'
              : `${7 - days} more days until your full report`}
          </p>
        </div>

        {report && (
          <>
            {/* Top Triggers */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-display font-semibold">
                  Top Suspected Triggers
                </h2>
              </div>
              
              {report.topTriggers.length > 0 ? (
                <div className="space-y-3">
                  {report.topTriggers.slice(0, 3).map((trigger, index) => (
                    <TriggerBadge
                      key={trigger.ingredient}
                      trigger={trigger}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="card-elevated p-5 text-center">
                  <p className="text-muted-foreground">
                    Not enough data yet. Keep logging!
                  </p>
                </div>
              )}
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 gap-3">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Late Eating Risk</span>
                </div>
                <p className="text-2xl font-bold text-accent">
                  {report.lateEatingRisk}%
                </p>
              </div>
              
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs font-medium">Avg Severity</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {report.avgSeverity}/5
                </p>
              </div>
              
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Symptom-Free Days</span>
                </div>
                <p className="text-2xl font-bold text-success">
                  {report.symptomFreeDays}
                </p>
              </div>
              
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Worst Time</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {report.worstTimeOfDay}
                </p>
              </div>
            </section>

            {/* Summary */}
            <section className="card-elevated p-5">
              <h3 className="font-semibold text-foreground mb-3">Summary</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• {report.totalMeals} meals logged</p>
                <p>• {report.totalSymptoms} symptom events recorded</p>
                {report.lateEatingRisk > 30 && (
                  <p className="text-accent">
                    • Consider avoiding meals after 8 PM
                  </p>
                )}
                {report.topTriggers.length > 0 && (
                  <p className="text-accent">
                    • Try eliminating {report.topTriggers[0]?.ingredient} for a week
                  </p>
                )}
              </div>
            </section>

            {/* Share Button */}
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share with Doctor
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Report;
