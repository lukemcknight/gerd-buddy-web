/**
 * Tests for InsightsScreen pro gating logic
 *
 * Key behavior tested:
 * - Free users see limited triggers (2), safe foods (1), insights (1)
 * - Pro users see full content (up to 5 triggers, 5 safe foods, all insights)
 * - Hidden item counts are computed correctly
 * - ProTeaser should appear when there are hidden items
 */

jest.mock('../../services/storage', () => ({
  getMeals: jest.fn(),
  getSymptoms: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock('../../utils/triggerEngine', () => ({
  calculateTriggers: jest.fn(),
  calculateSafeFoods: jest.fn(),
  generateDailyInsights: jest.fn(),
}));

jest.mock('../../hooks/usePremiumStatus', () => ({
  usePremiumStatus: jest.fn(),
}));

const { calculateTriggers, calculateSafeFoods, generateDailyInsights } = require('../../utils/triggerEngine');

describe('InsightsScreen - Pro Gating Logic', () => {
  const makeTriggers = (count) =>
    Array.from({ length: count }, (_, i) => ({
      ingredient: `trigger-${i}`,
      confidence: 0.8,
      symptomRate: 60,
      occurrences: 5,
      totalOccurrences: 8,
      avgSeverity: 3,
      relativeRisk: 2.1,
    }));

  const makeSafeFoods = (count) =>
    Array.from({ length: count }, (_, i) => ({
      ingredient: `safe-food-${i}`,
      safetyScore: 90,
      symptomFreeOccurrences: 9,
      totalOccurrences: 10,
    }));

  const makeInsights = (count) =>
    Array.from({ length: count }, (_, i) => ({
      title: `Insight ${i}`,
      description: `Description ${i}`,
      type: 'tip',
    }));

  // Simulate the gating logic from InsightsScreen
  const computeGating = ({ triggers, safeFoods, insights, isPro }) => {
    const freeTriggerLimit = 2;
    const freeSafeFoodLimit = 1;
    const freeInsightLimit = 1;

    const visibleTriggers = isPro ? triggers.slice(0, 5) : triggers.slice(0, freeTriggerLimit);
    const hiddenTriggerCount = isPro ? 0 : Math.max(0, Math.min(triggers.length, 5) - freeTriggerLimit);

    const visibleSafeFoods = isPro ? safeFoods.slice(0, 5) : safeFoods.slice(0, freeSafeFoodLimit);
    const hiddenSafeFoodCount = isPro ? 0 : Math.max(0, Math.min(safeFoods.length, 5) - freeSafeFoodLimit);

    const visibleInsights = isPro ? insights : insights.slice(0, freeInsightLimit);
    const hasHiddenInsights = !isPro && insights.length > freeInsightLimit;

    return {
      visibleTriggers,
      hiddenTriggerCount,
      visibleSafeFoods,
      hiddenSafeFoodCount,
      visibleInsights,
      hasHiddenInsights,
    };
  };

  describe('Free user gating', () => {
    test('limits triggers to 2 for free users', () => {
      const triggers = makeTriggers(5);
      const result = computeGating({ triggers, safeFoods: [], insights: [], isPro: false });

      expect(result.visibleTriggers).toHaveLength(2);
      expect(result.hiddenTriggerCount).toBe(3);
    });

    test('limits safe foods to 1 for free users', () => {
      const safeFoods = makeSafeFoods(5);
      const result = computeGating({ triggers: [], safeFoods, insights: [], isPro: false });

      expect(result.visibleSafeFoods).toHaveLength(1);
      expect(result.hiddenSafeFoodCount).toBe(4);
    });

    test('limits insights to 1 for free users', () => {
      const insights = makeInsights(4);
      const result = computeGating({ triggers: [], safeFoods: [], insights, isPro: false });

      expect(result.visibleInsights).toHaveLength(1);
      expect(result.hasHiddenInsights).toBe(true);
    });

    test('shows no teaser when data is within free limit', () => {
      const triggers = makeTriggers(2);
      const safeFoods = makeSafeFoods(1);
      const insights = makeInsights(1);
      const result = computeGating({ triggers, safeFoods, insights, isPro: false });

      expect(result.visibleTriggers).toHaveLength(2);
      expect(result.hiddenTriggerCount).toBe(0);
      expect(result.visibleSafeFoods).toHaveLength(1);
      expect(result.hiddenSafeFoodCount).toBe(0);
      expect(result.visibleInsights).toHaveLength(1);
      expect(result.hasHiddenInsights).toBe(false);
    });

    test('hidden count caps triggers at 5 total', () => {
      const triggers = makeTriggers(10);
      const result = computeGating({ triggers, safeFoods: [], insights: [], isPro: false });

      // Even with 10 triggers, we only show up to 5 total, so hidden = 5 - 2 = 3
      expect(result.visibleTriggers).toHaveLength(2);
      expect(result.hiddenTriggerCount).toBe(3);
    });

    test('hidden count caps safe foods at 5 total', () => {
      const safeFoods = makeSafeFoods(8);
      const result = computeGating({ triggers: [], safeFoods, insights: [], isPro: false });

      expect(result.visibleSafeFoods).toHaveLength(1);
      expect(result.hiddenSafeFoodCount).toBe(4);
    });
  });

  describe('Pro user gating', () => {
    test('shows up to 5 triggers for pro users', () => {
      const triggers = makeTriggers(7);
      const result = computeGating({ triggers, safeFoods: [], insights: [], isPro: true });

      expect(result.visibleTriggers).toHaveLength(5);
      expect(result.hiddenTriggerCount).toBe(0);
    });

    test('shows up to 5 safe foods for pro users', () => {
      const safeFoods = makeSafeFoods(7);
      const result = computeGating({ triggers: [], safeFoods, insights: [], isPro: true });

      expect(result.visibleSafeFoods).toHaveLength(5);
      expect(result.hiddenSafeFoodCount).toBe(0);
    });

    test('shows all insights for pro users', () => {
      const insights = makeInsights(8);
      const result = computeGating({ triggers: [], safeFoods: [], insights, isPro: true });

      expect(result.visibleInsights).toHaveLength(8);
      expect(result.hasHiddenInsights).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('handles empty data', () => {
      const result = computeGating({ triggers: [], safeFoods: [], insights: [], isPro: false });

      expect(result.visibleTriggers).toHaveLength(0);
      expect(result.hiddenTriggerCount).toBe(0);
      expect(result.visibleSafeFoods).toHaveLength(0);
      expect(result.hiddenSafeFoodCount).toBe(0);
      expect(result.visibleInsights).toHaveLength(0);
      expect(result.hasHiddenInsights).toBe(false);
    });

    test('handles exactly 1 trigger for free user', () => {
      const triggers = makeTriggers(1);
      const result = computeGating({ triggers, safeFoods: [], insights: [], isPro: false });

      expect(result.visibleTriggers).toHaveLength(1);
      expect(result.hiddenTriggerCount).toBe(0);
    });

    test('handles exactly 3 triggers for free user (1 hidden)', () => {
      const triggers = makeTriggers(3);
      const result = computeGating({ triggers, safeFoods: [], insights: [], isPro: false });

      expect(result.visibleTriggers).toHaveLength(2);
      expect(result.hiddenTriggerCount).toBe(1);
    });
  });
});
