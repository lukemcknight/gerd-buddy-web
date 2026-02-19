// Improved trigger detection algorithm with:
// 1. Frequency normalization (relative risk)
// 2. Multi-word food detection (n-grams)
// 3. Variable time windows
// 4. Safe food detection
// 5. Confidence scoring

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
  "really", "much", "many", "made", "like", "got", "get", "put", "take", "took",
]);

// Common multi-word food phrases to detect as single units
const MULTI_WORD_FOODS = [
  "tomato sauce", "ice cream", "peanut butter", "olive oil", "coconut oil",
  "sour cream", "cream cheese", "cottage cheese", "blue cheese", "goat cheese",
  "almond milk", "oat milk", "soy milk", "coconut milk",
  "orange juice", "apple juice", "grape juice", "cranberry juice",
  "green tea", "black tea", "iced tea", "hot chocolate",
  "french fries", "hash browns", "mashed potatoes", "baked potato",
  "fried rice", "brown rice", "white rice", "wild rice",
  "whole wheat", "white bread", "sourdough bread", "garlic bread",
  "red wine", "white wine", "beer", "sparkling water",
  "bell pepper", "hot pepper", "chili pepper", "black pepper",
  "red onion", "green onion", "white onion",
  "ground beef", "chicken breast", "pork chop", "bacon bits",
  "dark chocolate", "milk chocolate", "white chocolate",
  "energy drink", "sports drink", "soft drink",
  "fast food", "fried food", "spicy food", "fatty food",
  "citrus fruit", "dried fruit",
];

// Food categories with their typical digestion/reaction time windows (in hours)
const FOOD_TIME_WINDOWS = {
  // Fast-acting (15min - 2hrs)
  fast: {
    keywords: ["coffee", "espresso", "caffeine", "alcohol", "wine", "beer", "spicy", "pepper", "hot sauce", "vinegar", "citrus", "orange", "lemon", "lime", "grapefruit", "mint", "peppermint"],
    minHours: 0.25,
    maxHours: 2,
  },
  // Medium (1-4hrs) - most foods
  medium: {
    keywords: ["default"],
    minHours: 0.5,
    maxHours: 4,
  },
  // Slow-acting (2-6hrs)
  slow: {
    keywords: ["fatty", "fried", "cream", "cheese", "butter", "oil", "chocolate", "pizza", "burger", "steak", "bacon", "sausage"],
    minHours: 1,
    maxHours: 6,
  },
};

// Get time window for a specific food
const getTimeWindowForFood = (food) => {
  const lowerFood = food.toLowerCase();

  for (const [, config] of Object.entries(FOOD_TIME_WINDOWS)) {
    if (config.keywords.some(keyword => lowerFood.includes(keyword))) {
      return { minHours: config.minHours, maxHours: config.maxHours };
    }
  }

  return { minHours: FOOD_TIME_WINDOWS.medium.minHours, maxHours: FOOD_TIME_WINDOWS.medium.maxHours };
};

// Extract foods from text, including multi-word phrases
const extractFoods = (text) => {
  if (!text) return [];

  let normalizedText = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  const foods = [];

  // First, find and extract multi-word foods
  for (const phrase of MULTI_WORD_FOODS) {
    if (normalizedText.includes(phrase)) {
      foods.push(phrase);
      // Remove the phrase to avoid double-counting individual words
      normalizedText = normalizedText.replace(new RegExp(phrase, "g"), " ");
    }
  }

  // Then extract remaining single words
  const words = normalizedText
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  foods.push(...words);

  return [...new Set(foods)]; // Remove duplicates
};

// Legacy tokenize function for backwards compatibility
const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

// Get meals within a variable time window before a symptom
const getMealsInWindow = (meals, symptom, food = null) => {
  const { minHours, maxHours } = food ? getTimeWindowForFood(food) : { minHours: 0.5, maxHours: 4 };
  const minMs = minHours * 60 * 60 * 1000;
  const maxMs = maxHours * 60 * 60 * 1000;

  return meals.filter((meal) => {
    const timeDiff = symptom.timestamp - meal.timestamp;
    return timeDiff >= minMs && timeDiff <= maxMs;
  });
};

// Legacy function for backwards compatibility
const getMealsBeforeSymptom = (meals, symptom, hoursWindow = 3) => {
  const windowMs = hoursWindow * 60 * 60 * 1000;
  return meals.filter((meal) => {
    const timeDiff = symptom.timestamp - meal.timestamp;
    return timeDiff > 0 && timeDiff <= windowMs;
  });
};

