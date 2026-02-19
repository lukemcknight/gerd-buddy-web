// Ported from the web version. All logic preserved for mobile.
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "is", "was", "are", "were", "be", "been", "being", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
  "he", "him", "his", "she", "her", "it", "its", "they", "them", "their",
  "some", "any", "no", "not", "only", "same", "so", "than", "too", "very",
  "just", "also", "now", "here", "there", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "as", "if", "then", "because", "while", "although", "though",
  "after", "before", "during", "until", "unless", "since", "once",
  "little", "bit", "small", "large", "big", "piece", "bowl", "cup", "glass",
  "ate", "had", "drank", "drink", "food", "meal", "snack", "breakfast", "lunch", "dinner",
]);

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z\\s]/g, " ")
    .split(/\\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

const getMealsBeforeSymptom = (meals, symptom, hoursWindow = 3) => {
  const windowMs = hoursWindow * 60 * 60 * 1000;
  return meals.filter((meal) => {
    const timeDiff = symptom.timestamp - meal.timestamp;
    return timeDiff > 0 && timeDiff <= windowMs;
  });
};

export const calculateTriggers = (meals, symptoms) => {
  const scores = new Map();

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

  const results = [];
  scores.forEach((data, ingredient) => {
    if (data.count >= 2) {
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

export const calculateTimePatterns = (symptoms) => {
  const hourlyData = new Map();

  for (const symptom of symptoms) {
    const hour = new Date(symptom.timestamp).getHours();
    const existing = hourlyData.get(hour) || { count: 0, totalSeverity: 0 };
    existing.count += 1;
    existing.totalSeverity += symptom.severity;
    hourlyData.set(hour, existing);
  }

  const patterns = [];
  hourlyData.forEach((data, hour) => {
    patterns.push({
      hour,
      symptomCount: data.count,
      avgSeverity: data.totalSeverity / data.count,
    });
  });

  return patterns.sort((a, b) => b.symptomCount - a.symptomCount);
};

export const calculateLateEatingRisk = (meals, symptoms) => {
  const lateMeals = meals.filter((meal) => {
    const hour = new Date(meal.timestamp).getHours();
    return hour >= 20 || hour < 2;
  });

  if (lateMeals.length === 0) return 0;

  let symptomsAfterLateMeals = 0;
  for (const symptom of symptoms) {
    const hasLateMealBefore = lateMeals.some((meal) => {
      const timeDiff = symptom.timestamp - meal.timestamp;
      return timeDiff > 0 && timeDiff <= 6 * 60 * 60 * 1000;
    });
    if (hasLateMealBefore) symptomsAfterLateMeals++;
  }

  return symptoms.length > 0 ? symptomsAfterLateMeals / symptoms.length : 0;
};

export const generateDailyInsights = (meals, symptoms) => {
  const insights = [];
  const triggers = calculateTriggers(meals, symptoms);
  const lateRisk = calculateLateEatingRisk(meals, symptoms);
  const timePatterns = calculateTimePatterns(symptoms);

  if (triggers.length > 0) {
    const topTrigger = triggers[0];
    insights.push({
      type: "trigger",
      title: `${topTrigger.ingredient} may be a trigger`,
      description: `Appeared in ${topTrigger.occurrences} meals before symptoms with average severity of ${topTrigger.avgSeverity}/5.`,
      severity: topTrigger.avgSeverity >= 3 ? "high" : topTrigger.avgSeverity >= 2 ? "medium" : "low",
    });
  }

  if (lateRisk > 0.3) {
    insights.push({
      type: "time",
      title: "Late night eating pattern detected",
      description: `Symptoms are ${Math.round(lateRisk * 100)}% more likely after eating past 8 PM.`,
      severity: lateRisk > 0.5 ? "high" : "medium",
    });
  }

  if (timePatterns.length > 0) {
    const worstHour = timePatterns[0];
    const hourFormatted =
      worstHour.hour > 12
        ? `${worstHour.hour - 12} PM`
        : worstHour.hour === 0
          ? "12 AM"
          : `${worstHour.hour} AM`;

    if (worstHour.symptomCount >= 2) {
      insights.push({
        type: "time",
        title: `Peak symptom time: around ${hourFormatted}`,
        description: `You've had ${worstHour.symptomCount} symptoms around this time.`,
        severity: worstHour.avgSeverity >= 3 ? "high" : "medium",
      });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySymptoms = symptoms.filter((s) => s.timestamp >= today.getTime());

  if (todaySymptoms.length === 0 && meals.length > 0) {
    insights.push({
      type: "positive",
      title: "No symptoms today!",
      description: "Keep up the great work. Track what you ate to identify safe foods.",
      severity: "low",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "streak",
      title: "Keep tracking!",
      description: "Log more meals and symptoms to discover your personal triggers.",
      severity: "low",
    });
  }

  return insights;
};

export const generateTriggerReport = (meals, symptoms) => {
  const triggers = calculateTriggers(meals, symptoms);
  const lateEatingRisk = calculateLateEatingRisk(meals, symptoms);
  const timePatterns = calculateTimePatterns(symptoms);
  const insights = generateDailyInsights(meals, symptoms);

  const daysWithSymptoms = new Set(symptoms.map((s) => new Date(s.timestamp).toDateString()));
  const allDays = new Set([
    ...meals.map((m) => new Date(m.timestamp).toDateString()),
    ...symptoms.map((s) => new Date(s.timestamp).toDateString()),
  ]);
  const symptomFreeDays = allDays.size - daysWithSymptoms.size;

  const avgSeverity =
    symptoms.length > 0 ? symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length : 0;

  let worstTimeOfDay = "Unknown";
  if (timePatterns.length > 0) {
    const worstHour = timePatterns[0].hour;
    if (worstHour >= 5 && worstHour < 12) worstTimeOfDay = "Morning";
    else if (worstHour >= 12 && worstHour < 17) worstTimeOfDay = "Afternoon";
    else if (worstHour >= 17 && worstHour < 21) worstTimeOfDay = "Evening";
    else worstTimeOfDay = "Night";
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
