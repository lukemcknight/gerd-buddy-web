import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Award, TrendingUp, Target, ChevronRight } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { getDay7Summary } from "../services/onboardingPlan";
import { EVENTS } from "../services/analytics";

export default function OnboardingDay7SummaryScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const posthog = usePostHog();

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getDay7Summary();
        setSummary(s);
        posthog?.capture(EVENTS.ONBOARDING_DAY7_SUMMARY_VIEWED, {
          tasks_completed: s?.totalTasksCompleted || 0,
          tasks_total: s?.totalTasks || 0,
          plan_adherence: s?.adherencePercent || 0,
          days_completed: s?.daysCompleted || 0,
        });
      } catch (error) {
        console.warn("Failed to load summary", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Screen contentClassName="items-center justify-center">
        <Text className="text-muted-foreground">Loading summary...</Text>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen contentClassName="items-center justify-center gap-4">
        <Text className="text-muted-foreground">No plan data found.</Text>
        <Button onPress={() => navigation.goBack()}>
          <Text className="text-primary-foreground font-semibold">Go Back</Text>
        </Button>
      </Screen>
    );
  }

  const adherenceColor =
    summary.adherencePercent >= 70
      ? "text-primary"
      : summary.adherencePercent >= 40
        ? "text-amber-600"
        : "text-accent";

  return (
    <Screen contentClassName="gap-6">
      {/* Header */}
      <View className="items-center gap-4 pt-4">
        <Mascot size="medium" />
        <View className="items-center gap-2">
          <Text className="text-3xl font-extrabold text-foreground">
            Week 1 Complete!
          </Text>
          <Text className="text-base text-muted-foreground text-center">
            Here's how your first week went
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3">
        <Card className="flex-1 p-4 items-center">
          <Text className={`text-3xl font-bold ${adherenceColor}`}>
            {summary.adherencePercent}%
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">Adherence</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-foreground">
            {summary.daysCompleted}/7
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">Days Done</Text>
        </Card>
        <Card className="flex-1 p-4 items-center">
          <Text className="text-3xl font-bold text-primary">
            {summary.totalTasksCompleted}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">Tasks Done</Text>
        </Card>
      </View>

      {/* Patterns */}
      <Card className="p-5">
        <View className="flex-row items-center gap-2 mb-3">
          <TrendingUp size={18} color="#3aa27f" />
          <Text className="text-base font-semibold text-foreground">
            Early Patterns
          </Text>
        </View>
        <View className="gap-2">
          {summary.topPatterns.map((pattern, idx) => (
            <View key={idx} className="flex-row items-start gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
              <Text className="flex-1 text-sm text-foreground leading-relaxed">
                {pattern}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Recommended Next Step */}
      <Card className="p-5 bg-primary/5 border-primary/20">
        <View className="flex-row items-center gap-2 mb-2">
          <Target size={18} color="#3aa27f" />
          <Text className="text-base font-semibold text-foreground">
            Recommended Next Step
          </Text>
        </View>
        <Text className="text-sm text-foreground leading-relaxed">
          {summary.recommendedNextStep}
        </Text>
      </Card>

      {/* CTA */}
      <View className="gap-3 mt-2">
        <Button
          onPress={() => navigation.navigate("Insights")}
          className="w-full py-4 rounded-2xl"
        >
          <View className="flex-row items-center justify-center gap-2">
            <TrendingUp size={18} color="#ffffff" />
            <Text className="text-primary-foreground font-bold">
              View My Insights
            </Text>
          </View>
        </Button>

        <Button
          variant="outline"
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          className="w-full py-3 rounded-2xl"
        >
          <Text className="text-foreground font-semibold">Back to Home</Text>
        </Button>
      </View>
    </Screen>
  );
}
