import { Meal, Symptom, TriggerScore, DailyInsight, TriggerReport, TimePattern } from '@/types';

// Common stopwords to ignore
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'some', 'any', 'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very',
  'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'as', 'if', 'then', 'because', 'while', 'although', 'though',
  'after', 'before', 'during', 'until', 'unless', 'since', 'once',
  'little', 'bit', 'small', 'large', 'big', 'piece', 'bowl', 'cup', 'glass',
  'ate', 'had', 'drank', 'drink', 'food', 'meal', 'snack', 'breakfast', 'lunch', 'dinner',
]);

// Tokenize meal text
const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
};

// Get meals within time window before a symptom (in hours)
const getMealsBeforeSymptom = (
  meals: Meal[],
  symptom: Symptom,
  hoursWindow: number = 3
): Meal[] => {
  const windowMs = hoursWindow * 60 * 60 * 1000;
  return meals.filter(meal => {
    const timeDiff = symptom.timestamp - meal.timestamp;
    return timeDiff > 0 && timeDiff <= windowMs;
  });
};

// Calculate trigger scores
export const calculateTriggers = (meals: Meal[], symptoms: Symptom[]): TriggerScore[] => {
  const scores: Map<string, { total: number; count: number; severities: number[] }> = new Map();

  for (const symptom of symptoms) {
    const recentMeals = getMealsBeforeSymptom(meals, symptom);
    
    for (const meal of recentMeals) {
      const words = tokenize(meal.text);
      
      for (const word of words) {
        const existing = scores.get(word) || { total: 0, count: 0, severities: [] };
        existing.total += symptom.severity;
        existing.count += 1;
        existing.severities.push(symptom.severity);
        scores.set(word, existing);
      }
    }
  }

  const results: TriggerScore[] = [];
  
  scores.forEach((data, ingredient) => {
    if (data.count >= 2) { // Require at least 2 occurrences
      const avgSeverity = data.severities.reduce((a, b) => a + b, 0) / data.severities.length;
      results.push({
        ingredient,
        score: data.total,
        occurrences: data.count,
        avgSeverity: Math.round(avgSeverity * 10) / 10,
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
};

// Calculate time-based patterns
export const calculateTimePatterns = (symptoms: Symptom[]): TimePattern[] => {
  const hourlyData: Map<number, { count: number; totalSeverity: number }> = new Map();

  for (const symptom of symptoms) {
    const hour = new Date(symptom.timestamp).getHours();
    const existing = hourlyData.get(hour) || { count: 0, totalSeverity: 0 };
    existing.count += 1;
    existing.totalSeverity += symptom.severity;
    hourlyData.set(hour, existing);
  }

  const patterns: TimePattern[] = [];
  hourlyData.forEach((data, hour) => {
    patterns.push({
      hour,
      symptomCount: data.count,
      avgSeverity: data.totalSeverity / data.count,
    });
  });

  return patterns.sort((a, b) => b.symptomCount - a.symptomCount);
};

// Calculate late eating risk (eating after 8PM)
export const calculateLateEatingRisk = (meals: Meal[], symptoms: Symptom[]): number => {
  const lateMeals = meals.filter(meal => {
    const hour = new Date(meal.timestamp).getHours();
    return hour >= 20 || hour < 2; // 8PM to 2AM
  });

  if (lateMeals.length === 0) return 0;

  let symptomsAfterLateMeals = 0;
  
  for (const symptom of symptoms) {
    const hasLateMealBefore = lateMeals.some(meal => {
      const timeDiff = symptom.timestamp - meal.timestamp;
      return timeDiff > 0 && timeDiff <= 6 * 60 * 60 * 1000; // Within 6 hours
    });
    if (hasLateMealBefore) symptomsAfterLateMeals++;
  }

  return symptoms.length > 0 ? symptomsAfterLateMeals / symptoms.length : 0;
};

// Generate daily insights
export const generateDailyInsights = (meals: Meal[], symptoms: Symptom[]): DailyInsight[] => {
  const insights: DailyInsight[] = [];
  const triggers = calculateTriggers(meals, symptoms);
  const lateRisk = calculateLateEatingRisk(meals, symptoms);
  const timePatterns = calculateTimePatterns(symptoms);

  // Check for top trigger
  if (triggers.length > 0) {
    const topTrigger = triggers[0];
    insights.push({
      type: 'trigger',
      title: `${topTrigger.ingredient} may be a trigger`,
      description: `Appeared in ${topTrigger.occurrences} meals before symptoms with average severity of ${topTrigger.avgSeverity}/5.`,
      severity: topTrigger.avgSeverity >= 3 ? 'high' : topTrigger.avgSeverity >= 2 ? 'medium' : 'low',
    });
  }

  // Check late eating
  if (lateRisk > 0.3) {
    insights.push({
      type: 'time',
      title: 'Late night eating pattern detected',
      description: `Symptoms are ${Math.round(lateRisk * 100)}% more likely after eating past 8 PM.`,
      severity: lateRisk > 0.5 ? 'high' : 'medium',
    });
  }

  // Check for worst time of day
  if (timePatterns.length > 0) {
    const worstHour = timePatterns[0];
    const hourFormatted = worstHour.hour > 12 
      ? `${worstHour.hour - 12} PM` 
      : worstHour.hour === 0 ? '12 AM' 
      : `${worstHour.hour} AM`;
    
    if (worstHour.symptomCount >= 2) {
      insights.push({
        type: 'time',
        title: `Peak symptom time: around ${hourFormatted}`,
        description: `You've had ${worstHour.symptomCount} symptoms around this time.`,
        severity: worstHour.avgSeverity >= 3 ? 'high' : 'medium',
      });
    }
  }

  // Check for symptom-free streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySymptoms = symptoms.filter(s => s.timestamp >= today.getTime());
  
  if (todaySymptoms.length === 0 && meals.length > 0) {
    insights.push({
      type: 'positive',
      title: 'No symptoms today!',
      description: 'Keep up the great work. Track what you ate to identify safe foods.',
      severity: 'low',
    });
  }

  // If no insights, add encouragement
  if (insights.length === 0) {
    insights.push({
      type: 'streak',
      title: 'Keep tracking!',
      description: 'Log more meals and symptoms to discover your personal triggers.',
      severity: 'low',
    });
  }

  return insights;
};

// Generate 7-day report
export const generateTriggerReport = (meals: Meal[], symptoms: Symptom[]): TriggerReport => {
  const triggers = calculateTriggers(meals, symptoms);
  const lateEatingRisk = calculateLateEatingRisk(meals, symptoms);
  const timePatterns = calculateTimePatterns(symptoms);
  const insights = generateDailyInsights(meals, symptoms);

  // Calculate symptom-free days
  const daysWithSymptoms = new Set(
    symptoms.map(s => new Date(s.timestamp).toDateString())
  );
  const allDays = new Set([
    ...meals.map(m => new Date(m.timestamp).toDateString()),
    ...symptoms.map(s => new Date(s.timestamp).toDateString()),
  ]);
  const symptomFreeDays = allDays.size - daysWithSymptoms.size;

  // Calculate average severity
  const avgSeverity = symptoms.length > 0
    ? symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length
    : 0;

  // Determine worst time of day
  let worstTimeOfDay = 'Unknown';
  if (timePatterns.length > 0) {
    const worstHour = timePatterns[0].hour;
    if (worstHour >= 5 && worstHour < 12) worstTimeOfDay = 'Morning';
    else if (worstHour >= 12 && worstHour < 17) worstTimeOfDay = 'Afternoon';
    else if (worstHour >= 17 && worstHour < 21) worstTimeOfDay = 'Evening';
    else worstTimeOfDay = 'Night';
  }

  return {
    topTriggers: triggers.slice(0, 5),
    lateEatingRisk: Math.round(lateEatingRisk * 100),
    worstTimeOfDay,
    totalMeals: meals.length,
    totalSymptoms: symptoms.length,
    avgSeverity: Math.round(avgSeverity * 10) / 10,
    symptomFreeDays,
    insights,
    generatedAt: Date.now(),
  };
};
