const {
  calculateEvidenceProgress,
  EVIDENCE_TARGETS,
} = require("../evidenceProgress");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-05-21T12:00:00Z").getTime();

const makeItems = (count) =>
  Array.from({ length: count }, (_, index) => ({ id: `item-${index}` }));

describe("calculateEvidenceProgress", () => {
  it("handles empty data and missing user", () => {
    const result = calculateEvidenceProgress({ now: NOW });

    expect(result.dayProgress).toBe(1);
    expect(result.dayPercent).toBe(7);
    expect(result.mealProgress).toBe(0);
    expect(result.symptomProgress).toBe(0);
    expect(result.triggerProgress).toBe(0);
    expect(result.reportReadiness).toBe(2);
  });

  it("computes partial progress from existing logs", () => {
    const result = calculateEvidenceProgress({
      user: { startDate: NOW - 6 * DAY_MS },
      meals: makeItems(14),
      symptoms: makeItems(4),
      triggers: makeItems(2),
      now: NOW,
    });

    expect(result.dayProgress).toBe(7);
    expect(result.mealPercent).toBe(50);
    expect(result.symptomPercent).toBe(50);
    expect(result.triggerPercent).toBe(50);
    expect(result.reportReadiness).toBe(50);
  });

  it("reaches 100 percent at the 14-day evidence target", () => {
    const result = calculateEvidenceProgress({
      user: { startDate: NOW - 13 * DAY_MS },
      meals: makeItems(EVIDENCE_TARGETS.meals),
      symptoms: makeItems(EVIDENCE_TARGETS.symptoms),
      triggers: makeItems(EVIDENCE_TARGETS.triggers),
      now: NOW,
    });

    expect(result.dayProgress).toBe(14);
    expect(result.mealPercent).toBe(100);
    expect(result.symptomPercent).toBe(100);
    expect(result.triggerPercent).toBe(100);
    expect(result.reportReadiness).toBe(100);
  });

  it("clamps progress above target while keeping raw counts", () => {
    const result = calculateEvidenceProgress({
      user: { startDate: NOW - 40 * DAY_MS },
      meals: makeItems(35),
      symptoms: makeItems(12),
      triggers: makeItems(6),
      now: NOW,
    });

    expect(result.dayProgress).toBe(14);
    expect(result.mealCount).toBe(35);
    expect(result.mealProgress).toBe(28);
    expect(result.symptomCount).toBe(12);
    expect(result.symptomProgress).toBe(8);
    expect(result.triggerCount).toBe(6);
    expect(result.triggerProgress).toBe(4);
    expect(result.reportReadiness).toBe(100);
  });

  it("falls back to createdAt when startDate is missing", () => {
    const result = calculateEvidenceProgress({
      user: { createdAt: NOW - 2 * DAY_MS },
      now: NOW,
    });

    expect(result.dayProgress).toBe(3);
  });
});
