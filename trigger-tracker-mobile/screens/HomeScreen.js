import { useCallback, useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Flame, Utensils, Activity, Camera } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import ProgressRing from "../components/ProgressRing";
import InsightCard from "../components/InsightCard";
import Mascot from "../components/Mascot";
import { generateDailyInsights } from "../utils/triggerEngine";
import {
  getMeals, getSymptoms, getUser, getDaysSinceStart,
  getStreakInfo, updateBestStreak,
} from "../services/storage";

export default function HomeScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0, days: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, bestStreak: 0, loggedToday: false });

  const loadData = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) {
        navigation.replace("Onboarding");
        return;
      }
      const meals = await getMeals();
      const symptoms = await getSymptoms();
      const days = await getDaysSinceStart();

      setInsights(generateDailyInsights(meals, symptoms));
      setStats({
        meals: meals.length,
        symptoms: symptoms.length,
        days: Math.min(days + 1, 7),
      });

      const streakInfo = getStreakInfo(meals, user);
      setStreak(streakInfo);
      if (streakInfo.shouldUpdateBest) {
        updateBestStreak(streakInfo.bestStreak);
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

  const progressPercent = Math.min((stats.days / 7) * 100, 100);

  return (
    <Screen contentClassName="gap-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image
            source={require("../assets/mascot/turtle_shell.png")}
            className="w-10 h-10 rounded-xl"
            resizeMode="contain"
          />
          <View>
            <Text className="text-xl font-bold text-foreground">GERDBuddy</Text>
            <Text className="text-sm text-muted-foreground">Day {stats.days}/7</Text>
          </View>
        </View>
        <ProgressRing progress={progressPercent} size={56} strokeWidth={5}>
          <Text className="text-xs font-bold text-primary">{stats.days}/7</Text>
        </ProgressRing>
      </View>

      <Card className="p-4 flex-row items-center gap-4 border-accent/20 bg-accent-light">
        <View className="w-12 h-12 rounded-2xl bg-accent/15 items-center justify-center">
          <Flame
            size={24}
            color="#f07c52"
            fill={streak.currentStreak > 0 ? "#f07c52" : "none"}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-2xl font-bold text-foreground">
              {streak.currentStreak}
            </Text>
            <Text className="text-sm text-muted-foreground">
              day{streak.currentStreak !== 1 ? "s" : ""}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground mt-0.5">
            {streak.currentStreak > 0
              ? streak.loggedToday
                ? "Streak active! Keep it going tomorrow."
                : "Log a meal today to extend your streak!"
              : "Log a meal to start your streak!"}
          </Text>
        </View>
        {streak.bestStreak > 0 && (
          <View className="items-center">
            <Text className="text-xs text-muted-foreground">Best</Text>
            <Text className="text-lg font-bold text-accent">
              {streak.bestStreak}
            </Text>
          </View>
        )}
      </Card>

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

      <View className="flex-row gap-3">
        <Button
          variant="primary"
          className="flex-1 h-auto py-6 rounded-2xl"
          onPress={() => navigation.navigate("LogMeal")}
        >
          <View className="items-center gap-2">
            <Utensils color="#ffffff" size={26} />
            <Text className="text-white font-semibold">Meal</Text>
          </View>
        </Button>
        <Button
          variant="accent"
          className="flex-1 h-auto py-6 rounded-2xl"
          onPress={() => navigation.navigate("LogSymptom")}
        >
          <View className="items-center gap-2">
            <Activity color="#ffffff" size={26} />
            <Text className="text-white font-semibold">Symptom</Text>
          </View>
        </Button>
        <Pressable
          className="flex-1 h-auto py-6 rounded-2xl bg-primary/10 items-center justify-center"
          onPress={() => navigation.navigate("FoodScan")}
        >
          <View className="items-center gap-2">
            <Camera size={26} color="#3aa27f" />
            <Text className="text-primary font-semibold">Scan</Text>
          </View>
        </Pressable>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">Insights</Text>
          {insights.length > 0 && (
            <Pressable onPress={() => navigation.navigate("Insights")}>
              <Text className="text-sm text-primary">All</Text>
            </Pressable>
          )}
        </View>
        {insights.slice(0, 2).map((insight, index) => (
          <InsightCard key={index} insight={insight} />
        ))}
        {insights.length === 0 && (
          <Card className="p-5 items-center gap-3">
            <Mascot size="small" />
            <Text className="text-sm text-muted-foreground text-center">
              Log meals and symptoms to see insights
            </Text>
          </Card>
        )}
      </View>

      {stats.days >= 7 && (
        <Pressable onPress={() => navigation.navigate("Report")}>
          <Card className="p-4 flex-row items-center gap-3 border-primary/30">
            <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
              <Text className="text-lg">🎉</Text>
            </View>
            <Text className="font-semibold text-foreground">7-day report ready</Text>
          </Card>
        </Pressable>
      )}
    </Screen>
  );
}
