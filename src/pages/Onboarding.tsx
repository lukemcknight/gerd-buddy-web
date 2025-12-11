import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Flame, ArrowRight, Bell, Heart } from 'lucide-react';

const symptomOptions = [
  { id: 'heartburn', label: 'Heartburn', emoji: '🔥' },
  { id: 'regurgitation', label: 'Regurgitation', emoji: '😮‍💨' },
  { id: 'chest_pain', label: 'Chest pain', emoji: '💔' },
  { id: 'difficulty_swallowing', label: 'Difficulty swallowing', emoji: '😰' },
  { id: 'nausea', label: 'Nausea', emoji: '🤢' },
  { id: 'bloating', label: 'Bloating', emoji: '🎈' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleComplete = () => {
    createUser(selectedSymptoms, remindersEnabled);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container max-w-md mx-auto px-6 py-12 flex flex-col">
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8">
              <Flame className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-3">
              AcidTrack
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              Discover your GERD triggers
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mb-12">
              Track meals and symptoms for 7 days. We'll identify your personal triggers.
            </p>
            <Button 
              onClick={() => setStep(1)}
              className="btn-primary-gradient w-full max-w-xs"
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                What symptoms do you experience?
              </h2>
              <p className="text-muted-foreground">
                Select all that apply
              </p>
            </div>

            <div className="flex-1 space-y-3">
              {symptomOptions.map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => handleSymptomToggle(symptom.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                    selectedSymptoms.includes(symptom.id)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border hover:border-primary/20'
                  }`}
                >
                  <span className="text-2xl">{symptom.emoji}</span>
                  <span className="flex-1 text-left font-medium">{symptom.label}</span>
                  <Checkbox
                    checked={selectedSymptoms.includes(symptom.id)}
                    className="pointer-events-none"
                  />
                </button>
              ))}
            </div>

            <Button 
              onClick={() => setStep(2)}
              disabled={selectedSymptoms.length === 0}
              className="btn-primary-gradient mt-8"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Enable reminders?
              </h2>
              <p className="text-muted-foreground">
                Gentle nudges to help you track consistently
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <div className="card-elevated p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Daily reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Remind me to log meals & symptoms
                    </p>
                  </div>
                  <Switch
                    checked={remindersEnabled}
                    onCheckedChange={setRemindersEnabled}
                  />
                </div>
              </div>

              <div className="card-elevated p-5 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Evening reminder</p>
                    <p className="text-sm text-muted-foreground">
                      Avoid eating 2 hours before bed
                    </p>
                  </div>
                  <Switch checked={remindersEnabled} disabled />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleComplete}
              className="btn-primary-gradient mt-8"
            >
              Start Tracking
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
