const {
  mapToTrafficLight,
  extractReasonTags,
  getSaferSwaps,
  enhanceScanResult,
} = require("../scannerAdapter");

describe("mapToTrafficLight", () => {
  it("maps Low label to Likely Safe", () => {
    expect(mapToTrafficLight("Low", 1)).toBe("Likely Safe");
    expect(mapToTrafficLight("Low", 2)).toBe("Likely Safe");
  });

  it("maps High label to Likely Trigger", () => {
    expect(mapToTrafficLight("High", 4)).toBe("Likely Trigger");
    expect(mapToTrafficLight("High", 5)).toBe("Likely Trigger");
  });

  it("maps Moderate label to Caution", () => {
    expect(mapToTrafficLight("Moderate", 3)).toBe("Caution");
  });

  it("uses score as fallback when label is ambiguous", () => {
    expect(mapToTrafficLight("Moderate", 1)).toBe("Likely Safe");
    expect(mapToTrafficLight("Moderate", 5)).toBe("Likely Trigger");
  });
});

describe("extractReasonTags", () => {
  it("extracts tags from reasons text", () => {
    const result = {
      score: 4,
      label: "High",
      confidence: 0.8,
      reasons: ["This meal contains high-fat content and spicy ingredients"],
      suggestions: ["Try grilled instead of fried"],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("high-fat");
    expect(tags).toContain("spicy");
    expect(tags).toContain("fried");
  });

  it("detects caffeine", () => {
    const result = {
      score: 3,
      label: "Moderate",
      confidence: 0.7,
      reasons: ["Contains caffeine from coffee"],
      suggestions: [],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("caffeine");
  });

  it("detects personal triggers", () => {
    const result = {
      score: 4,
      label: "High",
      confidence: 0.8,
      reasons: ["Known trigger"],
      suggestions: [],
      personalTriggerMatch: ["chocolate"],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("personal-trigger");
  });

  it("returns empty array for neutral results", () => {
    const result = {
      score: 1,
      label: "Low",
      confidence: 0.9,
      reasons: ["This looks safe to eat"],
      suggestions: [],
    };

    const tags = extractReasonTags(result);
    expect(tags.length).toBe(0);
  });
});

describe("getSaferSwaps", () => {
  it("returns max 3 swaps", () => {
    const tags = ["acidic", "spicy", "high-fat", "caffeine"];
    const swaps = getSaferSwaps(tags, 3);
    expect(swaps.length).toBeLessThanOrEqual(3);
  });

  it("returns swaps for known tags", () => {
    const swaps = getSaferSwaps(["caffeine"]);
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps[0].original).toBeTruthy();
    expect(swaps[0].suggestion).toBeTruthy();
    expect(swaps[0].reason).toBeTruthy();
  });

  it("returns empty array for no tags", () => {
    const swaps = getSaferSwaps([]);
    expect(swaps).toEqual([]);
  });

  it("skips personal-trigger tag", () => {
    const swaps = getSaferSwaps(["personal-trigger"]);
    expect(swaps).toEqual([]);
  });

  it("avoids duplicate suggestions", () => {
    const swaps = getSaferSwaps(["acidic", "citrus"]); // both may suggest non-acidic fruit
    const suggestions = swaps.map((s) => s.suggestion);
    const unique = new Set(suggestions);
    expect(suggestions.length).toBe(unique.size);
  });
});

describe("enhanceScanResult", () => {
  it("enhances a low-risk result correctly", () => {
    const result = {
      score: 1,
      label: "Low",
      confidence: 0.9,
      reasons: ["Plain rice is generally safe"],
      suggestions: ["Keep portions moderate"],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.trafficLight).toBe("Likely Safe");
    expect(enhanced.saferSwaps).toEqual([]); // No swaps for safe food
    expect(enhanced.score).toBe(1);
    expect(enhanced.reasons).toEqual(result.reasons);
  });

  it("enhances a high-risk result with swaps", () => {
    const result = {
      score: 5,
      label: "High",
      confidence: 0.9,
      reasons: ["Very spicy and acidic dish with fried elements"],
      suggestions: ["Avoid this meal"],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.trafficLight).toBe("Likely Trigger");
    expect(enhanced.reasonTags.length).toBeGreaterThan(0);
    expect(enhanced.saferSwaps.length).toBeGreaterThan(0);
    expect(enhanced.saferSwaps.length).toBeLessThanOrEqual(3);
  });

  it("preserves all original fields", () => {
    const result = {
      score: 3,
      label: "Moderate",
      confidence: 0.6,
      reasons: ["Moderate risk"],
      suggestions: ["Be careful"],
      personalTriggerMatch: ["onion"],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.score).toBe(3);
    expect(enhanced.label).toBe("Moderate");
    expect(enhanced.confidence).toBe(0.6);
    expect(enhanced.personalTriggerMatch).toEqual(["onion"]);
  });
});