// Calculate confidence score using a simplified statistical approach
// Based on sample size and consistency of results
const calculateConfidence = (symptomRate, totalMeals, totalSymptoms) => {
  if (totalMeals < 2) return 0;

  // Factor 1: Sample size (more meals = higher confidence)
  const sampleFactor = Math.min(1, totalMeals / 10);

  // Factor 2: Consistency (symptom rate consistency)
  // Higher symptom rate with more data = more confident
  const consistencyFactor = Math.min(1, symptomRate * 2);

  // Factor 3: Overall data quality (do we have enough symptoms to detect patterns?)
  const dataQualityFactor = Math.min(1, totalSymptoms / 5);

  // Combine factors (weighted average)
  const confidence = (sampleFactor * 0.4) + (consistencyFactor * 0.3) + (dataQualityFactor * 0.3);

  return Math.round(confidence * 100) / 100;
};

// IMPROVED: Calculate triggers with frequency normalization and confidence scoring
export const calculateTriggers = (meals, symptoms) => {
  if (meals.length === 0 || symptoms.length === 0) return [];

  const foodStats = new Map();

  // Step 1: Count ALL meals per food (baseline frequency)
  for (const meal of meals) {
    const foods = extractFoods(meal.text);
    for (const food of foods) {
      const stats = foodStats.get(food) || {
        totalMeals: 0,
        mealsBeforeSymptom: 0,
        severitySum: 0,
        severities: [],
      };
      stats.totalMeals++;
      foodStats.set(food, stats);
    }
  }

  // Step 2: Count meals before symptoms (with variable time windows)
  for (const symptom of symptoms) {
    const foodsCountedThisSymptom = new Set();

    for (const meal of meals) {
      const foods = extractFoods(meal.text);

      for (const food of foods) {
        // Check if this meal is within the appropriate time window for this food
        const { minHours, maxHours } = getTimeWindowForFood(food);
        const minMs = minHours * 60 * 60 * 1000;
        const maxMs = maxHours * 60 * 60 * 1000;
        const timeDiff = symptom.timestamp - meal.timestamp;

        if (timeDiff >= minMs && timeDiff <= maxMs && !foodsCountedThisSymptom.has(food)) {
          const stats = foodStats.get(food);
          if (stats) {
            stats.mealsBeforeSymptom++;
            stats.severitySum += symptom.severity;
            stats.severities.push(symptom.severity);
            foodsCountedThisSymptom.add(food);
          }
        }
      }
    }
  }

  // Step 3: Calculate relative risk and confidence for each food
  const baselineSymptomRate = symptoms.length / Math.max(meals.length, 1);
  const results = [];

  foodStats.forEach((stats, food) => {
    // Require minimum data points
    if (stats.totalMeals < 2 || stats.mealsBeforeSymptom < 2) return;

    const symptomRate = stats.mealsBeforeSymptom / stats.totalMeals;
    const relativeRisk = baselineSymptomRate > 0 ? symptomRate / baselineSymptomRate : symptomRate;
    const confidence = calculateConfidence(symptomRate, stats.totalMeals, symptoms.length);
    const avgSeverity = stats.severitySum / stats.mealsBeforeSymptom;

    // Only include if relative risk suggests correlation and confidence is reasonable
    if (relativeRisk >= 1.0 && confidence >= 0.3) {
      results.push({
        ingredient: food,
        score: stats.mealsBeforeSymptom * avgSeverity, // Legacy score for compatibility
        occurrences: stats.mealsBeforeSymptom,
        totalOccurrences: stats.totalMeals,
        avgSeverity: Math.round(avgSeverity * 10) / 10,
        relativeRisk: Math.round(relativeRisk * 100) / 100,
        confidence: confidence,
        symptomRate: Math.round(symptomRate * 100), // percentage
      });
    }
  });

  // Sort by relative risk * confidence (most likely triggers first)
  return results.sort((a, b) => (b.relativeRisk * b.confidence) - (a.relativeRisk * a.confidence));
};

