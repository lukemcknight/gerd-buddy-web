import { useCallback, useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Flame, Utensils, Activity, Camera, Clock, Target, ChevronRight,
} from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import InsightCard from "../components/InsightCard";
import Mascot from "../components/Mascot";
import { generateDailyInsights } from "../utils/triggerEngine";
import {
  getMeals, getSymptoms, getUser,
  getStreakInfo, updateBestStreak,
} from "../services/storage";
import {
  getOnboardingPlan, getCurrentPlanDay, isPlanActive, isPlanComplete,
} from "../services/onboardingPlan";

export default function HomeScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState({ meals: 0, symptoms: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, bestStreak: 0, loggedToday: false });
  const [recentMeals, setRecentMeals] = useState([]);
  const [recentSymptoms, setRecentSymptoms] = useState([]);
  const [planCard, setPlanCard] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const user = await getUser();
      if (!user) {
        navigation.replace("Onboarding");
        return;
      }
      const meals = await getMeals();
      const symptoms = await getSymptoms();

      setInsights(generateDailyInsights(meals, symptoms));
      setStats({
        meals: meals.length,
        symptoms: symptoms.length,
      });
      setRecentMeals(meals.slice(-3).reverse());
      setRecentSymptoms(symptoms.slice(-3).reverse());

      const streakInfo = getStreakInfo(meals, user);
      setStreak(streakInfo);
      if (streakInfo.shouldUpdateBest) {
        updateBestStreak(streakInfo.bestStreak);
      }

      // Load onboarding plan card
      const plan = await getOnboardingPlan();
      if (plan && isPlanActive(plan) && !isPlanComplete(plan)) {
        const currentDay = getCurrentPlanDay(plan);
        const todayPlan = plan.days.find((d) => d.day === currentDay);
        if (todayPlan) {
          const completedCount = todayPlan.tasks.filter((t) => t.completed).length;
          setPlanCard({
            day: currentDay,
            focus: todayPlan.focus,
            completedCount,
            totalCount: todayPlan.tasks.length,
          });
        } else {
          setPlanCard(null);
        }
      } else if (plan && isPlanComplete(plan)) {
        // Show a "view summary" card
        setPlanCard({ day: 7, focus: "Your 7-day plan is complete!", completedCount: 0, totalCount: 0, isComplete: true });
      } else {
        setPlanCard(null);
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
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const severityLabel = (severity) => {
    if (severity <= 1) return "Mild";
    if (severity <= 2) return "Light";
    if (severity <= 3) return "Moderate";
    if (severity <= 4) return "Severe";
    return "Intense";
  };

  const hasData = stats.meals > 0 || stats.symptoms > 0;

  return (
    <Screen contentClassName="gap-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image
            source={require("../assets/mascot/turtle_shell.png")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <Text className="text-xl font-bold text-foreground">GERDBuddy</Text>
        </View>
        {streak.currentStreak > 0 && (
          <View className="flex-row items-center gap-1.5 bg-accent-light px-3 py-1.5 rounded-full border border-accent/20">
            <Flame size={16} color="#f07c52" fill="#f07c52" />
            <Text className="text-sm font-bold text-foreground">{streak.currentStreak}</Text>
            <Text className="text-xs text-muted-foreground">day{streak.currentStreak !== 1 ? "s" : ""}</Text>
          </View>
        )}
      </View>

      {/* Today's Focus Card (Onboarding Plan) */}
      {planCard && (
        <Pressable
          onPress={() =>
            planCard.isComplete
              ? navigation.navigate("OnboardingDay7Summary")
              : navigation.navigate("OnboardingPlan")
          }
        >
          <Card className="p-4 border-primary/40">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
                  <Target size={18} color="#3aa27f" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-primary uppercase tracking-wide">
                    {planCard.isComplete ? "Plan Complete" : `Day ${planCard.day} of 7`}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    {planCard.focus}
                  </Text>
                  {!planCard.isComplete && (
                    <Text className="text-xs text-muted-foreground">
                      {planCard.completedCount}/{planCard.totalCount} tasks done
                    </Text>
                  )}
                </View>
              </View>
              <ChevronRight size={18} color="#3aa27f" />
            </View>
            {!planCard.isComplete && planCard.totalCount > 0 && (
              <View className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(planCard.completedCount / planCard.totalCount) * 100}%` }}
                />
              </View>
            )}
          </Card>
        </Pressable>
      )}

      {/* Start Plan CTA for existing users without a plan */}
      {!planCard && hasData && (
        <Pressable onPress={() => navigation.navigate("OnboardingPlan")}>
          <Card className="p-4 border-primary/40">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
                  <Target size={18} color="#3aa27f" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-primary uppercase tracking-wide">
                    New
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    Start Your 7-Day Plan
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Get a personalized daily checklist to find your triggers
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#3aa27f" />
            </View>
          </Card>
        </Pressable>
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
            <Text className="text-white font-semibold text-center">Log Meal</Text>
          </View>
        </Button>
        <Button
          variant="accent"
          className="flex-1 flex-col h-auto py-5 rounded-2xl"
          onPress={() => navigation.navigate("LogSymptom")}
        >
          <View className="items-center gap-2">
            <Activity color="#ffffff" size={24} />
            <Text className="text-white font-semibold text-center">Log Symptom</Text>
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

      {/* Stats row */}
      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-foreground">{stats.meals}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Meals logged</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-accent">{stats.symptoms}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Symptoms logged</Text>
        </Card>
      </View>

      {/* Welcome state for brand new users */}
      {!hasData && (
        <Card className="p-5 gap-4">
          <View className="items-center gap-3">
            <Mascot size="small" />
            <Text className="text-base font-semibold text-foreground text-center">
              Welcome to GERDBuddy
            </Text>
            <Text className="text-sm text-muted-foreground text-center leading-relaxed">
              Start by logging your first meal. The more you track, the better GERDBuddy gets at spotting which foods might be connected to your symptoms.
            </Text>
          </View>
          <View className="bg-muted/50 rounded-xl p-3">
            <Text className="text-xs text-muted-foreground text-center">
              Tip: Try to log meals and symptoms for at least a week to start seeing patterns.
            </Text>
          </View>
        </Card>
      )}

      {/* Recent Activity */}
      {hasData && (recentMeals.length > 0 || recentSymptoms.length > 0) && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">Recent Activity</Text>
          {recentMeals.map((meal) => (
            <Card key={meal.id} className="p-3 flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
                <Utensils size={16} color="#3aa27f" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-foreground" numberOfLines={1}>
                  {meal.text}
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Clock size={11} color="#9ca3af" />
                  <Text className="text-xs text-muted-foreground">
                    {formatTime(meal.timestamp)}
                  </Text>
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
                <Text className="text-sm text-foreground">
                  {severityLabel(symptom.severity)} symptom ({symptom.severity}/5)
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Clock size={11} color="#9ca3af" />
                  <Text className="text-xs text-muted-foreground">
                    {formatTime(symptom.timestamp)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Insights */}
      {hasData && (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-foreground">Insights</Text>
            {insights.length > 0 && (
              <Pressable onPress={() => navigation.navigate("Insights")}>
                <Text className="text-sm text-primary">See all</Text>
              </Pressable>
            )}
          </View>
          {insights.slice(0, 2).map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
          {insights.length === 0 && (
            <Card className="p-4">
              <Text className="text-sm text-muted-foreground text-center">
                Keep logging — insights will appear as patterns emerge from your data.
              </Text>
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}
