import { useCallback, useMemo, useState } from "react";
import { Text, View, Share, Pressable, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { FileText, Clock, TrendingDown, Calendar, Share2 } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import ProgressRing from "../components/ProgressRing";
import TriggerBadge from "../components/TriggerBadge";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { getMeals, getSymptoms, getDaysSinceStart } from "../services/storage";
import { generateTriggerReport } from "../utils/triggerEngine";
import { showToast } from "../utils/feedback";

export default function ReportScreen() {
  const [patternReport, setPatternReport] = useState(null);
  const [days, setDays] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const meals = await getMeals();
      const symptoms = await getSymptoms();
      const dayCount = (await getDaysSinceStart()) + 1;
      setDays(dayCount);
      setPatternReport(generateTriggerReport(meals, symptoms));
    } catch (error) {
      console.warn("Failed to load report data", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleShare = async () => {
    const text = patternReport
      ? `My GERDBuddy pattern summary:\n\nTop repeating items:\n${patternReport.topTriggers
          .slice(0, 3)
          .map((t, i) => `${i + 1}. ${t.ingredient}`)
          .join("\n")}\n\nLate eating pattern: ${patternReport.lateEatingRisk}%\nTime window with more symptoms: ${
          patternReport.worstTimeOfDay
        }\n\nObservations are AI-assisted pattern analysis only, not medical advice.`
      : "Check out GERDBuddy for gentle reflux pattern spotting.";
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
            ? "Your AI-assisted pattern review is ready"
            : `${7 - days} more days until your full review`}
        </Text>
      </Card>

      <Card className="p-5 gap-4">
        <View className="gap-1">
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Section A</Text>
          <View className="flex-row items-center gap-2">
            <FileText size={20} color="#f07c52" />
            <Text className="text-lg font-semibold text-foreground">AI-Detected Patterns</Text>
          </View>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            These observations are generated using AI-assisted pattern analysis of your personal logs
            and are not medical advice.
          </Text>
        </View>

        {patternReport ? (
          <>
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Items that appeared more often before symptoms</Text>
              {patternReport.topTriggers.length > 0 ? (
                <View className="gap-3">
                  {patternReport.topTriggers.slice(0, 3).map((trigger, index) => (
                    <TriggerBadge key={trigger.ingredient} trigger={trigger} rank={index + 1} />
                  ))}
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

            <Card className="p-5 bg-muted/50">
              <Text className="font-semibold text-foreground mb-3">Pattern snapshot</Text>
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">• {patternReport.totalMeals} meals logged</Text>
                <Text className="text-sm text-muted-foreground">• {patternReport.totalSymptoms} symptom events recorded</Text>
                <Text className="text-sm text-muted-foreground">
                  • Observations highlight correlations only. They do not explain causes or offer treatment.
                </Text>
              </View>
            </Card>
          </>
        ) : (
          <Card className="p-5 items-center gap-3 bg-muted/50">
            <Mascot size="small" />
            <Text className="text-muted-foreground text-center">
              Start logging meals and symptoms. AI-assisted pattern spotting begins once entries are available.
            </Text>
          </Card>
        )}
      </Card>

      <Card className="p-5 gap-3">
        <View className="gap-1">
          <Text className="text-xs font-semibold text-muted-foreground uppercase">Section B</Text>
          <Text className="text-lg font-semibold text-foreground">Educational Information (Medical Sources)</Text>
          <Text className="text-sm text-muted-foreground">
            Learn about common GERD-related factors. This content is static and sourced from reputable medical organizations.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="text-sm text-foreground">Common factors</Text>
          <Text className="text-sm text-muted-foreground">
            • Acidic items such as citrus fruits, tomatoes, and vinegar can be irritating for some people.
          </Text>
          <Text className="text-sm text-muted-foreground">
            • Fatty or fried meals may relax the lower esophageal sphincter and allow more reflux.
          </Text>
          <Text className="text-sm text-muted-foreground">
            • Eating late at night or lying down soon after meals can make reflux episodes more noticeable.
          </Text>
          <Text className="text-sm text-muted-foreground">
            • Carbonated drinks, caffeine, chocolate, peppermint, and alcohol sometimes coincide with heartburn.
          </Text>
        </View>

        <View className="gap-2 pt-2">
          <Text className="text-sm font-semibold text-foreground">Sources</Text>
          {sources.map((source) => (
            <Pressable
              key={source.url}
              onPress={() => Linking.openURL(source.url)}
              className="py-2"
            >
              <Text className="text-sm text-primary underline">{source.title}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {patternReport && (
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