// NEW: Calculate safe foods (eaten frequently without symptoms)
export const calculateSafeFoods = (meals, symptoms) => {
  if (meals.length === 0) return [];

  const foodStats = new Map();

  // Count all meals per food
  for (const meal of meals) {
    const foods = extractFoods(meal.text);
    for (const food of foods) {
      const stats = foodStats.get(food) || {
        totalMeals: 0,
        mealsBeforeSymptom: 0,
      };
      stats.totalMeals++;
      foodStats.set(food, stats);
    }
  }

  // Count meals before symptoms
  for (const symptom of symptoms) {
    const foodsCountedThisSymptom = new Set();

    for (const meal of meals) {
      const foods = extractFoods(meal.text);

      for (const food of foods) {
        const { minHours, maxHours } = getTimeWindowForFood(food);
        const minMs = minHours * 60 * 60 * 1000;
        const maxMs = maxHours * 60 * 60 * 1000;
        const timeDiff = symptom.timestamp - meal.timestamp;

        if (timeDiff >= minMs && timeDiff <= maxMs && !foodsCountedThisSymptom.has(food)) {
          const stats = foodStats.get(food);
          if (stats) {
            stats.mealsBeforeSymptom++;
            foodsCountedThisSymptom.add(food);
          }
        }
      }
    }
  }

  // Find foods with low symptom correlation
  const results = [];
  const baselineSymptomRate = symptoms.length / Math.max(meals.length, 1);

  foodStats.forEach((stats, food) => {
    // Require minimum sample size for safe food detection
    if (stats.totalMeals < 3) return;

    const symptomRate = stats.mealsBeforeSymptom / stats.totalMeals;
    const safetyScore = 1 - symptomRate; // Higher = safer

    // Include if no symptoms at all, or symptom rate is below baseline
    const isSafe = symptoms.length === 0 || symptomRate < baselineSymptomRate * 0.8;

    if (isSafe) {
      results.push({
        ingredient: food,
        totalOccurrences: stats.totalMeals,
        symptomFreeOccurrences: stats.totalMeals - stats.mealsBeforeSymptom,
        safetyScore: Math.round(safetyScore * 100), // percentage
        symptomRate: Math.round(symptomRate * 100),
      });
    }
  });

  // Sort by safety score (safest foods first)
  return results.sort((a, b) => b.safetyScore - a.safetyScore);
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
  const safeFoods = calculateSafeFoods(meals, symptoms);
  const lateRisk = calculateLateEatingRisk(meals, symptoms);
  const timePatterns = calculateTimePatterns(symptoms);

  if (triggers.length > 0) {
    const topTrigger = triggers[0];
    const confidenceText = topTrigger.confidence >= 0.7 ? "likely" : "possibly";
    insights.push({
      type: "trigger",
      title: `${topTrigger.ingredient} is ${confidenceText} a trigger`,
      description: `Symptoms occurred ${topTrigger.symptomRate}% of the time after eating ${topTrigger.ingredient} (${topTrigger.occurrences}/${topTrigger.totalOccurrences} meals).`,
      severity: topTrigger.avgSeverity >= 3 ? "high" : topTrigger.avgSeverity >= 2 ? "medium" : "low",
      confidence: topTrigger.confidence,
    });
  }

  // Add safe food insight
  if (safeFoods.length > 0) {
    const topSafe = safeFoods[0];
    if (topSafe.totalOccurrences >= 4) {
      insights.push({
        type: "safe",
        title: `${topSafe.ingredient} appears to be safe`,
        description: `You've eaten ${topSafe.ingredient} ${topSafe.totalOccurrences} times with ${topSafe.safetyScore}% being symptom-free.`,
        severity: "low",
      });
    }
  }

  if (lateRisk > 0.3) {
    insights.push({
      type: "time",
      title: "Late night eating pattern detected",
      description: `${Math.round(lateRisk * 100)}% of your symptoms followed meals after 8 PM.`,
      severity: lateRisk > 0.5 ? "high" : "medium",
    });
  }

  if (timePatterns.length > 0) {
    const worstHour = timePatterns[0];
    const hourFormatted =
      worstHour.hour >= 12
        ? worstHour.hour === 12 ? "12 PM" : `${worstHour.hour - 12} PM`
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

// Export helper functions for testing
export const _testHelpers = {
  extractFoods,
  getTimeWindowForFood,
  calculateConfidence,
  MULTI_WORD_FOODS,
  FOOD_TIME_WINDOWS,
};

export const generateTriggerReport = (meals, symptoms) => {
  const triggers = calculateTriggers(meals, symptoms);
  const safeFoods = calculateSafeFoods(meals, symptoms);
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
    safeFoods: safeFoods.slice(0, 5),
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
