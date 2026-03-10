import { useCallback, useMemo, useState } from "react";
import { Text, View, Share, Pressable, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FileText, Clock, TrendingDown, Calendar, Share2 } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import ProgressRing from "../components/ProgressRing";
import TriggerBadge from "../components/TriggerBadge";
import ProTeaser from "../components/ProTeaser";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { getMeals, getSymptoms, getDaysSinceStart, getUser } from "../services/storage";
import { generateTriggerReport } from "../utils/triggerEngine";
import { showToast } from "../utils/feedback";
import { usePremiumStatus } from "../hooks/usePremiumStatus";

export default function ReportScreen() {
  const [patternReport, setPatternReport] = useState(null);
  const [days, setDays] = useState(0);
  const [userId, setUserId] = useState(null);
  const { isPro, refreshStatus } = usePremiumStatus(userId);

  const loadData = useCallback(async () => {
    try {
      const [meals, symptoms, dayCount, user] = await Promise.all([
        getMeals(),
        getSymptoms(),
        getDaysSinceStart().then((d) => d + 1),
        getUser(),
      ]);
      if (user?.id) setUserId(user.id);
      setDays(dayCount);
      setPatternReport(generateTriggerReport(meals, symptoms));
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
      ? `My GERDBuddy pattern summary:\n\nTop repeating items:\n${patternReport.topTriggers
        .slice(0, 3)
        .map((t, i) => `${i + 1}. ${t.ingredient}`)
        .join("\n")}\n\nLate eating pattern: ${patternReport.lateEatingRisk}%\nTime window with more symptoms: ${patternReport.worstTimeOfDay
      }\n\nThese are personal tracking patterns, not medical advice.`
      : "I'm using GERDBuddy to track my GERD patterns.";
    try {
      await Share.share({ title: "My GERDBuddy Pattern Summary", message: text });
    } catch (error) {
      showToast("Unable to share", error.message);
    }
  };

  const progressPercent = Math.min((days / 7) * 100, 100);
  const isComplete = days >= 7;
  const sources = useMemo(
    () => [
      {
        title: "Mayo Clinic – Gastroesophageal Reflux Disease",
        url: "https://www.mayoclinic.org/diseases-conditions/gerd",
      },
      {
        title: "NIH / NIDDK – Acid Reflux",
        url: "https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults",
      },
      {
        title: "Cleveland Clinic – GERD",
        url: "https://my.clevelandclinic.org/health/diseases/9133-gerd",
      },
    ],
    []
  );

  const freeTriggerLimit = 1;
  const hiddenTriggerCount = !isPro && patternReport
    ? Math.max(0, Math.min(patternReport.topTriggers.length, 3) - freeTriggerLimit)
    : 0;

  return (
    <Screen contentClassName="gap-6">
      <Card className="p-6 items-center">
        <ProgressRing progress={progressPercent} size={100} strokeWidth={8}>
          <View className="items-center">
            <Text className="text-2xl font-bold text-primary">{Math.min(days, 7)}</Text>
            <Text className="text-sm text-muted-foreground">/7</Text>
          </View>
        </ProgressRing>
        <Text className="text-lg font-semibold mt-4">
          {isComplete ? "🎉 Pattern Review Ready" : `Day ${days} of 7`}
        </Text>
        <Text className="text-sm text-muted-foreground mt-1 text-center">
          {isComplete
            ? "Here's what your tracking data shows so far"
            : `Keep logging — ${7 - days} more days for a fuller picture`}
        </Text>
      </Card>

      <Card className="p-5 gap-4">
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <FileText size={20} color="#f07c52" />
            <Text className="text-lg font-semibold text-foreground">Your Patterns</Text>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            Based on what you've logged — these are correlations, not diagnoses. Share them with your doctor for context.
          </Text>
        </View>

        {patternReport ? (
          <>
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Items that appeared more often before symptoms</Text>
              {patternReport.topTriggers.length > 0 ? (
                <View className="gap-3">
                  {patternReport.topTriggers.slice(0, isPro ? 3 : freeTriggerLimit).map((trigger, index) => (
                    <TriggerBadge key={trigger.ingredient} trigger={trigger} rank={index + 1} showDetails={isPro} />
                  ))}
                  {hiddenTriggerCount > 0 && (
                    <ProTeaser
                      title={`See ${hiddenTriggerCount} more trigger${hiddenTriggerCount === 1 ? "" : "s"}`}
                      description="Unlock detailed trigger analysis and confidence scores."
                    />
                  )}
                </View>
              ) : (
                <Card className="p-5 items-center gap-3 bg-muted/50">
                  <Mascot size="small" />
                  <Text className="text-muted-foreground text-center">
                    Keep logging meals and symptoms. We will highlight patterns once they appear more
                    consistently.
                  </Text>
                </Card>
              )}
            </View>

            {isPro ? (
              <View className="flex-row flex-wrap gap-3">
                <Card className="p-4 basis-[48%]">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Clock size={16} color="#5f6f74" />
                    <Text className="text-xs font-medium text-muted-foreground">Late eating pattern</Text>
                  </View>
                  <Text className="text-2xl font-bold text-accent">{patternReport.lateEatingRisk}%</Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    Percentage of symptoms that followed meals logged after 8 PM.
                  </Text>
                </Card>
                <Card className="p-4 basis-[48%]">
                  <View className="flex-row items-center gap-2 mb-2">
                    <TrendingDown size={16} color="#5f6f74" />
                    <Text className="text-xs font-medium text-muted-foreground">Average intensity</Text>
                  </View>
                  <Text className="text-2xl font-bold text-foreground">{patternReport.avgSeverity}/5</Text>
                  <Text className="text-xs text-muted-foreground mt-1">From your symptom logs.</Text>
                </Card>
                <Card className="p-4 basis-[48%]">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Calendar size={16} color="#5f6f74" />
                    <Text className="text-xs font-medium text-muted-foreground">Symptom-free days</Text>
                  </View>
                  <Text className="text-2xl font-bold text-success">{patternReport.symptomFreeDays}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">Days without symptom entries.</Text>
                </Card>
                <Card className="p-4 basis-[48%]">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Clock size={16} color="#5f6f74" />
                    <Text className="text-xs font-medium text-muted-foreground">Common time window</Text>
                  </View>
                  <Text className="text-xl font-bold text-foreground">{patternReport.worstTimeOfDay}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    Time of day when symptoms appeared more frequently.
                  </Text>
                </Card>
              </View>
            ) : (
              <ProTeaser
                title="Unlock detailed analytics"
                description="See late eating patterns, average severity, symptom-free days, and your worst time windows."
              />
            )}

            <Card className="p-5 bg-muted/50">
              <Text className="font-semibold text-foreground mb-3">Pattern snapshot</Text>
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">• {patternReport.totalMeals} meals logged</Text>
                <Text className="text-sm text-muted-foreground">• {patternReport.totalSymptoms} symptom events recorded</Text>
                <Text className="text-sm text-muted-foreground">
                  • These are patterns in your data, not medical conclusions
                </Text>
              </View>
            </Card>
          </>
        ) : (
          <Card className="p-5 items-center gap-3 bg-muted/50">
            <Mascot size="small" />
            <Text className="text-muted-foreground text-center">
              Start logging meals and symptoms to see your patterns here. The more consistently you track, the more useful this report becomes.
            </Text>
          </Card>
        )}
      </Card>

      <Card className="p-5 gap-3">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-foreground">Understanding GERD Triggers</Text>
          <Text className="text-sm text-muted-foreground">
            GERD triggers can vary from person to person, which is what makes tracking them so important. Although there is common triggers such as tomatoes and chocolate, there can be less common triggers for certain people that are more unique to them. Understanding these triggers can help you live a better and more free life without constantly struggling with GERD.
          </Text>
        </View>

        <View className="gap-2 pt-2">
          <Text className="text-sm font-semibold text-foreground">Sources & Further Reading</Text>
          {sources.map((source) => (
            <Pressable
              key={source.url}
              onPress={() => Linking.openURL(source.url)}
              className="py-2"
            >
              <Text className="text-sm text-primary underline">{source.title}</Text>
            </Pressable>
          ))}
          <Text className="text-xs text-muted-foreground italic">
          </Text>
        </View>
      </Card>

      {isPro && patternReport && (
        <Button onPress={handleShare} variant="outline" className="w-full flex-row gap-2">
          <Share2 size={18} color="#1f2a30" />
          <Text className="text-foreground font-semibold">Share pattern summary</Text>
        </Button>
      )}

      <View className="items-center px-2 pb-2">
        <Text className="text-xs text-muted-foreground text-center leading-relaxed">
          GERDBuddy provides educational information only and does not provide medical advice,
          diagnosis, or treatment. Always consult a qualified healthcare provider with any medical
          concerns.
        </Text>
      </View>
    </Screen>
  );
}
