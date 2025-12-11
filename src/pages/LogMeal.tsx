import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { saveMeal } from '@/lib/storage';
import { toast } from 'sonner';
import { Utensils, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

const quickMeals = [
  '☕ Coffee',
  '🍕 Pizza',
  '🍝 Pasta with tomato sauce',
  '🌶️ Spicy food',
  '🍫 Chocolate',
  '🍊 Citrus fruit',
  '🧅 Onions or garlic',
  '🍟 Fried food',
];

const LogMeal = () => {
  const navigate = useNavigate();
  const [mealText, setMealText] = useState('');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleQuickAdd = (meal: string) => {
    // Remove emoji and add to text
    const cleanMeal = meal.replace(/^\S+\s/, '');
    setMealText(prev => prev ? `${prev}, ${cleanMeal}` : cleanMeal);
  };

  const handleSubmit = () => {
    if (!mealText.trim()) {
      toast.error('Please describe what you ate');
      return;
    }

    const timestamp = new Date(mealTime).getTime();
    saveMeal({ text: mealText.trim(), timestamp });
    
    toast.success('Meal logged!', {
      description: 'Keep tracking to discover your triggers.',
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
              Log Meal
            </h1>
            <p className="text-sm text-muted-foreground">What did you eat?</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Utensils className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Meal Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Describe your meal
          </label>
          <Textarea
            placeholder="e.g., Grilled chicken with rice and vegetables..."
            value={mealText}
            onChange={(e) => setMealText(e.target.value)}
            className="min-h-[120px] text-base resize-none bg-card border-border rounded-xl focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Quick Add */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            Quick add common triggers
          </div>
          <div className="flex flex-wrap gap-2">
            {quickMeals.map((meal) => (
              <button
                key={meal}
                onClick={() => handleQuickAdd(meal)}
                className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        {/* Time Picker */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            When did you eat?
          </label>
          <input
            type="datetime-local"
            value={mealTime}
            onChange={(e) => setMealTime(e.target.value)}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!mealText.trim()}
            className="btn-primary-gradient w-full"
          >
            Log Meal
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default LogMeal;
