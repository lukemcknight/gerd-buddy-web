import { useState, useEffect, useMemo } from "react";
import { Text, View, Pressable } from "react-native";
import { Utensils, Sparkles } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import LogScreenShell from "../components/log/LogScreenShell";
import ChipScroller from "../components/log/ChipScroller";
import TimeEntry from "../components/log/TimeEntry";
import SubmitFeedback from "../components/log/SubmitFeedback";
import MealLibrarySheet from "../components/log/MealLibrarySheet";
import { TextArea } from "../components/TextField";
import {
  saveMeal,
  getMeals,
  getUser,
  getStreakInfo,
  updateBestStreak,
  STREAK_MILESTONES,
  getRecentMealSuggestions,
} from "../services/storage";
import { showToast } from "../utils/feedback";
import { syncSmartNotifications } from "../services/notifications";

const append = (current, addition) =>
  current.trim() ? `${current.trim()}, ${addition}` : addition;

const computeSource = ({ usedRecent, usedLibrary, hadFreeText }) => {
  const sources = [];
  if (usedRecent) sources.push("recent");
  if (usedLibrary) sources.push("library");
  if (hadFreeText) sources.push("freetext");
  if (sources.length === 0) return "freetext";
  if (sources.length === 1) return sources[0];
  return "mixed";
};

export default function LogMealScreen({ navigation }) {
  const [mealText, setMealText] = useState("");
  const [mealTime, setMealTime] = useState(new Date());
  const [timePreset, setTimePreset] = useState("now");
  const [recentMeals, setRecentMeals] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [usedRecent, setUsedRecent] = useState(false);
  const [usedLibrary, setUsedLibrary] = useState(false);
  const [typedManually, setTypedManually] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("LogMeal");
    getMeals().then((meals) => {
      setRecentMeals(getRecentMealSuggestions(meals, 10));
    });
  }, []);

  const recentChips = useMemo(
    () => recentMeals.map((label) => ({ id: label, label })),
    [recentMeals]
  );

  const handleRecentPress = (label) => {
    setMealText((prev) => append(prev, label));
    setUsedRecent(true);
    posthog?.capture("quick_add_used", { meal: label, source: "recent" });
  };

  const handleLibraryConfirm = (labels) => {
    setLibraryOpen(false);
    setMealText((prev) =>
      labels.reduce((acc, label) => append(acc, label), prev)
    );
    setUsedLibrary(true);
    labels.forEach((meal) =>
      posthog?.capture("quick_add_used", { meal, source: "library" })
    );
  };

  const handleTextChange = (next) => {
    setMealText(next);
    setTypedManually(true);
  };

  const handleSubmit = async () => {
    if (!mealText.trim()) {
      showToast("Please describe what you ate");
      throw new Error("empty_meal");
    }
    await saveMeal({ text: mealText.trim(), timestamp: mealTime.getTime() });

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

    const hadFreeText =
      typedManually &&
      // typing in addition to a chip is "mixed"; pure chip selection sets the
      // text via append but typedManually stays false.
      true;

    posthog?.capture("meal_logged", {
      has_quick_add: usedRecent || usedLibrary,
      text_length: mealText.trim().length,
      streak_length: streakInfo.currentStreak,
      source: computeSource({ usedRecent, usedLibrary, hadFreeText }),
      time_preset: timePreset,
    });

    const streakText =
      streakInfo.currentStreak > 1
        ? `${streakInfo.currentStreak}-day streak! `
        : streakInfo.currentStreak === 1
        ? "Streak started! "
        : "";

    showToast("Meal logged!", `${streakText}Keep tracking to discover your triggers.`);
    syncSmartNotifications().catch(() => {});
  };

  return (
    <LogScreenShell
      title="Log Meal"
      subtitle="What did you eat?"
      onBack={() => navigation.goBack()}
      icon={
        <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
          <Utensils size={22} color="#154212" />
        </View>
      }
      submitSlot={
        <SubmitFeedback
          label="Log Meal"
          disabled={!mealText.trim()}
          onSubmit={handleSubmit}
          onComplete={() => navigation.goBack()}
        />
      }
    >
      {recentChips.length > 0 && (
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color="#5f6f74" />
            <Text className="text-sm text-muted-foreground font-medium">
              Recent meals
            </Text>
          </View>
          <ChipScroller
            chips={recentChips}
            mode="action"
            onPress={handleRecentPress}
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">
          Describe your meal
        </Text>
        <TextArea
          placeholder="Tap a recent meal or describe what you ate"
          value={mealText}
          onChangeText={handleTextChange}
          className="min-h-[48px]"
        />
        <Pressable
          onPress={() => setLibraryOpen(true)}
          className="self-start px-3 py-1.5 rounded-full bg-muted/60"
        >
          <Text className="text-sm font-semibold text-foreground">
            🥗 Browse foods
          </Text>
        </Pressable>
      </View>

      <TimeEntry
        value={mealTime}
        presetId={timePreset}
        onChange={(date, preset) => {
          setMealTime(date);
          setTimePreset(preset);
        }}
        label="When did you eat?"
      />

      <MealLibrarySheet
        visible={libraryOpen}
        onCancel={() => setLibraryOpen(false)}
        onConfirm={handleLibraryConfirm}
      />
    </LogScreenShell>
  );
}
