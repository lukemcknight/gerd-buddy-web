import { useCallback, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Utensils, Activity, Camera, Clock } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import TurtleBuddy from "../components/TurtleBuddy";
import { getMeals, getSymptoms, getUser, getStreakInfo, updateBestStreak, STREAK_MILESTONES } from "../services/storage";
import { promptForReviewOnEvent } from "../services/reviewPrompt";
import { computeBuddyState } from "../utils/buddyState";

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ meals: 0, symptoms: 0 });
  const [recentMeals, setRecentMeals] = useState([]);
  const [recentSymptoms, setRecentSymptoms] = useState([]);
  const [buddyState, setBuddyState] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) {
        navigation.replace("Onboarding");
        return;
      }
      const meals = await getMeals();
      const symptoms = await getSymptoms();

      setStats({ meals: meals.length, symptoms: symptoms.length });
      setRecentMeals(meals.slice(-3).reverse());
      setRecentSymptoms(symptoms.slice(-3).reverse());

      const streakInfo = getStreakInfo(meals, user);
      if (streakInfo.shouldUpdateBest) {
        updateBestStreak(streakInfo.bestStreak);
        if (STREAK_MILESTONES.includes(streakInfo.currentStreak)) {
          promptForReviewOnEvent("streak_milestone").catch(() => {});
        }
      }

      setBuddyState(computeBuddyState({
        totalMeals: meals.length,
        currentStreak: streakInfo.currentStreak,
        bestStreak: streakInfo.bestStreak,
        loggedToday: streakInfo.loggedToday,
      }));

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
      {buddyState && (
        <TurtleBuddy
          buddyState={buddyState}
          onPress={() => navigation.navigate("BuddyAccessories")}
        />
      )}

      {/* Action buttons */}
      <View className="flex-row gap-3">
        <Button
          variant="primary"
          className="flex-1 flex-col h-auto py-5 rounded-2xl"
          onPress={() => navigation.navigate("LogMeal")}
        >
          <View className="items-center gap-2">
            <Utensils color="#ffffff" size={24} />
            <Text className="text-white font-semibold">Log Meal</Text>
          </View>
        </Button>
        <Button
          variant="accent"
          className="flex-1 flex-col h-auto py-5 rounded-2xl"
          onPress={() => navigation.navigate("LogSymptom")}
        >
          <View className="items-center gap-2">
            <Activity color="#ffffff" size={24} />
            <Text className="text-white font-semibold">Log Symptom</Text>
          </View>
        </Button>
        <Pressable
          className="flex-1 h-auto py-5 rounded-2xl bg-primary/10 items-center justify-center"
          onPress={() => navigation.navigate("FoodScan")}
        >
          <View className="items-center gap-2">
            <Camera size={24} color="#3aa27f" />
            <Text className="text-primary font-semibold">Scan</Text>
          </View>
        </Pressable>
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
      </View>

      {/* Recent Activity */}
      {hasData && (recentMeals.length > 0 || recentSymptoms.length > 0) && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">Recent</Text>
          {recentMeals.map((meal) => (
            <Card key={meal.id} className="p-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
                <Utensils size={16} color="#3aa27f" />
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
              <View className="w-9 h-9 rounded-xl bg-accent/10 items-center justify-center">
                <Activity size={16} color="#f07c52" />
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
