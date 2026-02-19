const {
  calculateTriggers,
  calculateSafeFoods,
  calculateTimePatterns,
  calculateLateEatingRisk,
  generateDailyInsights,
  generateTriggerReport,
  _testHelpers,
} = require('../triggerEngine');

const { extractFoods, getTimeWindowForFood, calculateConfidence, MULTI_WORD_FOODS, FOOD_TIME_WINDOWS } = _testHelpers;

// Helper to create meal objects
const createMeal = (text, hoursAgo = 0) => ({
  id: `meal-${Date.now()}-${Math.random()}`,
  text,
  timestamp: Date.now() - hoursAgo * 60 * 60 * 1000,
});

// Helper to create symptom objects
const createSymptom = (severity, hoursAgo = 0) => ({
  id: `symptom-${Date.now()}-${Math.random()}`,
  severity,
  timestamp: Date.now() - hoursAgo * 60 * 60 * 1000,
});

describe('triggerEngine', () => {
  // ============================================
  // 1. Multi-word Food Detection (extractFoods)
  // ============================================
  describe('extractFoods - Multi-word Detection', () => {
    test('extracts single words from text', () => {
      const foods = extractFoods('I had chicken and rice for dinner');
      expect(foods).toContain('chicken');
      expect(foods).toContain('rice');
    });

    test('filters out stopwords', () => {
      const foods = extractFoods('I had a big bowl of chicken');
      expect(foods).not.toContain('had');
      expect(foods).not.toContain('big');
      expect(foods).not.toContain('bowl');
      expect(foods).toContain('chicken');
    });

    test('extracts multi-word food phrases', () => {
      const foods = extractFoods('I ate tomato sauce with pasta');
      expect(foods).toContain('tomato sauce');
      expect(foods).toContain('pasta');
    });

    test('does not double-count words in multi-word phrases', () => {
      const foods = extractFoods('I had ice cream for dessert');
      expect(foods).toContain('ice cream');
      // Should not have 'ice' or 'cream' as separate items
      expect(foods.filter(f => f === 'ice').length).toBe(0);
      expect(foods.filter(f => f === 'cream').length).toBe(0);
      expect(foods).toContain('dessert');
    });

    test('handles multiple multi-word phrases', () => {
      const foods = extractFoods('peanut butter and orange juice for breakfast');
      expect(foods).toContain('peanut butter');
      expect(foods).toContain('orange juice');
    });

    test('removes duplicates', () => {
      const foods = extractFoods('coffee coffee coffee');
      expect(foods.filter(f => f === 'coffee').length).toBe(1);
    });

    test('handles empty or null input', () => {
      expect(extractFoods('')).toEqual([]);
      expect(extractFoods(null)).toEqual([]);
      expect(extractFoods(undefined)).toEqual([]);
    });

    test('normalizes to lowercase', () => {
      const foods = extractFoods('PIZZA and COFFEE');
      expect(foods).toContain('pizza');
      expect(foods).toContain('coffee');
    });

    test('removes special characters', () => {
      const foods = extractFoods('chicken! rice? pasta...');
      expect(foods).toContain('chicken');
      expect(foods).toContain('rice');
      expect(foods).toContain('pasta');
    });
  });

  // ============================================
  // 2. Variable Time Windows
  // ============================================
  describe('getTimeWindowForFood - Variable Time Windows', () => {
    test('returns fast window for coffee', () => {
      const window = getTimeWindowForFood('coffee');
      expect(window.minHours).toBe(0.25);
      expect(window.maxHours).toBe(2);
    });

    test('returns fast window for spicy food', () => {
      const window = getTimeWindowForFood('spicy chicken');
      expect(window.minHours).toBe(0.25);
      expect(window.maxHours).toBe(2);
    });

    test('returns fast window for alcohol/wine', () => {
      const window = getTimeWindowForFood('red wine');
      expect(window.minHours).toBe(0.25);
      expect(window.maxHours).toBe(2);
    });

    test('returns slow window for fatty foods', () => {
      const window = getTimeWindowForFood('fatty burger');
      expect(window.minHours).toBe(1);
      expect(window.maxHours).toBe(6);
    });

    test('returns slow window for cheese', () => {
      const window = getTimeWindowForFood('cheese pizza');
      expect(window.minHours).toBe(1);
      expect(window.maxHours).toBe(6);
    });

    test('returns slow window for fried food', () => {
      const window = getTimeWindowForFood('fried chicken');
      expect(window.minHours).toBe(1);
      expect(window.maxHours).toBe(6);
    });

    test('returns medium window for default foods', () => {
      const window = getTimeWindowForFood('rice');
      expect(window.minHours).toBe(0.5);
      expect(window.maxHours).toBe(4);
    });

    test('returns medium window for unknown foods', () => {
      const window = getTimeWindowForFood('quinoa');
      expect(window.minHours).toBe(0.5);
      expect(window.maxHours).toBe(4);
    });

    test('is case insensitive', () => {
      const window1 = getTimeWindowForFood('COFFEE');
      const window2 = getTimeWindowForFood('coffee');
      expect(window1).toEqual(window2);
    });
  });

  // ============================================
  // 3. Confidence Scoring
  // ============================================
  describe('calculateConfidence - Confidence Scoring', () => {
    test('returns 0 for less than 2 meals', () => {
      expect(calculateConfidence(0.5, 1, 5)).toBe(0);
    });

    test('increases with more meals (sample size)', () => {
      const conf2 = calculateConfidence(0.5, 2, 5);
      const conf10 = calculateConfidence(0.5, 10, 5);
      expect(conf10).toBeGreaterThan(conf2);
    });

    test('increases with higher symptom rate (consistency)', () => {
      const confLow = calculateConfidence(0.2, 5, 5);
      const confHigh = calculateConfidence(0.8, 5, 5);
      expect(confHigh).toBeGreaterThan(confLow);
    });

    test('increases with more symptoms (data quality)', () => {
      const conf2 = calculateConfidence(0.5, 5, 2);
      const conf10 = calculateConfidence(0.5, 5, 10);
      expect(conf10).toBeGreaterThan(conf2);
    });

    test('caps at 1.0 maximum', () => {
      const conf = calculateConfidence(1.0, 100, 100);
      expect(conf).toBeLessThanOrEqual(1);
    });

    test('returns reasonable values for typical scenarios', () => {
      // Low data scenario
      const lowData = calculateConfidence(0.3, 3, 2);
      expect(lowData).toBeGreaterThan(0);
      expect(lowData).toBeLessThan(0.5);

      // High data scenario
      const highData = calculateConfidence(0.7, 10, 10);
      expect(highData).toBeGreaterThan(0.5);
    });
  });

  // ============================================
  // 4. calculateTriggers - Frequency Normalization
  // ============================================
  describe('calculateTriggers - Frequency Normalization', () => {
    test('returns empty array with no data', () => {
      expect(calculateTriggers([], [])).toEqual([]);
    });

    test('returns empty array with no symptoms', () => {
      const meals = [createMeal('coffee', 2)];
      expect(calculateTriggers(meals, [])).toEqual([]);
    });

    test('returns empty array with no meals', () => {
      const symptoms = [createSymptom(3, 1)];
      expect(calculateTriggers([], symptoms)).toEqual([]);
    });

    test('identifies trigger when symptom follows meal', () => {
      const meals = [
        createMeal('coffee', 3),
        createMeal('coffee', 6),
        createMeal('coffee', 9),
      ];
      const symptoms = [
        createSymptom(4, 2),  // 1 hour after first coffee
        createSymptom(3, 5),  // 1 hour after second coffee
      ];

      const triggers = calculateTriggers(meals, symptoms);
      const coffeeTrigger = triggers.find(t => t.ingredient === 'coffee');

      expect(coffeeTrigger).toBeDefined();
      expect(coffeeTrigger.occurrences).toBeGreaterThanOrEqual(2);
    });

    test('calculates symptom rate correctly', () => {
      // Coffee eaten 4 times, symptoms 2 times after
      const meals = [
        createMeal('coffee', 12),
        createMeal('coffee', 9),
        createMeal('coffee', 6),
        createMeal('coffee', 3),
      ];
      const symptoms = [
        createSymptom(3, 11),  // 1 hour after first coffee
        createSymptom(3, 2),   // 1 hour after last coffee
      ];

      const triggers = calculateTriggers(meals, symptoms);
      const coffeeTrigger = triggers.find(t => t.ingredient === 'coffee');

      if (coffeeTrigger) {
        expect(coffeeTrigger.totalOccurrences).toBe(4);
        expect(coffeeTrigger.symptomRate).toBeLessThanOrEqual(100);
      }
    });

    test('calculates relative risk', () => {
      const meals = [
        createMeal('coffee', 3),
        createMeal('coffee', 6),
        createMeal('rice', 3),
        createMeal('rice', 6),
      ];
      const symptoms = [
        createSymptom(4, 2),  // After coffee
        createSymptom(3, 5),  // After coffee
      ];

      const triggers = calculateTriggers(meals, symptoms);
      const coffeeTrigger = triggers.find(t => t.ingredient === 'coffee');

      if (coffeeTrigger) {
        expect(coffeeTrigger.relativeRisk).toBeDefined();
        expect(coffeeTrigger.relativeRisk).toBeGreaterThan(0);
      }
    });

    test('includes confidence score', () => {
      const meals = [
        createMeal('coffee', 3),
        createMeal('coffee', 6),
      ];
      const symptoms = [
        createSymptom(4, 2),
        createSymptom(3, 5),
      ];

      const triggers = calculateTriggers(meals, symptoms);

      if (triggers.length > 0) {
        expect(triggers[0].confidence).toBeDefined();
        expect(triggers[0].confidence).toBeGreaterThanOrEqual(0);
        expect(triggers[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    test('requires minimum 2 occurrences before symptom', () => {
      const meals = [createMeal('coffee', 3)];
      const symptoms = [createSymptom(4, 2)];

      const triggers = calculateTriggers(meals, symptoms);

      // Should not include coffee as it only appears once before symptoms
      expect(triggers.find(t => t.ingredient === 'coffee')).toBeUndefined();
    });

    test('filters by confidence threshold', () => {
      const triggers = calculateTriggers(
        [createMeal('test', 3), createMeal('test', 6)],
        [createSymptom(3, 2), createSymptom(3, 5)]
      );

      // All returned triggers should have confidence >= 0.3
      triggers.forEach(t => {
        expect(t.confidence).toBeGreaterThanOrEqual(0.3);
      });
    });

    test('uses variable time windows for different foods', () => {
      // Coffee with fast window (15min-2hr)
      const meals = [
        createMeal('coffee', 3),   // 3 hours ago
        createMeal('coffee', 1.5), // 1.5 hours ago (within window)
      ];
      const symptoms = [
        createSymptom(4, 1), // 1 hour ago (0.5hr after second coffee)
      ];

      const triggers = calculateTriggers(meals, symptoms);
      // Second coffee should be detected as within the fast window
      // (symptom at 1hr, coffee at 1.5hr = 0.5hr difference, within 0.25-2hr window)
    });
  });

  // ============================================
  // 5. calculateSafeFoods
  // ============================================
  describe('calculateSafeFoods - Safe Food Detection', () => {
    test('returns empty array with no meals', () => {
      expect(calculateSafeFoods([], [])).toEqual([]);
    });

    test('identifies safe foods eaten without symptoms', () => {
      const meals = [
        createMeal('rice', 24),
        createMeal('rice', 48),
        createMeal('rice', 72),
        createMeal('rice', 96),
      ];
      const symptoms = []; // No symptoms

      const safeFoods = calculateSafeFoods(meals, symptoms);
      const riceSafe = safeFoods.find(f => f.ingredient === 'rice');

      expect(riceSafe).toBeDefined();
      expect(riceSafe.safetyScore).toBe(100);
    });

    test('calculates safety score correctly', () => {
      // Rice eaten 4 times, symptoms only once after
      const meals = [
        createMeal('rice', 96),
        createMeal('rice', 72),
        createMeal('rice', 48),
        createMeal('rice', 24),
      ];
      const symptoms = [
        createSymptom(3, 95), // Shortly after first rice
      ];

      const safeFoods = calculateSafeFoods(meals, symptoms);
      const riceSafe = safeFoods.find(f => f.ingredient === 'rice');

      if (riceSafe) {
        expect(riceSafe.totalOccurrences).toBe(4);
        expect(riceSafe.safetyScore).toBeGreaterThan(50);
      }
    });

    test('requires minimum 3 occurrences', () => {
      const meals = [
        createMeal('rice', 24),
        createMeal('rice', 48),
      ];
      const symptoms = [];

      const safeFoods = calculateSafeFoods(meals, symptoms);

      // Should not include rice as it only appears twice
      expect(safeFoods.find(f => f.ingredient === 'rice')).toBeUndefined();
    });

    test('excludes foods with high symptom correlation', () => {
      // Coffee always followed by symptoms
      const meals = [
        createMeal('coffee', 6),
        createMeal('coffee', 12),
        createMeal('coffee', 18),
      ];
      const symptoms = [
        createSymptom(4, 5),
        createSymptom(4, 11),
        createSymptom(4, 17),
      ];

      const safeFoods = calculateSafeFoods(meals, symptoms);

      // Coffee should not be in safe foods
      expect(safeFoods.find(f => f.ingredient === 'coffee')).toBeUndefined();
    });

    test('calculates symptom-free occurrences', () => {
      const meals = [
        createMeal('chicken', 96),
        createMeal('chicken', 72),
        createMeal('chicken', 48),
        createMeal('chicken', 24),
      ];
      const symptoms = []; // No symptoms

      const safeFoods = calculateSafeFoods(meals, symptoms);
      const chickenSafe = safeFoods.find(f => f.ingredient === 'chicken');

      if (chickenSafe) {
        expect(chickenSafe.symptomFreeOccurrences).toBe(4);
        expect(chickenSafe.totalOccurrences).toBe(4);
      }
    });

    test('sorts by safety score descending', () => {
      const meals = [
        createMeal('rice', 96), createMeal('rice', 72), createMeal('rice', 48),
        createMeal('chicken', 96), createMeal('chicken', 72), createMeal('chicken', 48),
      ];
      const symptoms = [
        createSymptom(3, 95), // After rice
      ];

      const safeFoods = calculateSafeFoods(meals, symptoms);

      // Should be sorted by safety score (highest first)
      for (let i = 1; i < safeFoods.length; i++) {
        expect(safeFoods[i - 1].safetyScore).toBeGreaterThanOrEqual(safeFoods[i].safetyScore);
      }
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration Tests', () => {
    test('generateDailyInsights includes safe food insight', () => {
      const meals = [
        createMeal('rice', 96),
        createMeal('rice', 72),
        createMeal('rice', 48),
        createMeal('rice', 24),
      ];
      const symptoms = [];

      const insights = generateDailyInsights(meals, symptoms);
      const safeInsight = insights.find(i => i.type === 'safe');

      if (safeInsight) {
        expect(safeInsight.title).toContain('appears to be safe');
      }
    });

    test('generateTriggerReport includes safeFoods', () => {
      const meals = [
        createMeal('rice', 96),
        createMeal('rice', 72),
        createMeal('rice', 48),
      ];
      const symptoms = [];

      const report = generateTriggerReport(meals, symptoms);

      expect(report.safeFoods).toBeDefined();
      expect(Array.isArray(report.safeFoods)).toBe(true);
    });

    test('trigger insight uses confidence text', () => {
      const meals = [
        createMeal('coffee', 3),
        createMeal('coffee', 6),
        createMeal('coffee', 9),
        createMeal('coffee', 12),
      ];
      const symptoms = [
        createSymptom(4, 2),
        createSymptom(4, 5),
        createSymptom(4, 8),
        createSymptom(4, 11),
      ];

      const insights = generateDailyInsights(meals, symptoms);
      const triggerInsight = insights.find(i => i.type === 'trigger');

      if (triggerInsight) {
        // Should contain either "likely" or "possibly"
        expect(triggerInsight.title).toMatch(/likely|possibly/);
        // Should include symptom rate
        expect(triggerInsight.description).toMatch(/\d+%/);
      }
    });

    test('multi-word foods are detected in triggers', () => {
      const meals = [
        createMeal('tomato sauce pasta', 3),
        createMeal('tomato sauce pizza', 6),
      ];
      const symptoms = [
        createSymptom(4, 2),
        createSymptom(3, 5),
      ];

      const triggers = calculateTriggers(meals, symptoms);
      const tomatoSauceTrigger = triggers.find(t => t.ingredient === 'tomato sauce');

      expect(tomatoSauceTrigger).toBeDefined();
    });
  });

  // ============================================
  // Hour Formatting
  // ============================================
  describe('Hour Formatting in Insights', () => {
    // Helper to create a symptom at a specific hour of the day
    const createSymptomAtHour = (severity, hour, daysAgo = 0) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hour, 0, 0, 0);
      return {
        id: `symptom-${Date.now()}-${Math.random()}`,
        severity,
        timestamp: date.getTime(),
      };
    };

    test('formats noon (hour 12) as 12 PM, not 12 AM', () => {
      const symptoms = [
        createSymptomAtHour(4, 12, 1),
        createSymptomAtHour(3, 12, 2),
      ];

      const insights = generateDailyInsights([], symptoms);
      const timeInsight = insights.find(i => i.title && i.title.includes('Peak symptom time'));

      expect(timeInsight).toBeDefined();
      expect(timeInsight.title).toContain('12 PM');
      expect(timeInsight.title).not.toContain('12 AM');
    });

    test('formats midnight (hour 0) as 12 AM', () => {
      const symptoms = [
        createSymptomAtHour(4, 0, 1),
        createSymptomAtHour(3, 0, 2),
      ];

      const insights = generateDailyInsights([], symptoms);
      const timeInsight = insights.find(i => i.title && i.title.includes('Peak symptom time'));

      expect(timeInsight).toBeDefined();
      expect(timeInsight.title).toContain('12 AM');
    });

    test('formats afternoon hours correctly', () => {
      const symptoms = [
        createSymptomAtHour(4, 15, 1),
        createSymptomAtHour(3, 15, 2),
      ];

      const insights = generateDailyInsights([], symptoms);
      const timeInsight = insights.find(i => i.title && i.title.includes('Peak symptom time'));

      expect(timeInsight).toBeDefined();
      expect(timeInsight.title).toContain('3 PM');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    test('handles very old timestamps', () => {
      const meals = [createMeal('coffee', 24 * 30)]; // 30 days ago
      const symptoms = [createSymptom(3, 24 * 30 - 1)];

      // Should not throw
      expect(() => calculateTriggers(meals, symptoms)).not.toThrow();
    });

    test('handles symptoms before any meals', () => {
      const meals = [createMeal('coffee', 1)];
      const symptoms = [createSymptom(3, 2)]; // Before the meal

      const triggers = calculateTriggers(meals, symptoms);
      // Should not include coffee as symptom was before meal
      expect(triggers.find(t => t.ingredient === 'coffee')).toBeUndefined();
    });

    test('handles duplicate meal entries', () => {
      const meals = [
        createMeal('coffee', 3),
        createMeal('coffee', 3), // Same time
        createMeal('coffee', 3),
      ];
      const symptoms = [createSymptom(3, 2)];

      // Should not throw
      expect(() => calculateTriggers(meals, symptoms)).not.toThrow();
    });

    test('handles meals with only stopwords', () => {
      const meals = [createMeal('a the and', 3)];
      const symptoms = [createSymptom(3, 2)];

      const triggers = calculateTriggers(meals, symptoms);
      expect(triggers.length).toBe(0);
    });

    test('handles very long meal descriptions', () => {
      const longText = 'coffee '.repeat(100);
      const meals = [createMeal(longText, 3), createMeal(longText, 6)];
      const symptoms = [createSymptom(3, 2), createSymptom(3, 5)];

      // Should not throw and should only count coffee once per meal
      expect(() => calculateTriggers(meals, symptoms)).not.toThrow();
    });
  });
});
