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
import { getMeals, getSymptoms, getUser, getDaysSinceStart } from "../services/storage";

export default function HomeScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0, days: 0 });

  const loadData = useCallback(async () => {
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
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const progressPercent = Math.min((stats.days / 7) * 100, 100);

  return (
    <Screen contentClassName="gap-6">
      <View className="flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Flame size={20} color="#3aa27f" />
            <Text className="text-2xl font-bold text-foreground">GERDBuddy</Text>
          </View>
          <Text className="text-muted-foreground">Day {stats.days} of 7</Text>
        </View>
        <ProgressRing progress={progressPercent} size={74} strokeWidth={6}>
          <Text className="text-sm font-bold text-primary">{stats.days}/7</Text>
        </ProgressRing>
      </View>

      <Card className="p-4 flex-row items-center gap-4">
        <Image
          source={require("../assets/mascot/turtle_shell.png")}
          className="w-14 h-14 rounded-2xl"
          resizeMode="contain"
        />
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-foreground">Steady support</Text>
          <Text className="text-sm text-muted-foreground">
            GERDBuddy keeps pace while you log meals and symptoms. Consistency brings clearer
            insights.
          </Text>
        </View>
      </Card>

      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-foreground">{stats.meals}</Text>
          <Text className="text-sm text-muted-foreground mt-1">Meals logged</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-accent">{stats.symptoms}</Text>
          <Text className="text-sm text-muted-foreground mt-1">Symptoms</Text>
        </Card>
      </View>

      <View className="flex-row gap-3">
        <Button
          variant="primary"
          className="flex-1 h-auto py-5 rounded-2xl"
          onPress={() => navigation.navigate("LogMeal")}
        >
          <View className="items-center gap-2">
            <Utensils color="#ffffff" size={22} />
            <Text className="text-white font-semibold">Log Meal</Text>
          </View>
        </Button>
        <Button
          variant="accent"
          className="flex-1 h-auto py-5 rounded-2xl"
          onPress={() => navigation.navigate("LogSymptom")}
        >
          <View className="items-center gap-2">
            <Activity color="#ffffff" size={22} />
            <Text className="text-white font-semibold">Log Symptom</Text>
          </View>
        </Button>
      </View>

      <Pressable onPress={() => navigation.navigate("FoodScan")}>
        <View className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-foreground">Scan food with AI</Text>
            <Text className="text-sm text-muted-foreground">
              Take a quick photo to estimate GERD trigger risk.
            </Text>
          </View>
          <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
            <Camera size={22} color="#3aa27f" />
          </View>
        </View>
      </Pressable>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Today's Insights</Text>
          <Pressable onPress={() => navigation.navigate("Insights")}>
            <Text className="text-sm text-primary font-medium">See all</Text>
          </Pressable>
        </View>
        <View className="gap-3">
          {insights.slice(0, 2).map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
          {insights.length === 0 && (
            <Card className="p-6 items-center gap-4">
              <Mascot size="small" />
              <Text className="text-muted-foreground text-center">
                Start tracking to discover your personal triggers. GERDBuddy learns from your meals
                and symptoms over the week.
              </Text>
            </Card>
          )}
        </View>
      </View>

      {stats.days >= 7 && (
        <Pressable onPress={() => navigation.navigate("Report")}>
          <View className="p-5 bg-card border border-primary/30 rounded-2xl">
            <Text className="font-semibold text-primary mb-1">
              🎉 Your 7-day report is ready!
            </Text>
            <Text className="text-sm text-muted-foreground">
              Tap to view your top GERD triggers
            </Text>
          </View>
        </Pressable>
      )}
    </Screen>
  );
}
