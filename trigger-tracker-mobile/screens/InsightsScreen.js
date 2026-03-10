import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, TrendingUp, ShieldCheck } from "lucide-react-native";
import Screen from "../components/Screen";
import InsightCard from "../components/InsightCard";
import TriggerBadge from "../components/TriggerBadge";
import ProTeaser from "../components/ProTeaser";
import { calculateTriggers, calculateSafeFoods, generateDailyInsights } from "../utils/triggerEngine";
import { getMeals, getSymptoms, getUser } from "../services/storage";
import Card from "../components/Card";
import Mascot from "../components/Mascot";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { shouldShowPaywall } from "../services/paywallTrigger";

export default function InsightsScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [safeFoods, setSafeFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const { isPro, refreshStatus } = usePremiumStatus(userId);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [meals, symptoms, user] = await Promise.all([
        getMeals(),
        getSymptoms(),
        getUser(),
      ]);
      if (user?.id) setUserId(user.id);
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
      loadData().then(() => {
        // Check paywall after loading insights
        shouldShowPaywall("post_insight").then((check) => {
          if (check.show && navigation) {
            navigation.navigate("Paywall", { trigger_source: "post_insight" });
          }
        }).catch(() => {});
      });
      refreshStatus();
    }, [loadData, refreshStatus, navigation])
  );

  if (loading) {
    return (
      <Screen contentClassName="items-center justify-center">
        <Text className="text-muted-foreground">Loading...</Text>
      </Screen>
    );
  }

  const freeTriggerLimit = 2;
  const freeSafeFoodLimit = 1;
  const freeInsightLimit = 1;

  const visibleTriggers = isPro ? triggers.slice(0, 5) : triggers.slice(0, freeTriggerLimit);
  const hiddenTriggerCount = isPro ? 0 : Math.max(0, Math.min(triggers.length, 5) - freeTriggerLimit);

  const visibleSafeFoods = isPro ? safeFoods.slice(0, 5) : safeFoods.slice(0, freeSafeFoodLimit);
  const hiddenSafeFoodCount = isPro ? 0 : Math.max(0, Math.min(safeFoods.length, 5) - freeSafeFoodLimit);

  const visibleInsights = isPro ? insights : insights.slice(0, freeInsightLimit);
  const hasHiddenInsights = !isPro && insights.length > freeInsightLimit;

  return (
    <Screen contentClassName="gap-8">
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <AlertTriangle size={20} color="#f07c52" />
          <Text className="text-lg font-semibold text-foreground">Suspected Triggers</Text>
        </View>
        {triggers.length > 0 ? (
          <View className="gap-3">
            {visibleTriggers.map((trigger, index) => (
              <TriggerBadge
                key={trigger.ingredient}
                trigger={trigger}
                rank={index + 1}
                showDetails={isPro}
              />
            ))}
            {hiddenTriggerCount > 0 && (
              <ProTeaser
                title={`See ${hiddenTriggerCount} more trigger${hiddenTriggerCount === 1 ? "" : "s"}`}
                description="Unlock full trigger analysis with confidence scores and relative risk data."
              />
            )}
          </View>
        ) : (
          <Card className="p-5 items-center gap-3">
            <Mascot size="small" />
            <Text className="text-sm text-muted-foreground text-center leading-relaxed">
              No suspected triggers yet. Keep logging your meals and any symptoms that follow — patterns usually start showing after a week or so of consistent tracking.
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
            {visibleSafeFoods.map((food) => (
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
            {hiddenSafeFoodCount > 0 && (
              <ProTeaser
                title={`See ${hiddenSafeFoodCount} more safe food${hiddenSafeFoodCount === 1 ? "" : "s"}`}
                description="Upgrade to see your complete list of safe foods."
              />
            )}
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
            {visibleInsights.map((insight, index) => (
              <InsightCard key={`${insight.title}-${index}`} insight={insight} />
            ))}
            {hasHiddenInsights && (
              <ProTeaser
                title="Unlock all pattern insights"
                description="Get the full picture of your GERD patterns and personalized tips."
              />
            )}
          </View>
        ) : (
          <Card className="p-5 items-center gap-3">
            <Mascot size="small" />
            <Text className="text-sm text-muted-foreground text-center leading-relaxed">
              Insights will appear here as you build up more tracking data. The more meals and symptoms you log, the more useful this becomes.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
