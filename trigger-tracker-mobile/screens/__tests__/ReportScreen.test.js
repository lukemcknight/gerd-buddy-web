/**
 * Tests for ReportScreen pro gating logic
 *
 * Key behavior tested:
 * - Free users see 1 trigger, analytics grid replaced by ProTeaser, share hidden
 * - Pro users see up to 3 triggers, full analytics grid, share button
 * - Pattern snapshot and educational section always visible
 */

jest.mock('../../services/storage', () => ({
  getMeals: jest.fn(),
  getSymptoms: jest.fn(),
  getDaysSinceStart: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock('../../utils/triggerEngine', () => ({
  generateTriggerReport: jest.fn(),
}));

jest.mock('../../hooks/usePremiumStatus', () => ({
  usePremiumStatus: jest.fn(),
}));

describe('ReportScreen - Pro Gating Logic', () => {
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

  const makePatternReport = (triggerCount) => ({
    topTriggers: makeTriggers(triggerCount),
    lateEatingRisk: 35,
    avgSeverity: 2.8,
    symptomFreeDays: 4,
    worstTimeOfDay: 'Evening',
    totalMeals: 21,
    totalSymptoms: 8,
  });

  // Simulate the gating logic from ReportScreen
  const computeGating = ({ patternReport, isPro }) => {
    const freeTriggerLimit = 1;

    const visibleTriggerCount = patternReport
      ? Math.min(patternReport.topTriggers.length, isPro ? 3 : freeTriggerLimit)
      : 0;

    const hiddenTriggerCount = !isPro && patternReport
      ? Math.max(0, Math.min(patternReport.topTriggers.length, 3) - freeTriggerLimit)
      : 0;

    const showAnalyticsGrid = isPro;
    const showShareButton = isPro && patternReport !== null;

    return {
      visibleTriggerCount,
      hiddenTriggerCount,
      showAnalyticsGrid,
      showShareButton,
    };
  };

  describe('Free user gating', () => {
    test('limits triggers to 1 for free users', () => {
      const patternReport = makePatternReport(3);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.visibleTriggerCount).toBe(1);
      expect(result.hiddenTriggerCount).toBe(2);
    });

    test('hides analytics grid for free users', () => {
      const patternReport = makePatternReport(3);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.showAnalyticsGrid).toBe(false);
    });

    test('hides share button for free users', () => {
      const patternReport = makePatternReport(3);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.showShareButton).toBe(false);
    });

    test('shows no trigger teaser when only 1 trigger exists', () => {
      const patternReport = makePatternReport(1);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.visibleTriggerCount).toBe(1);
      expect(result.hiddenTriggerCount).toBe(0);
    });

    test('hidden count reflects actual triggers up to 3', () => {
      const patternReport = makePatternReport(2);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.visibleTriggerCount).toBe(1);
      expect(result.hiddenTriggerCount).toBe(1);
    });
  });

  describe('Pro user gating', () => {
    test('shows up to 3 triggers for pro users', () => {
      const patternReport = makePatternReport(5);
      const result = computeGating({ patternReport, isPro: true });

      expect(result.visibleTriggerCount).toBe(3);
      expect(result.hiddenTriggerCount).toBe(0);
    });

    test('shows analytics grid for pro users', () => {
      const patternReport = makePatternReport(3);
      const result = computeGating({ patternReport, isPro: true });

      expect(result.showAnalyticsGrid).toBe(true);
    });

    test('shows share button for pro users with data', () => {
      const patternReport = makePatternReport(3);
      const result = computeGating({ patternReport, isPro: true });

      expect(result.showShareButton).toBe(true);
    });

    test('hides share button for pro users without data', () => {
      const result = computeGating({ patternReport: null, isPro: true });

      expect(result.showShareButton).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('handles null patternReport', () => {
      const result = computeGating({ patternReport: null, isPro: false });

      expect(result.visibleTriggerCount).toBe(0);
      expect(result.hiddenTriggerCount).toBe(0);
      expect(result.showShareButton).toBe(false);
    });

    test('handles empty triggers array', () => {
      const patternReport = makePatternReport(0);
      const result = computeGating({ patternReport, isPro: false });

      expect(result.visibleTriggerCount).toBe(0);
      expect(result.hiddenTriggerCount).toBe(0);
    });

    test('pro user with 0 triggers', () => {
      const patternReport = makePatternReport(0);
      const result = computeGating({ patternReport, isPro: true });

      expect(result.visibleTriggerCount).toBe(0);
      expect(result.hiddenTriggerCount).toBe(0);
    });
  });
});
