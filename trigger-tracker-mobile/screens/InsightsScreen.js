import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react-native";
import Screen from "../components/Screen";
import InsightCard from "../components/InsightCard";
import TriggerBadge from "../components/TriggerBadge";
import { calculateTriggers, calculateSafeFoods, generateDailyInsights } from "../utils/triggerEngine";
import { getMeals, getSymptoms } from "../services/storage";
import Card from "../components/Card";
import Mascot from "../components/Mascot";

export default function InsightsScreen() {
  const [insights, setInsights] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [safeFoods, setSafeFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const meals = await getMeals();
      const symptoms = await getSymptoms();
      setInsights(generateDailyInsights(meals, symptoms));
      setTriggers(calculateTriggers(meals, symptoms));
      setSafeFoods(calculateSafeFoods(meals, symptoms));
    } catch (error) {
      console.warn("Failed to load insights data", error);
    } finally {
      setLoading(false);
    }
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

      {safeFoods.length > 0 && (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <ShieldCheck size={20} color="#3aa27f" />
            <Text className="text-lg font-semibold text-foreground">Safe Foods</Text>
          </View>
          <View className="gap-3">
            {safeFoods.slice(0, 5).map((food) => (
              <Card key={food.ingredient} className="p-4 bg-primary/5 border-primary/20">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-semibold text-foreground capitalize">
                      {food.ingredient}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {food.symptomFreeOccurrences}/{food.totalOccurrences} times without symptoms
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-primary">
                      {food.safetyScore}%
                    </Text>
                    <Text className="text-xs text-muted-foreground">safe</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

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
