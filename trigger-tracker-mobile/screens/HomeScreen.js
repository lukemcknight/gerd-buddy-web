import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Activity, Clock, Utensils } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import ProgressRing from "../components/ProgressRing";
import BrandMark from "../components/BrandMark";
import EvidenceBar from "../components/EvidenceBar";
import { getMeals, getSymptoms, getUser, getStreakInfo, updateBestStreak, getSymptomFreeStreak, STREAK_MILESTONES } from "../services/storage";
import { promptForReviewOnEvent } from "../services/reviewPrompt";
import { calculateTriggers } from "../utils/triggerEngine";
import { calculateEvidenceProgress } from "../utils/evidenceProgress";

const DayRail = ({ activeDay }) => (
  <View className="flex-row justify-between">
    {Array.from({ length: 14 }, (_, index) => {
      const day = index + 1;
      const isActive = day <= activeDay;
      const isToday = day === activeDay;
      return (
        <View
          key={day}
          style={{
            width: isToday ? 16 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isActive ? "#154212" : "#e5e2d9",
          }}
        />
      );
    })}
  </View>
);

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ meals: 0, symptoms: 0, symptomFreeStreak: 0 });
  const [recentMeals, setRecentMeals] = useState([]);
  const [recentSymptoms, setRecentSymptoms] = useState([]);
  const [evidence, setEvidence] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) {
        navigation.replace("Onboarding");
        return;
      }
      const meals = await getMeals();
      const symptoms = await getSymptoms();
      const triggers = calculateTriggers(meals, symptoms);

      setStats({ meals: meals.length, symptoms: symptoms.length, symptomFreeStreak: getSymptomFreeStreak(symptoms) });
      setRecentMeals(meals.slice(-3).reverse());
      setRecentSymptoms(symptoms.slice(-3).reverse());
      setEvidence(calculateEvidenceProgress({ user, meals, symptoms, triggers }));

      const streakInfo = getStreakInfo(meals, user);
      if (streakInfo.shouldUpdateBest) {
        updateBestStreak(streakInfo.bestStreak);
        if (STREAK_MILESTONES.includes(streakInfo.currentStreak)) {
          promptForReviewOnEvent("streak_milestone").catch(() => {});
        }
      }

    } catch (error) {
      console.warn("Failed to load home data", error);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const symptomTypeLabels = {
    heartburn: "Heartburn", regurgitation: "Regurgitation", bloating: "Bloating",
    nausea: "Nausea", chest_pain: "Chest Pain", throat: "Sore Throat",
    stomach_pain: "Stomach Pain", gas: "Gas", other: "Other",
  };

  const formatSymptomTypes = (types) => {
    if (!types?.length) return null;
    return types.map((t) => symptomTypeLabels[t] || t).join(", ");
  };

  const hasData = stats.meals > 0 || stats.symptoms > 0;

  return (
    <Screen contentClassName="gap-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <BrandMark variant="dark" size={42} />
          <Text className="text-3xl font-bold text-primary">GERDBuddy</Text>
        </View>
        <View className="rounded-full border border-border bg-card px-3 py-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            14-day window
          </Text>
        </View>
      </View>

      {evidence && (
        <Card className="p-4 gap-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">Doctor-ready progress</Text>
              <Text className="text-sm text-muted-foreground mt-1">
                Build visual trigger evidence from meals and symptoms.
              </Text>
            </View>
            <View className="rounded-full bg-primary-light px-3 py-1 border border-primary/10">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Day {evidence.dayProgress}/14
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4">
            <ProgressRing
              progress={evidence.reportReadiness}
              size={120}
              strokeWidth={9}
              color="#154212"
            >
              <Text className="text-3xl font-bold text-foreground">{evidence.reportReadiness}%</Text>
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Ready</Text>
            </ProgressRing>

            <View className="flex-1 gap-3">
              <View className="flex-row items-end gap-2">
                <Text className="text-4xl font-bold text-primary">{evidence.dayProgress}</Text>
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pb-2">
                  of 14 days
                </Text>
              </View>
              <DayRail activeDay={evidence.dayProgress} />
            </View>
          </View>

          <View className="gap-3">
            <EvidenceBar
              label="Meals"
              value={`${evidence.mealProgress}/${evidence.targets.meals}`}
              percent={evidence.mealPercent}
              tone="primary"
            />
            <EvidenceBar
              label="Symptoms"
              value={`${evidence.symptomProgress}/${evidence.targets.symptoms}`}
              percent={evidence.symptomPercent}
              tone="symptom"
            />
            <EvidenceBar
              label="Triggers"
              value={`${evidence.triggerProgress}/${evidence.targets.triggers}`}
              percent={evidence.triggerPercent}
              tone="gold"
            />
            <EvidenceBar
              label="Report"
              value={`${evidence.reportReadiness}%`}
              percent={evidence.reportReadiness}
              tone="ink"
            />
          </View>
        </Card>
      )}

      {/* Action buttons */}
      <View className="flex-row gap-3">
        <Button
          variant="primary"
          className="flex-1 py-4"
          onPress={() => navigation.navigate("LogMeal")}
        >
          <View className="flex-row items-center gap-2">
            <Utensils size={18} color="#ffffff" strokeWidth={2.2} />
            <Text className="text-white font-semibold text-sm text-center">Log Meal</Text>
          </View>
        </Button>
        <Button
          variant="accent"
          className="flex-1 py-4"
          onPress={() => navigation.navigate("LogSymptom")}
        >
          <View className="flex-row items-center gap-2">
            <Activity size={18} color="#ffffff" strokeWidth={2.2} />
            <Text className="text-white font-semibold text-sm text-center">Log Symptom</Text>
          </View>
        </Button>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-foreground">{stats.meals}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Meals</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-accent">{stats.symptoms}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Symptoms</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-primary">{stats.symptomFreeStreak}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Clear days</Text>
        </Card>
      </View>

      {/* Recent Activity */}
      {hasData && (recentMeals.length > 0 || recentSymptoms.length > 0) && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-primary">Recent evidence</Text>
          {recentMeals.map((meal) => (
            <Card key={meal.id} className="p-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-primary-light border border-primary/10 items-center justify-center">
                <Utensils size={18} color="#154212" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>{meal.text}</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Clock size={11} color="#9ca3af" />
                  <Text className="text-xs text-muted-foreground">{formatTime(meal.timestamp)}</Text>
                </View>
              </View>
            </Card>
          ))}
          {recentSymptoms.map((symptom) => (
            <Card key={symptom.id} className="p-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-accent-light border border-accent/10 items-center justify-center">
                <Activity size={18} color="#9e4132" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {formatSymptomTypes(symptom.symptomTypes) || `Severity ${symptom.severity}/5`}
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Clock size={11} color="#9ca3af" />
                  <Text className="text-xs text-muted-foreground">{formatTime(symptom.timestamp)}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
