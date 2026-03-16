import { useCallback, useState } from "react";
import { Image, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, ShieldCheck } from "lucide-react-native";
import Screen from "../components/Screen";
import TriggerBadge from "../components/TriggerBadge";
import ProTeaser from "../components/ProTeaser";
import { calculateTriggers, calculateSafeFoods } from "../utils/triggerEngine";
import { getMeals, getSymptoms, getUser } from "../services/storage";
import Card from "../components/Card";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { shouldShowPaywall } from "../services/paywallTrigger";

const turtleContent = require("../assets/mascot/turtle_content.png");

export default function InsightsScreen({ navigation }) {
  const [triggers, setTriggers] = useState([]);
  const [safeFoods, setSafeFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const { isPro, refreshStatus } = usePremiumStatus(userId);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [meals, symptoms, user] = await Promise.all([
        getMeals(), getSymptoms(), getUser(),
      ]);
      if (user?.id) setUserId(user.id);
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

  const visibleTriggers = isPro ? triggers.slice(0, 5) : triggers.slice(0, freeTriggerLimit);
  const hiddenTriggerCount = isPro ? 0 : Math.max(0, Math.min(triggers.length, 5) - freeTriggerLimit);

  const visibleSafeFoods = isPro ? safeFoods.slice(0, 5) : safeFoods.slice(0, freeSafeFoodLimit);
  const hiddenSafeFoodCount = isPro ? 0 : Math.max(0, Math.min(safeFoods.length, 5) - freeSafeFoodLimit);

  const hasNoData = triggers.length === 0 && safeFoods.length === 0;

  return (
    <Screen contentClassName="gap-6">
      {hasNoData ? (
        <View className="items-center gap-4 pt-12">
          <Image source={turtleContent} style={{ width: 100, height: 100 }} resizeMode="contain" />
          <Text className="text-sm text-muted-foreground text-center">
            Keep logging — patterns will appear here.
          </Text>
        </View>
      ) : (
        <>
          {/* Triggers */}
          {triggers.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <AlertTriangle size={18} color="#f07c52" />
                <Text className="text-base font-semibold text-foreground">Suspected Triggers</Text>
              </View>
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
                  title={`See ${hiddenTriggerCount} more`}
                  description="Unlock full trigger analysis."
                />
              )}
            </View>
          )}

          {/* Safe Foods */}
          {safeFoods.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={18} color="#3aa27f" />
                <Text className="text-base font-semibold text-foreground">Safe Foods</Text>
              </View>
              {visibleSafeFoods.map((food) => (
                <Card key={food.ingredient} className="p-4 bg-primary/5 border-primary/20">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-foreground capitalize">{food.ingredient}</Text>
                    <Text className="text-lg font-bold text-primary">{food.safetyScore}%</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {food.symptomFreeOccurrences}/{food.totalOccurrences} times without symptoms
                  </Text>
                </Card>
              ))}
              {hiddenSafeFoodCount > 0 && (
                <ProTeaser
                  title={`See ${hiddenSafeFoodCount} more`}
                  description="Unlock your complete safe foods list."
                />
              )}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
