import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, Calendar, ClipboardList, Clock, Gauge, Send, Share2, ShieldCheck } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Screen from "../components/Screen";
import Card from "../components/Card";
import ProTeaser from "../components/ProTeaser";
import Button from "../components/Button";
import ProgressRing from "../components/ProgressRing";
import SeverityChart from "../components/SeverityChart";
import BrandMark from "../components/BrandMark";
import EvidenceBar from "../components/EvidenceBar";
import SectionHeader from "../components/SectionHeader";
import { getMeals, getSymptoms, getUser } from "../services/storage";
import { generateTriggerReport } from "../utils/triggerEngine";
import { getWeeklySeverity } from "../utils/severityChart";
import { calculateEvidenceProgress } from "../utils/evidenceProgress";
import { showToast } from "../utils/feedback";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { generateVisitPrepQuestions } from "../services/doctorAI";
import { buildVisitPrepHtml } from "../services/visitPrep";
import { EVENTS } from "../services/analytics";

const confidenceLabel = (c) => c > 0.7 ? "High" : c >= 0.5 ? "Medium" : "Low";

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const TriggerReportRow = ({ trigger }) => {
  const confidence = clampPercent(Math.round((trigger.confidence || 0) * 100));
  const symptomRate = clampPercent(trigger.symptomRate || 0);
  return (
    <View className="gap-2 rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-foreground capitalize">{trigger.ingredient}</Text>
        <View className="rounded-full border border-accent/20 bg-accent-light px-2 py-0.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-accent">
            {confidence}% conf
          </Text>
        </View>
      </View>
      <EvidenceBar
        label="Symptom rate"
        value={`${symptomRate}%`}
        percent={symptomRate}
        tone="symptom"
      />
    </View>
  );
};

const SafeFoodReportRow = ({ food }) => {
  const score = clampPercent(food.safetyScore || 0);
  return (
    <EvidenceBar
      label={food.ingredient}
      value={`${score}% safe`}
      percent={score}
      tone="primary"
    />
  );
};

