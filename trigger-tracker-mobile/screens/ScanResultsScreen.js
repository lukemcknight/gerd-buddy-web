import { useState, useEffect, useRef } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import {
  ArrowLeft, ShieldAlert, Utensils, Sparkles, ChevronDown, ChevronUp,
  ArrowRightLeft, Camera, Flame, Lock,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { analyzeFoodImage } from "../services/foodAnalysis";
import { enhanceScanResult } from "../services/scannerAdapter";
import { showToast } from "../utils/feedback";
import {
  saveMeal, getPersonalTriggers, getMeals, getUser,
  getStreakInfo, updateBestStreak, STREAK_MILESTONES,
  getScanCount7d, getDaysSinceStart, generateId,
} from "../services/storage";
import { EVENTS } from "../services/analytics";
import {
  incrementFreeScanCount, FREE_SCAN_LIMIT,
} from "../services/scannerGate";
import Constants from "expo-constants";

const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");

const trafficLightStyles = {
  "Likely Safe": {
    bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200",
    badgeBg: "bg-emerald-100", color: "#059669",
  },
  Caution: {
    bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200",
    badgeBg: "bg-amber-100", color: "#d97706",
  },
  "Likely Trigger": {
    bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200",
    badgeBg: "bg-rose-100", color: "#e11d48",
  },
};

const reasonTagLabels = {
  acidic: "Acidic", spicy: "Spicy", "high-fat": "High-Fat", caffeine: "Caffeine",
  carbonation: "Carbonation", mint: "Mint", chocolate: "Chocolate", alcohol: "Alcohol",
  dairy: "Dairy", fried: "Fried", citrus: "Citrus", garlic: "Garlic", onion: "Onion",
  "personal-trigger": "Personal Trigger",
};

export default function ScanResultsScreen({ navigation, route }) {
  const { asset, gateResult } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [hasLoggedMeal, setHasLoggedMeal] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [expandedTags, setExpandedTags] = useState(new Set());
  const scanIdRef = useRef(null);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("ScanResults");
    loadStreak();
    analyze();
  }, []);

  const loadStreak = async () => {
    const [meals, user] = await Promise.all([getMeals(), getUser()]);
    const streakInfo = getStreakInfo(meals, user);
    setCurrentStreak(streakInfo.currentStreak);
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    const thisScanId = generateId();
    scanIdRef.current = thisScanId;

    posthog?.capture("food_scan_started");
    try {
      const [personalTriggers, user] = await Promise.all([
        getPersonalTriggers(),
        getUser(),
      ]);

      const rawResult = await analyzeFoodImage(asset, personalTriggers, user?.conditions);
      const enhanced = enhanceScanResult(rawResult);
      setAnalysis(enhanced);

      if (!shouldBypassPaywall && gateResult?.entitlementState !== "pro") {
        await incrementFreeScanCount(thisScanId);
      }

      const scanCount7d = await getScanCount7d();
      const userTenureDays = await getDaysSinceStart();

      posthog?.capture(EVENTS.SCANNER_RESULT_VIEWED, {
        result_label: enhanced.trafficLight,
        score: enhanced.score,
        has_swaps: enhanced.saferSwaps.length > 0,
        reason_tags: enhanced.reasonTags,
        scan_count_7d: scanCount7d,
        user_tenure_days: userTenureDays,
        has_personal_triggers: (enhanced.personalTriggerMatch?.length || 0) > 0,
      });
    } catch (err) {
      console.warn("Food analysis failed", err);
      posthog?.capture("food_scan_failed");
      setError("There was an error, please try again.");
      showToast("Analysis failed", "There was an error, please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleTag = (tag) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
        posthog?.capture(EVENTS.SCANNER_REASON_TAG_EXPANDED, {
          reason_tag: tag,
          result_label: analysis?.trafficLight,
        });
      }
      return next;
    });
  };

  const handleSwapTap = (swap) => {
    posthog?.capture(EVENTS.SCANNER_SWAP_TAPPED, {
      swap_item: swap.suggestion,
      result_label: analysis?.trafficLight,
    });
  };

  const buildMealDescription = () => {
    if (!analysis) return "Scanned meal";
    if (analysis.detectedFoods?.length > 0) {
      return analysis.detectedFoods.join(", ");
    }
    return "Scanned meal";
  };

  const handleLogMeal = async () => {
    if (!analysis || isLoggingMeal || hasLoggedMeal) return;
    setIsLoggingMeal(true);
    try {
      await saveMeal({
        text: buildMealDescription(),
        timestamp: Date.now(),
        source: "scan",
        score: analysis.score,
        label: analysis.label,
        trafficLight: analysis.trafficLight,
        reasonTags: analysis.reasonTags,
      });

      const [meals, user] = await Promise.all([getMeals(), getUser()]);
      const streakInfo = getStreakInfo(meals, user);
      if (streakInfo.shouldUpdateBest) {
        updateBestStreak(streakInfo.bestStreak);
      }
      if (STREAK_MILESTONES.includes(streakInfo.currentStreak)) {
        posthog?.capture("streak_milestone", {
          streak_length: streakInfo.currentStreak,
        });
      }

      setCurrentStreak(streakInfo.currentStreak);
      setHasLoggedMeal(true);

      const streakText =
        streakInfo.currentStreak > 1
          ? ` ${streakInfo.currentStreak}-day streak!`
          : streakInfo.currentStreak === 1
            ? " Streak started!"
            : "";
      showToast("Meal logged", `Saved to history.${streakText}`);
    } catch (err) {
      console.warn("Failed to auto-log meal", err);
      showToast("Could not log meal", "Please try again or log manually.");
    } finally {
      setIsLoggingMeal(false);
    }
  };

  const tlStyle = trafficLightStyles[analysis?.trafficLight] || trafficLightStyles.Caution;

  return (
    <Screen contentClassName="gap-6 pb-10">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-2 rounded-full bg-white/10 active:bg-white/20"
          >
            <ArrowLeft size={24} color="#1f2a30" />
          </Pressable>
          <Text className="text-2xl font-bold text-slate-800">Scan Results</Text>
        </View>

        <View className="flex-row items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200">
          <Flame size={16} color="#f97316" fill="#f97316" />
          <Text className="text-orange-700 font-bold">{currentStreak}</Text>
        </View>
      </View>

      {/* Image Preview */}
      <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
        <Image
          source={{ uri: asset.uri }}
          className="w-full h-64"
          resizeMode="cover"
        />
        {isAnalyzing && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center backdrop-blur-sm">
            <View className="bg-white p-4 rounded-2xl flex-row items-center gap-3 shadow-lg">
              <ActivityIndicator size="small" color="#059669" />
              <Text className="font-medium text-slate-800">Scanning ingredients...</Text>
            </View>
          </View>
        )}
      </View>

      {error && (
        <View className="p-4 border border-rose-200 bg-rose-50 rounded-2xl flex-row items-center gap-3">
          <ShieldAlert size={20} color="#e11d48" />
          <Text className="text-rose-700 flex-1">{error}</Text>
        </View>
      )}

      {/* Results */}
      {analysis && (
        <View className={`rounded-3xl border ${tlStyle.border} ${tlStyle.bg} shadow-sm overflow-hidden`}>
          <View className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-sm font-medium text-slate-600 mb-1">Risk Score</Text>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-4xl font-extrabold text-slate-800">
                    {analysis.score}
                  </Text>
                  <Text className="text-lg text-slate-500 font-bold">/ 5</Text>
                </View>
              </View>
              <View className={`px-5 py-2.5 rounded-full ${tlStyle.badgeBg} border ${tlStyle.border}`}>
                <Text className={`font-bold text-base ${tlStyle.text}`}>
                  {analysis.trafficLight}
                </Text>
              </View>
            </View>

            {/* Detected Foods */}
            {analysis.detectedFoods?.length > 0 && (
              <View className="mb-4 bg-white/60 p-4 rounded-xl">
                <Text className="font-semibold text-slate-800 mb-2">Detected</Text>
                <View className="flex-row flex-wrap gap-2">
                  {analysis.detectedFoods.map((food, idx) => (
                    <View key={idx} className="px-3 py-1.5 rounded-full bg-white border border-slate-200">
                      <Text className="text-sm text-slate-700">{food}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Reason Tags */}
            {analysis.reasonTags.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-slate-700 mb-2">Why this rating</Text>
                <View className="flex-row flex-wrap gap-2">
                  {analysis.reasonTags.map((tag) => {
                    const isExpanded = expandedTags.has(tag);
                    const tagColor =
                      tag === "personal-trigger"
                        ? "bg-rose-100 border-rose-200"
                        : `${tlStyle.badgeBg} ${tlStyle.border}`;
                    const textColor =
                      tag === "personal-trigger" ? "text-rose-700" : tlStyle.text;

                    return (
                      <Pressable
                        key={tag}
                        onPress={() => handleToggleTag(tag)}
                        className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${tagColor}`}
                      >
                        <Text className={`text-sm font-medium ${textColor}`}>
                          {reasonTagLabels[tag] || tag}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={12} color={tlStyle.color} />
                        ) : (
                          <ChevronDown size={12} color={tlStyle.color} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View className="bg-white/60 p-4 rounded-xl mb-4">
              <Text className="font-semibold text-slate-800 mb-1">Analysis</Text>
              <Text className="text-slate-700 leading-relaxed">
                {analysis.reasons?.[0] || "We could not generate an explanation. Try retaking the photo."}
              </Text>
            </View>

            {analysis.personalTriggerMatch?.length > 0 && (
              <View className="mb-4 bg-rose-100 p-3 rounded-xl border border-rose-200">
                <View className="flex-row items-center gap-2 mb-2">
                  <ShieldAlert size={16} color="#be123c" />
                  <Text className="font-bold text-rose-800">Personal Trigger Detected!</Text>
                </View>
                {analysis.personalTriggerMatch.map((trigger, idx) => (
                  <Text key={idx} className="text-rose-700 ml-6">- {trigger}</Text>
                ))}
              </View>
            )}

            {analysis.saferSwaps.length > 0 && (
              <View className="mb-4 bg-white/60 p-4 rounded-xl">
                <View className="flex-row items-center gap-2 mb-3">
                  <ArrowRightLeft size={16} color="#3aa27f" />
                  <Text className="font-semibold text-slate-800">Safer Swaps</Text>
                </View>
                <View className="gap-3">
                  {analysis.saferSwaps.map((swap, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => handleSwapTap(swap)}
                      className="flex-row items-center gap-3 p-3 bg-white rounded-xl border border-slate-100"
                    >
                      <View className="flex-1">
                        <Text className="text-xs text-muted-foreground line-through">
                          {swap.original}
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {swap.suggestion}
                        </Text>
                        <Text className="text-xs text-primary mt-0.5">
                          {swap.reason}
                        </Text>
                      </View>
                      <ArrowRightLeft size={14} color="#3aa27f" />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {analysis.saferSwaps.length === 0 && analysis.suggestions?.length > 0 && (
              <View className="mb-4 bg-white/60 p-4 rounded-xl">
                <View className="flex-row items-center gap-2 mb-2">
                  <Utensils size={16} color="#3aa27f" />
                  <Text className="font-semibold text-slate-800">Suggestions</Text>
                </View>
                {analysis.suggestions.map((suggestion, idx) => (
                  <Text key={idx} className="text-slate-700 leading-relaxed ml-6">- {suggestion}</Text>
                ))}
              </View>
            )}

            <View className="mt-2">
              <Button
                className={`w-full py-4 rounded-xl shadow-md ${hasLoggedMeal ? "bg-slate-100" : "bg-slate-900"}`}
                disabled={isLoggingMeal || hasLoggedMeal}
                onPress={handleLogMeal}
              >
                {hasLoggedMeal ? (
                  <View className="flex-row items-center gap-2">
                    <View className="bg-green-500 w-2 h-2 rounded-full" />
                    <Text className="text-slate-600 font-bold">Meal Logged</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {isLoggingMeal ? "Saving..." : "Log to History"}
                  </Text>
                )}
              </Button>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}
