import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AlertTriangle, MessageCircle, ShieldCheck } from "lucide-react-native";
import Screen from "../components/Screen";
import TriggerBadge from "../components/TriggerBadge";
import ProTeaser from "../components/ProTeaser";
import SeverityChart from "../components/SeverityChart";
import EvidenceBar from "../components/EvidenceBar";
import SectionHeader from "../components/SectionHeader";
import { calculateTriggers, calculateSafeFoods } from "../utils/triggerEngine";
import { getWeeklySeverity } from "../utils/severityChart";
import { getMeals, getSymptoms, getUser } from "../services/storage";
import Card from "../components/Card";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { shouldShowPaywall } from "../services/paywallTrigger";

const SafeFoodCard = ({ food }) => {
  const score = Math.min(100, Math.max(0, food.safetyScore || 0));
  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="font-semibold text-foreground capitalize">{food.ingredient}</Text>
          <Text className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
            {food.symptomFreeOccurrences}/{food.totalOccurrences} symptom-free
          </Text>
        </View>
        <Text className="text-2xl font-bold text-primary">{score}%</Text>
      </View>
      <View className="mt-3">
        <EvidenceBar label="Safe score" value={`${score}%`} percent={score} tone="primary" />
      </View>
    </Card>
  );
};

export default function InsightsScreen({ navigation }) {
  const [triggers, setTriggers] = useState([]);
  const [safeFoods, setSafeFoods] = useState([]);
  const [weeklySeverity, setWeeklySeverity] = useState([]);
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
      setWeeklySeverity(getWeeklySeverity(symptoms));
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
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pattern review
          </Text>
          <Text className="text-3xl font-bold text-primary mt-1">Insights</Text>
        </View>
        <View className="rounded-full border border-border bg-card px-3 py-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {triggers.length + safeFoods.length} items
          </Text>
        </View>
      </View>

      {/* Ask AI entry card — always visible so users know this exists,
          even before they have data to analyze */}
      {isPro ? (
        <Pressable
          onPress={() => navigation.navigate("DoctorChat")}
          className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <MessageCircle size={20} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">
              Ask GERDBuddy AI
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {hasNoData
                ? "Once you log a few meals, ask anything about your patterns."
                : "Get answers grounded in YOUR data, like \"why am I flaring today?\""}
            </Text>
          </View>
        </Pressable>
      ) : (
        <ProTeaser
          title="Ask GERDBuddy AI"
          description="Get answers grounded in YOUR data: why you're flaring today, whether a food is safe for you, what changed this week."
        />
      )}

      {hasNoData ? (
        <Card
          className="p-8 items-center gap-4 bg-muted"
          style={{ borderStyle: "dashed", borderWidth: 2 }}
        >
          <View className="w-20 h-20 rounded-full bg-card border border-border items-center justify-center">
            <View className="flex-row items-end gap-1">
              <View className="w-2 h-5 rounded-full bg-primary" />
              <View className="w-2 h-9 rounded-full bg-warning" />
              <View className="w-2 h-7 rounded-full bg-accent" />
            </View>
          </View>
          <View className="items-center gap-1">
            <Text className="text-base font-semibold text-foreground">Uncover more patterns</Text>
            <Text className="text-sm text-muted-foreground text-center">
              Log meals and symptoms to build your first trigger evidence cards.
            </Text>
          </View>
        </Card>
      ) : (
        <>
          <SeverityChart data={weeklySeverity} />

          {/* Triggers */}
          {triggers.length > 0 && (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <SectionHeader icon={AlertTriangle} tone="gold" title="Suspected triggers" />
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {triggers.length} items
                </Text>
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
              <SectionHeader icon={ShieldCheck} tone="primary" title="Likely safe foods" />
              {visibleSafeFoods.map((food) => (
                <SafeFoodCard key={food.ingredient} food={food} />
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
