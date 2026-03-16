const {
  mapToTrafficLight,
  extractReasonTags,
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
      detectedFoods: [],
      reasons: ["This meal contains high-fat content and spicy ingredients"],
      suggestions: ["Try grilled instead of fried"],
      saferSwaps: [],
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
      detectedFoods: [],
      reasons: ["Contains caffeine from coffee"],
      suggestions: [],
      saferSwaps: [],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("caffeine");
  });

  it("detects personal triggers", () => {
    const result = {
      score: 4,
      label: "High",
      confidence: 0.8,
      detectedFoods: [],
      reasons: ["Known trigger"],
      suggestions: [],
      saferSwaps: [],
      personalTriggerMatch: ["chocolate"],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("personal-trigger");
  });

  it("extracts tags from detectedFoods", () => {
    const result = {
      score: 3,
      label: "Moderate",
      confidence: 0.7,
      detectedFoods: ["coffee", "chocolate cake"],
      reasons: ["Moderate risk"],
      suggestions: [],
      saferSwaps: [],
    };

    const tags = extractReasonTags(result);
    expect(tags).toContain("caffeine");
    expect(tags).toContain("chocolate");
  });

  it("returns empty array for neutral results", () => {
    const result = {
      score: 1,
      label: "Low",
      confidence: 0.9,
      detectedFoods: ["plain rice"],
      reasons: ["This looks safe to eat"],
      suggestions: [],
      saferSwaps: [],
    };

    const tags = extractReasonTags(result);
    expect(tags.length).toBe(0);
  });
});

describe("enhanceScanResult", () => {
  it("enhances a low-risk result correctly", () => {
    const result = {
      score: 1,
      label: "Low",
      confidence: 0.9,
      detectedFoods: ["plain rice"],
      reasons: ["Plain rice is generally safe"],
      suggestions: ["Keep portions moderate"],
      saferSwaps: [],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.trafficLight).toBe("Likely Safe");
    expect(enhanced.saferSwaps).toEqual([]);
    expect(enhanced.detectedFoods).toEqual(["plain rice"]);
    expect(enhanced.score).toBe(1);
    expect(enhanced.reasons).toEqual(result.reasons);
  });

  it("enhances a high-risk result with AI swaps", () => {
    const result = {
      score: 5,
      label: "High",
      confidence: 0.9,
      detectedFoods: ["fried chicken", "hot sauce"],
      reasons: ["Very spicy and acidic dish with fried elements"],
      suggestions: ["Avoid this meal"],
      saferSwaps: [
        { original: "Fried chicken", suggestion: "Grilled chicken", reason: "Less fat" },
        { original: "Hot sauce", suggestion: "Herbs", reason: "No capsaicin" },
      ],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.trafficLight).toBe("Likely Trigger");
    expect(enhanced.reasonTags.length).toBeGreaterThan(0);
    expect(enhanced.saferSwaps.length).toBe(2);
    expect(enhanced.saferSwaps[0].suggestion).toBe("Grilled chicken");
  });

  it("does not include swaps for safe foods even if AI provided them", () => {
    const result = {
      score: 1,
      label: "Low",
      confidence: 0.9,
      detectedFoods: ["banana"],
      reasons: ["Safe fruit"],
      suggestions: [],
      saferSwaps: [
        { original: "Banana", suggestion: "Apple", reason: "Variety" },
      ],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.trafficLight).toBe("Likely Safe");
    expect(enhanced.saferSwaps).toEqual([]);
  });

  it("preserves all original fields", () => {
    const result = {
      score: 3,
      label: "Moderate",
      confidence: 0.6,
      detectedFoods: ["pasta", "garlic bread"],
      reasons: ["Moderate risk"],
      suggestions: ["Be careful"],
      saferSwaps: [],
      personalTriggerMatch: ["onion"],
    };

    const enhanced = enhanceScanResult(result);
    expect(enhanced.score).toBe(3);
    expect(enhanced.label).toBe("Moderate");
    expect(enhanced.confidence).toBe(0.6);
    expect(enhanced.detectedFoods).toEqual(["pasta", "garlic bread"]);
    expect(enhanced.personalTriggerMatch).toEqual(["onion"]);
  });
});
