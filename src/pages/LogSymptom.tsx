import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { SeveritySlider } from '@/components/SeveritySlider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveSymptom } from '@/lib/storage';
import { toast } from 'sonner';
import { Activity, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

const LogSymptom = () => {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState(2);
  const [notes, setNotes] = useState('');
  const [symptomTime, setSymptomTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleSubmit = () => {
    const timestamp = new Date(symptomTime).getTime();
    saveSymptom({ 
      severity, 
      timestamp,
      notes: notes.trim() || undefined,
    });
    
    toast.success('Symptom logged!', {
      description: `Severity ${severity}/5 recorded.`,
    });
    
    navigate('/');
  };

  return (
    <AppLayout showNav={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-foreground">
              Log Symptom
            </h1>
            <p className="text-sm text-muted-foreground">How are you feeling?</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
        </div>

        {/* Severity Slider */}
        <div className="card-elevated p-5 space-y-4">
          <SeveritySlider value={severity} onChange={setSeverity} />
        </div>

        {/* Time Picker */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            When did symptoms start?
          </label>
          <input
            type="datetime-local"
            value={symptomTime}
            onChange={(e) => setSymptomTime(e.target.value)}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Additional notes (optional)
          </label>
          <Textarea
            placeholder="Any other details? Medication taken, stress level, etc..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px] text-base resize-none bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            className="btn-accent-gradient w-full"
          >
            Log Symptom
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default LogSymptom;
