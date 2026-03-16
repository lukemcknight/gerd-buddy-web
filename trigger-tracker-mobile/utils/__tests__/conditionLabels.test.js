const {
  conditionNoun,
  conditionTriggerLabel,
  conditionHeading,
  conditionTagline,
  conditionAIContext,
} = require("../conditionLabels");

describe("conditionNoun", () => {
  it("returns 'acid reflux' for no conditions", () => {
    expect(conditionNoun(null)).toBe("acid reflux");
    expect(conditionNoun([])).toBe("acid reflux");
    expect(conditionNoun(undefined)).toBe("acid reflux");
  });

  it("returns 'acid reflux' for gerd only", () => {
    expect(conditionNoun(["gerd"])).toBe("acid reflux");
  });

  it("returns 'gastritis' for gastritis only", () => {
    expect(conditionNoun(["gastritis"])).toBe("gastritis");
  });

  it("returns 'digestive' for both conditions", () => {
    expect(conditionNoun(["gerd", "gastritis"])).toBe("digestive");
  });
});

describe("conditionTriggerLabel", () => {
  it("returns condition-specific trigger label", () => {
    expect(conditionTriggerLabel(["gerd"])).toBe("acid reflux triggers");
    expect(conditionTriggerLabel(["gastritis"])).toBe("gastritis triggers");
    expect(conditionTriggerLabel(["gerd", "gastritis"])).toBe("digestive triggers");
  });
});

describe("conditionHeading", () => {
  it("returns correct headings", () => {
    expect(conditionHeading([])).toBe("Acid Reflux / GERD");
    expect(conditionHeading(["gerd"])).toBe("Acid Reflux / GERD");
    expect(conditionHeading(["gastritis"])).toBe("Gastritis");
    expect(conditionHeading(["gerd", "gastritis"])).toBe("Acid Reflux & Gastritis");
  });
});

describe("conditionTagline", () => {
  it("returns correct taglines", () => {
    expect(conditionTagline([])).toBe("acid reflux & gastritis");
    expect(conditionTagline(["gerd"])).toBe("acid reflux");
    expect(conditionTagline(["gastritis"])).toBe("gastritis");
    expect(conditionTagline(["gerd", "gastritis"])).toBe("acid reflux & gastritis");
  });
});

describe("conditionAIContext", () => {
  it("returns GERD context by default", () => {
    const ctx = conditionAIContext([]);
    expect(ctx.focus).toContain("GERD");
    expect(ctx.categories).toContain("caffeine");
    expect(ctx.description).toContain("acid reflux");
  });

  it("returns gastritis context", () => {
    const ctx = conditionAIContext(["gastritis"]);
    expect(ctx.focus).toContain("gastritis");
    expect(ctx.categories).toContain("processed foods");
    expect(ctx.description).toContain("gastritis");
  });

  it("returns combined context for both", () => {
    const ctx = conditionAIContext(["gerd", "gastritis"]);
    expect(ctx.focus).toContain("acid reflux");
    expect(ctx.focus).toContain("gastritis");
    expect(ctx.categories).toContain("carbonation");
    expect(ctx.categories).toContain("processed foods");
  });
});