const buildReportHtml = (report) => {
  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const triggerRows = report.topTriggers.length > 0
    ? report.topTriggers.map((t, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td>${t.ingredient}</td>
          <td>${t.symptomRate}%</td>
          <td>${t.avgSeverity}/5</td>
          <td>${confidenceLabel(t.confidence)}</td>
          <td>${t.totalOccurrences}</td>
        </tr>`).join("")
    : '<tr><td colspan="5" style="text-align:center;color:#888;">No triggers identified yet</td></tr>';

  const safeRows = report.safeFoods.length > 0
    ? report.safeFoods.map((f, i) => `
        <tr class="${i % 2 ? "alt" : ""}">
          <td>${f.ingredient}</td>
          <td>${f.safetyScore}%</td>
          <td>${f.totalOccurrences}</td>
          <td>${f.symptomFreeOccurrences}</td>
        </tr>`).join("")
    : '<tr><td colspan="4" style="text-align:center;color:#888;">Not enough data yet</td></tr>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 32px; color: #1b1c1c; background: #fcf9f8; }
  h1 { font-size: 22px; color: #154212; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #154212; padding-bottom: 4px; }
  .meta { font-size: 12px; color: #72796e; margin-bottom: 24px; }
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
  <h1>GERD Buddy Health Report</h1>
  <p class="meta">Generated ${date}</p>

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

export default function ReportScreen() {
  const [patternReport, setPatternReport] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [weeklySeverity, setWeeklySeverity] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isGeneratingVisitPrep, setIsGeneratingVisitPrep] = useState(false);
  const { isPro, refreshStatus } = usePremiumStatus(userId);
  const posthog = usePostHog();

  const loadData = useCallback(async () => {
    try {
      const [meals, symptoms, user] = await Promise.all([
        getMeals(), getSymptoms(), getUser(),
      ]);
      if (user?.id) setUserId(user.id);
      const report = generateTriggerReport(meals, symptoms);
      setPatternReport(report);
      setEvidence(calculateEvidenceProgress({
        user,
        meals,
        symptoms,
        triggers: report.topTriggers,
      }));
      setWeeklySeverity(getWeeklySeverity(symptoms));
    } catch (error) {
      console.warn("Failed to load report data", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshStatus();
    }, [loadData, refreshStatus])
  );

  const handleShare = async () => {
    const text = patternReport
      ? `My GERDBuddy patterns:\n\n${patternReport.topTriggers
          .slice(0, 3)
          .map((t, i) => `${i + 1}. ${t.ingredient}`)
          .join("\n")}\n\nAvg severity: ${patternReport.avgSeverity}/5\nSymptom-free days: ${patternReport.symptomFreeDays}`
      : "I'm using GERDBuddy to track my digestive health.";
    try {
      await Share.share({ title: "My GERDBuddy Patterns", message: text });
    } catch (error) {
      showToast("Unable to share", error.message);
    }
  };

  const handleSharePDF = async () => {
    if (!patternReport) return;
    try {
      const html = buildReportHtml(patternReport);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share GERD Buddy Report",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      showToast("Unable to generate PDF", error.message);
    }
  };

  const handleVisitPrep = async () => {
    if (!patternReport || isGeneratingVisitPrep) return;
    setIsGeneratingVisitPrep(true);
    try {
      const visitPrep = await generateVisitPrepQuestions({
        topTriggers: patternReport.topTriggers,
        safeFoods: patternReport.safeFoods,
        avgSeverity: patternReport.avgSeverity,
        lateEatingRisk: patternReport.lateEatingRisk,
        worstTimeOfDay: patternReport.worstTimeOfDay,
        symptomFreeDays: patternReport.symptomFreeDays,
        totalMeals: patternReport.totalMeals,
        totalSymptoms: patternReport.totalSymptoms,
      });
      posthog?.capture(EVENTS.VISIT_PREP_GENERATED, {
        question_count: visitPrep.questions.length,
        trend_count: visitPrep.concerningTrends.length,
      });
      const html = buildVisitPrepHtml(
        patternReport,
        visitPrep.questions,
        visitPrep.concerningTrends
      );
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "GI Visit Prep",
        UTI: "com.adobe.pdf",
      });
      posthog?.capture(EVENTS.VISIT_PREP_SHARED);
    } catch (error) {
      showToast("Unable to generate visit prep", error.message);
    } finally {
      setIsGeneratingVisitPrep(false);
    }
  };

  if (!patternReport) {
    return (
      <Screen contentClassName="justify-center gap-4">
        <Card
          className="p-8 items-center gap-4 bg-muted"
          style={{ borderStyle: "dashed", borderWidth: 2 }}
        >
          <BrandMark variant="dark" size={72} />
          <View className="items-center gap-1">
            <Text className="text-base font-semibold text-foreground">Report preview is empty</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Log meals and symptoms to build doctor-ready evidence.
            </Text>
          </View>
        </Card>
      </Screen>
    );
  }

  const visibleTriggers = isPro
    ? patternReport.topTriggers.slice(0, 3)
    : patternReport.topTriggers.slice(0, 1);
  const hiddenTriggerCount = isPro
    ? 0
    : Math.max(0, Math.min(patternReport.topTriggers.length, 3) - 1);
  const visibleSafeFoods = patternReport.safeFoods.slice(0, 3);

  return (
    <Screen contentClassName="gap-5">
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Doctor-ready
          </Text>
          <Text className="text-3xl font-bold text-primary mt-1">Report</Text>
        </View>
        <View className="rounded-full border border-border bg-card px-3 py-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            PDF export
          </Text>
        </View>
      </View>

      {evidence && (
        <Card className="p-4 gap-5">
          <View>
            <Text className="text-lg font-bold text-foreground">Report readiness</Text>
            <Text className="text-sm text-muted-foreground mt-1">
              A compact preview of trigger evidence, safe foods, timing, and symptom trends.
            </Text>
          </View>
          <View className="flex-row items-center gap-4">
            <ProgressRing
              progress={evidence.reportReadiness}
              size={118}
              strokeWidth={9}
              color="#154212"
            >
              <Text className="text-3xl font-bold text-primary">{evidence.reportReadiness}%</Text>
              <Text className="text-[10px] uppercase tracking-wider text-muted-foreground">ready</Text>
            </ProgressRing>
            <View className="flex-1 gap-3">
              <View className="self-start rounded-full bg-primary-light px-3 py-1 border border-primary/10">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Day {evidence.dayProgress}/14
                </Text>
              </View>
              <EvidenceBar
                label="Meals"
                value={`${evidence.mealProgress}/${evidence.targets.meals}`}
                percent={evidence.mealPercent}
              />
              <EvidenceBar
                label="Symptoms"
                value={`${evidence.symptomProgress}/${evidence.targets.symptoms}`}
                percent={evidence.symptomPercent}
                tone="symptom"
              />
            </View>
          </View>
        </Card>
      )}

      {/* Overview counts */}
      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-foreground">{patternReport.totalMeals}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Meals</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-accent">{patternReport.totalSymptoms}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Symptoms</Text>
        </Card>
      </View>

      <Card className="p-4 gap-4">
        <SectionHeader
          icon={AlertTriangle}
          tone="gold"
          title="Trigger evidence"
          subtitle="Top patterns"
        />
        {visibleTriggers.length > 0 ? (
          visibleTriggers.map((trigger) => (
            <TriggerReportRow key={trigger.ingredient} trigger={trigger} />
          ))
        ) : (
          <View className="h-16 rounded-xl bg-muted items-center justify-center">
            <Text className="text-xs text-muted-foreground">No trigger pattern yet</Text>
          </View>
        )}
        {hiddenTriggerCount > 0 && (
          <ProTeaser
            title={`Unlock ${hiddenTriggerCount} more patterns`}
            description="See the full doctor report preview."
          />
        )}
      </Card>

      {visibleSafeFoods.length > 0 && (
        <Card className="p-4 gap-4">
          <SectionHeader
            icon={ShieldCheck}
            tone="primary"
            title="Likely safe foods"
            subtitle="Low-symptom meals"
          />
          {visibleSafeFoods.map((food) => (
            <SafeFoodReportRow key={food.ingredient} food={food} />
          ))}
        </Card>
      )}

      <SeverityChart data={weeklySeverity} />

      {/* Stats grid */}
      {isPro ? (
        <View className="flex-row flex-wrap gap-3">
          <Card className="p-4 basis-[48%] items-center">
            <Clock size={20} color="#b94f3a" strokeWidth={2} />
            <Text className="text-2xl font-bold text-accent mt-1">{patternReport.lateEatingRisk}%</Text>
            <Text className="text-xs text-muted-foreground mt-1">Late eating</Text>
          </Card>
          <Card className="p-4 basis-[48%] items-center">
            <Gauge size={20} color="#2f3a3d" strokeWidth={2} />
            <Text className="text-2xl font-bold text-foreground mt-1">{patternReport.avgSeverity}/5</Text>
            <Text className="text-xs text-muted-foreground mt-1">Avg severity</Text>
          </Card>
          <Card className="p-4 basis-[48%] items-center">
            <Calendar size={20} color="#315f43" strokeWidth={2} />
            <Text className="text-2xl font-bold text-success mt-1">{patternReport.symptomFreeDays}</Text>
            <Text className="text-xs text-muted-foreground mt-1">Symptom-free days</Text>
          </Card>
          <Card className="p-4 basis-[48%] items-center">
            <Clock size={20} color="#90611c" strokeWidth={2} />
            <Text className="text-xl font-bold text-foreground mt-1">{patternReport.worstTimeOfDay}</Text>
            <Text className="text-xs text-muted-foreground mt-1">Peak symptom time</Text>
          </Card>
        </View>
      ) : (
        <ProTeaser
          title="Unlock analytics"
          description="See severity trends, timing patterns, and symptom-free days."
        />
      )}

      {isPro && (
        <View className="gap-3">
          <Button
            onPress={handleVisitPrep}
            variant="primary"
            disabled={isGeneratingVisitPrep}
            className="w-full flex-row gap-2"
          >
            {isGeneratingVisitPrep ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ClipboardList size={18} color="#ffffff" strokeWidth={2.2} />
            )}
            <Text className="text-white font-semibold">
              {isGeneratingVisitPrep ? "Preparing visit packet…" : "Generate GI Visit Prep"}
            </Text>
          </Button>
          <Button onPress={handleSharePDF} variant="outline" className="w-full flex-row gap-2">
            <Send size={18} color="#1f2a30" strokeWidth={2.2} />
            <Text className="text-foreground font-semibold">Share basic report</Text>
          </Button>
          <Button onPress={handleShare} variant="outline" className="w-full flex-row gap-2">
            <Share2 size={18} color="#1f2a30" />
            <Text className="text-foreground font-semibold">Share as Text</Text>
          </Button>
        </View>
      )}

      <Text className="text-[10px] text-muted-foreground text-center">
        Patterns, not diagnoses. Consult your doctor.
      </Text>
    </Screen>
  );
}
