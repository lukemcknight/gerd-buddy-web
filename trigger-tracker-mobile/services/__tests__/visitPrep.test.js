const { buildVisitPrepHtml } = require("../visitPrep");

const baseReport = {
  generatedAt: new Date("2026-05-24T12:00:00Z").getTime(),
  totalMeals: 28,
  totalSymptoms: 8,
  avgSeverity: 3.2,
  symptomFreeDays: 4,
  topTriggers: [
    { ingredient: "tomato sauce", symptomRate: 75, avgSeverity: 3.4, confidence: 0.8, totalOccurrences: 8 },
  ],
  safeFoods: [
    { ingredient: "rice", safetyScore: 92, totalOccurrences: 12, symptomFreeOccurrences: 11 },
  ],
};

describe("buildVisitPrepHtml", () => {
  it("renders the AI questions in an ordered list", () => {
    const html = buildVisitPrepHtml(
      baseReport,
      ["Should I test for H. pylori?", "Is my severity trend concerning?", "Try elimination diet?"],
      []
    );
    expect(html).toContain("Questions to ask your GI");
    expect(html).toContain("Should I test for H. pylori?");
    expect(html).toContain("Try elimination diet?");
  });

  it("renders concerning trends when present, omits the section when empty", () => {
    const withTrends = buildVisitPrepHtml(baseReport, ["Q1", "Q2", "Q3"], [
      "Severity rose from 2.1 to 3.4 over 14 days",
    ]);
    expect(withTrends).toContain("Trends worth raising");
    expect(withTrends).toContain("Severity rose from 2.1 to 3.4 over 14 days");

    const noTrends = buildVisitPrepHtml(baseReport, ["Q1", "Q2", "Q3"], []);
    expect(noTrends).not.toContain("Trends worth raising");
  });

  it("preserves the existing report sections (Overview, Top Triggers, Safe Foods)", () => {
    const html = buildVisitPrepHtml(baseReport, ["Q1", "Q2", "Q3"], []);
    expect(html).toContain("Overview");
    expect(html).toContain("Top Triggers");
    expect(html).toContain("Safe Foods");
    expect(html).toContain("tomato sauce");
    expect(html).toContain("rice");
    expect(html).toContain("28"); // totalMeals
  });

  it("includes the medical disclaimer footer and the AI-suggestions disclaimer", () => {
    const html = buildVisitPrepHtml(baseReport, ["Q1", "Q2", "Q3"], []);
    expect(html).toContain("not a medical diagnosis");
    expect(html).toContain("These suggestions are based on the patient's tracked data");
  });

  it("escapes HTML in dynamic content to prevent injection", () => {
    const reportWithHtml = {
      ...baseReport,
      topTriggers: [
        {
          ingredient: "<script>alert(1)</script>",
          symptomRate: 50,
          avgSeverity: 2,
          confidence: 0.5,
          totalOccurrences: 3,
        },
      ],
    };
    const html = buildVisitPrepHtml(reportWithHtml, ["A & B <script>"], []);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("A &amp; B &lt;script&gt;");
  });

  it("handles the fallback case when no triggers/safe foods exist", () => {
    const empty = { ...baseReport, topTriggers: [], safeFoods: [] };
    const html = buildVisitPrepHtml(empty, ["Q1", "Q2", "Q3"], []);
    expect(html).toContain("No triggers identified yet");
    expect(html).toContain("Not enough data yet");
  });
});
