// Visit Prep PDF builder. Stylistically identical to buildReportHtml in
// screens/ReportScreen.js — same fonts, palette, footer — with two new
// sections prepended ("Questions to ask your GI" + "Trends worth raising")
// produced by services/doctorAI.ts:generateVisitPrepQuestions.

type TriggerRow = {
  ingredient: string;
  symptomRate: number;
  avgSeverity: number;
  confidence: number;
  totalOccurrences: number;
};

type SafeFoodRow = {
  ingredient: string;
  safetyScore: number;
  totalOccurrences: number;
  symptomFreeOccurrences: number;
};

export type PatternReportLike = {
  generatedAt: number;
  totalMeals: number;
  totalSymptoms: number;
  avgSeverity: number;
  symptomFreeDays: number;
  topTriggers: TriggerRow[];
  safeFoods: SafeFoodRow[];
  lateEatingRisk?: number;
  worstTimeOfDay?: string;
};

const confidenceLabel = (c: number): string => {
  if (c >= 0.75) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
};

const escape = (text: string): string =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const buildVisitPrepHtml = (
  report: PatternReportLike,
  aiQuestions: string[],
  aiTrends: string[]
): string => {
  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const questionsList = aiQuestions.length
    ? aiQuestions.map((q) => `<li>${escape(q)}</li>`).join("")
    : '<li style="color:#888;">No personalized questions generated.</li>';

  const trendsSection = aiTrends.length
    ? `<h2>Trends worth raising</h2>
       <ul class="trends">
         ${aiTrends.map((t) => `<li>${escape(t)}</li>`).join("")}
       </ul>`
    : "";

  const triggerRows = report.topTriggers.length > 0
    ? report.topTriggers
        .map(
          (t, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td>${escape(t.ingredient)}</td>
          <td>${t.symptomRate}%</td>
          <td>${t.avgSeverity}/5</td>
          <td>${confidenceLabel(t.confidence)}</td>
          <td>${t.totalOccurrences}</td>
        </tr>`
        )
        .join("")
    : '<tr><td colspan="5" style="text-align:center;color:#888;">No triggers identified yet</td></tr>';

  const safeRows = report.safeFoods.length > 0
    ? report.safeFoods
        .map(
          (f, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td>${escape(f.ingredient)}</td>
          <td>${f.safetyScore}%</td>
          <td>${f.totalOccurrences}</td>
          <td>${f.symptomFreeOccurrences}</td>
        </tr>`
        )
        .join("")
    : '<tr><td colspan="4" style="text-align:center;color:#888;">Not enough data yet</td></tr>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #1b1c1c; background: #fcf9f8; }
  h1 { font-size: 22px; color: #154212; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #154212; padding-bottom: 4px; }
  .meta { font-size: 12px; color: #72796e; margin-bottom: 24px; }
  .intro { font-size: 13px; color: #1b1c1c; background: #ecf5e9; border: 1px solid #cfdcca; border-radius: 8px; padding: 12px 16px; margin-top: 12px; }
  ol.questions { padding-left: 22px; margin-top: 8px; }
  ol.questions li { margin-bottom: 8px; font-size: 14px; line-height: 1.45; }
  ul.trends { padding-left: 22px; margin-top: 8px; }
  ul.trends li { margin-bottom: 6px; font-size: 13px; color: #774400; line-height: 1.45; }
  .ai-disclaimer { font-size: 11px; color: #72796e; margin-top: 10px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th { background: #154212; color: #fff; text-align: left; padding: 8px; }
  td { padding: 8px; border-bottom: 1px solid #e5e2d9; }
  tr.alt { background: #f0eded; }
  .overview { display: flex; gap: 16px; margin-top: 8px; }
  .stat { flex: 1; background: #ffffff; border: 1px solid #e5e2d9; border-radius: 10px; padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: bold; }
  .stat-label { font-size: 11px; color: #72796e; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 10px; color: #72796e; text-align: center; border-top: 1px solid #e5e2d9; padding-top: 12px; }
</style></head>
<body>
  <h1>GERD Buddy — GI Visit Prep</h1>
  <p class="meta">Generated ${date}</p>

  <div class="intro">
    This packet was generated from the patient's tracked meals, symptoms, and
    detected patterns over their logging history. It is intended as a starting
    point for discussion, not a diagnosis.
  </div>

  <h2>Questions to ask your GI</h2>
  <ol class="questions">
    ${questionsList}
  </ol>
  <p class="ai-disclaimer">
    These suggestions are based on the patient's tracked data and are not medical
    advice — bring them as a starting point for discussion.
  </p>

  ${trendsSection}

  <h2>Overview</h2>
  <div class="overview">
    <div class="stat"><div class="stat-value">${report.totalMeals}</div><div class="stat-label">Meals Logged</div></div>
    <div class="stat"><div class="stat-value">${report.totalSymptoms}</div><div class="stat-label">Symptoms</div></div>
    <div class="stat"><div class="stat-value">${report.avgSeverity}/5</div><div class="stat-label">Avg Severity</div></div>
    <div class="stat"><div class="stat-value">${report.symptomFreeDays}</div><div class="stat-label">Symptom-Free Days</div></div>
  </div>

  <h2>Top Triggers</h2>
  <table>
    <tr><th>Food</th><th>Symptom Rate</th><th>Avg Severity</th><th>Confidence</th><th>Times Eaten</th></tr>
    ${triggerRows}
  </table>

  <h2>Safe Foods</h2>
  <table>
    <tr><th>Food</th><th>Safety Score</th><th>Times Eaten</th><th>Symptom-Free</th></tr>
    ${safeRows}
  </table>

  <div class="footer">Generated by GERD Buddy. This is not a medical diagnosis. Please consult your doctor.</div>
</body>
</html>`;
};
