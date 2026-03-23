import { useCallback, useState } from "react";
import { Image, Text, View, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Clock, TrendingDown, Calendar, Share2 } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import { getMeals, getSymptoms, getUser } from "../services/storage";
import { generateTriggerReport } from "../utils/triggerEngine";
import { showToast } from "../utils/feedback";

const turtleSad = require("../assets/mascot/turtle_sad.png");

export default function ReportScreen() {
  const [patternReport, setPatternReport] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [meals, symptoms] = await Promise.all([
        getMeals(), getSymptoms(), getUser(),
      ]);
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

  if (!patternReport) {
    return (
      <Screen contentClassName="items-center justify-center gap-4">
        <Image source={turtleSad} style={{ width: 100, height: 100 }} resizeMode="contain" />
        <Text className="text-sm text-muted-foreground text-center">
          Log meals and symptoms to see your report.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-5">
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

      {/* Stats grid */}
      <View className="flex-row flex-wrap gap-3">
        <Card className="p-4 basis-[48%] items-center">
          <Clock size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-accent mt-2">{patternReport.lateEatingRisk}%</Text>
          <Text className="text-xs text-muted-foreground mt-1">Late eating</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <TrendingDown size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-foreground mt-2">{patternReport.avgSeverity}/5</Text>
          <Text className="text-xs text-muted-foreground mt-1">Avg severity</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <Calendar size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-success mt-2">{patternReport.symptomFreeDays}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Symptom-free days</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <Clock size={18} color="#5f6f74" />
          <Text className="text-xl font-bold text-foreground mt-2">{patternReport.worstTimeOfDay}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Peak symptom time</Text>
        </Card>
      </View>

      <Button onPress={handleShare} variant="outline" className="w-full flex-row gap-2">
        <Share2 size={18} color="#1f2a30" />
        <Text className="text-foreground font-semibold">Share</Text>
      </Button>

      <Text className="text-[10px] text-muted-foreground text-center">
        Patterns, not diagnoses. Consult your doctor.
      </Text>
    </Screen>
  );
}
