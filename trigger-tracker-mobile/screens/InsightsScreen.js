import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, TrendingUp } from "lucide-react-native";
import Screen from "../components/Screen";
import InsightCard from "../components/InsightCard";
import TriggerBadge from "../components/TriggerBadge";
import { calculateTriggers, generateDailyInsights } from "../utils/triggerEngine";
import { getMeals, getSymptoms } from "../services/storage";
import Card from "../components/Card";
import Mascot from "../components/Mascot";

export default function InsightsScreen() {
  const [insights, setInsights] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const meals = await getMeals();
    const symptoms = await getSymptoms();
    setInsights(generateDailyInsights(meals, symptoms));
    setTriggers(calculateTriggers(meals, symptoms));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (loading) {
    return (
      <Screen contentClassName="items-center justify-center">
        <Text className="text-muted-foreground">Loading...</Text>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="gap-8">
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <AlertTriangle size={20} color="#f07c52" />
          <Text className="text-lg font-semibold text-foreground">Suspected Triggers</Text>
        </View>
        {triggers.length > 0 ? (
          <View className="gap-3">
            {triggers.slice(0, 5).map((trigger, index) => (
              <TriggerBadge
                key={trigger.ingredient}
                trigger={trigger}
                rank={index + 1}
              />
            ))}
          </View>
        ) : (
          <Card className="p-6 items-center gap-3">
            <Mascot size="small" />
            <Text className="text-muted-foreground text-center">
              Log more meals and symptoms to identify triggers. We need at least two symptom events
              linked to meals before sharing patterns.
            </Text>
          </Card>
        )}
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={20} color="#3aa27f" />
          <Text className="text-lg font-semibold text-foreground">Patterns & Tips</Text>
        </View>
        {insights.length > 0 ? (
          <View className="gap-3">
            {insights.map((insight, index) => (
              <InsightCard key={`${insight.title}-${index}`} insight={insight} />
            ))}
          </View>
        ) : (
          <Card className="p-6 items-center gap-3">
            <Mascot size="small" />
            <Text className="text-muted-foreground text-center">
              As you log consistently, GERDBuddy will share gentle insights tailored to you.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
