import { useCallback, useState } from "react";
import { Text, View, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  CheckCircle, Circle, Target, ChevronRight, Calendar, Award, ArrowRight,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  getOnboardingPlan, generatePlan, toggleTask, getCurrentPlanDay,
  isPlanActive, isPlanComplete,
  FEAR_FOOD_OPTIONS, MEDS_OPTIONS,
} from "../services/onboardingPlan";
import { EVENTS } from "../services/analytics";

// ── Quick triage for existing users ──────────────────────────────────
const SEVERITY_OPTIONS = [
  { id: "light", label: "Light — occasional discomfort" },
  { id: "moderate", label: "Moderate — affects my daily life" },
  { id: "severe", label: "Severe — constant struggle" },
];

function QuickTriageSetup({ onComplete }) {
  const [step, setStep] = useState(0); // 0=severity, 1=fearFoods, 2=meds
  const [severity, setSeverity] = useState(null);
  const [fearFoods, setFearFoods] = useState([]);
  const [medsStatus, setMedsStatus] = useState("none");

  const toggleFearFood = (id) => {
    setFearFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    const plan = await generatePlan({
      severity: severity || "moderate",
      fearFoods,
      customFearFoods: [],
      mealTimes: ["breakfast", "lunch", "dinner"],
      medsStatus,
    });
    onComplete(plan);
  };

  return (
    <Screen contentClassName="gap-5">
      <View>
        <Text className="text-2xl font-bold text-foreground">
          Quick Setup
        </Text>
        <Text className="text-sm text-muted-foreground mt-1">
          Answer 3 quick questions to personalize your 7-day plan.
        </Text>
      </View>

      {step === 0 && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">
            How would you describe your symptoms?
          </Text>
          {SEVERITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setSeverity(opt.id)}
              className={`p-4 rounded-xl border ${
                severity === opt.id
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border"
              }`}
            >
              <Text className="text-sm text-foreground">{opt.label}</Text>
            </Pressable>
          ))}
          <Button
            onPress={() => setStep(1)}
            disabled={!severity}
            className="w-full py-4 rounded-2xl mt-2"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-semibold">Next</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {step === 1 && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">
            Any foods you suspect trigger symptoms?
          </Text>
          <Text className="text-xs text-muted-foreground">
            Select all that apply, or skip if unsure.
          </Text>
          <ScrollView className="max-h-72">
            <View className="gap-2">
              {FEAR_FOOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleFearFood(opt.id)}
                  className={`p-3 rounded-xl border ${
                    fearFoods.includes(opt.id)
                      ? "bg-primary/10 border-primary/40"
                      : "bg-card border-border"
                  }`}
                >
                  <Text className="text-sm text-foreground">{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Button
            onPress={() => setStep(2)}
            className="w-full py-4 rounded-2xl mt-2"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-semibold">
                {fearFoods.length > 0 ? "Next" : "Skip"}
              </Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {step === 2 && (
        <View className="gap-3">
          <Text className="text-base font-semibold text-foreground">
            Are you on any medication?
          </Text>
          {MEDS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setMedsStatus(opt.id)}
              className={`p-4 rounded-xl border ${
                medsStatus === opt.id
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border"
              }`}
            >
              <Text className="text-sm text-foreground">{opt.label}</Text>
            </Pressable>
          ))}
          <Button
            onPress={handleFinish}
            className="w-full py-4 rounded-2xl mt-2"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold">
                Generate My Plan
              </Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      <Pressable onPress={() => onComplete(null)} className="py-3">
        <Text className="text-center text-muted-foreground text-sm">
          Not now
        </Text>
      </Pressable>
    </Screen>
  );
}

// ── Main screen ─────────────────────────────────────────────────────

export default function OnboardingPlanScreen({ navigation }) {
  const [plan, setPlan] = useState(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const posthog = usePostHog();

  const loadPlan = useCallback(async () => {
    try {
      setLoading(true);
      const p = await getOnboardingPlan();
      if (!p) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      setPlan(p);
      setNeedsSetup(false);
      const day = getCurrentPlanDay(p);
      setCurrentDay(day);

      // If plan complete, navigate to summary
      if (isPlanComplete(p)) {
        navigation.replace("OnboardingDay7Summary");
        return;
      }
    } catch (error) {
      console.warn("Failed to load plan", error);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [loadPlan])
  );

  const handleToggleTask = async (taskId) => {
    const updated = await toggleTask(currentDay, taskId);
    if (updated) {
      setPlan(updated);

      // Check if day just completed
      const dayData = updated.days.find((d) => d.day === currentDay);
      const allComplete = dayData?.tasks.every((t) => t.completed);
      if (allComplete && updated.completedDays.includes(currentDay)) {
        posthog?.capture(EVENTS.ONBOARDING_DAY_COMPLETED, {
          onboarding_day: currentDay,
          tasks_completed: dayData.tasks.length,
          tasks_total: dayData.tasks.length,
        });
      }
    }
  };

  if (loading) {
    return (
      <Screen contentClassName="items-center justify-center">
        <Text className="text-muted-foreground">Loading your plan...</Text>
      </Screen>
    );
  }

  if (needsSetup) {
    return (
      <QuickTriageSetup
        onComplete={(newPlan) => {
          if (newPlan) {
            setPlan(newPlan);
            setNeedsSetup(false);
            setCurrentDay(1);
            posthog?.capture(EVENTS.ONBOARDING_PLAN_GENERATED, {
              trigger_source: "existing_user",
            });
          } else {
            navigation.goBack();
          }
        }}
      />
    );
  }

  if (!plan) return null;

  const todayPlan = plan.days.find((d) => d.day === currentDay);
  if (!todayPlan) return null;

  const completedCount = todayPlan.tasks.filter((t) => t.completed).length;
  const totalCount = todayPlan.tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const isToday = currentDay === getCurrentPlanDay(plan);

  return (
    <Screen contentClassName="gap-5">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-foreground">
            Day {currentDay} of 7
          </Text>
          <Text className="text-sm text-muted-foreground">
            {isToday ? "Today's plan" : `Day ${currentDay}`}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
          <Calendar size={14} color="#3aa27f" />
          <Text className="text-sm font-semibold text-primary">
            {plan.completedDays.length}/7 days
          </Text>
        </View>
      </View>

      {/* Day selector */}
      <View className="flex-row gap-2">
        {plan.days.map((d) => {
          const isActive = d.day === currentDay;
          const isComplete = plan.completedDays.includes(d.day);
          const isFuture = d.day > getCurrentPlanDay(plan);
          return (
            <Pressable
              key={d.day}
              onPress={() => !isFuture && setCurrentDay(d.day)}
              className={`flex-1 items-center py-2 rounded-xl border ${
                isActive
                  ? "bg-primary border-primary"
                  : isComplete
                    ? "bg-primary/10 border-primary/40"
                    : isFuture
                      ? "bg-muted/50 border-border"
                      : "bg-card border-border"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive
                    ? "text-white"
                    : isFuture
                      ? "text-muted-foreground"
                      : "text-foreground"
                }`}
              >
                {d.day}
              </Text>
              {isComplete && !isActive && (
                <View className="w-2 h-2 rounded-full bg-primary mt-0.5" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Today's Focus Card */}
      <Card className="p-5 border-primary/40">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-10 h-10 rounded-xl bg-primary/15 items-center justify-center">
            <Target size={20} color="#3aa27f" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-medium text-primary uppercase tracking-wide">
              Today's Focus
            </Text>
            <Text className="text-lg font-bold text-foreground">
              {todayPlan.focus}
            </Text>
          </View>
        </View>
        {/* Progress bar */}
        <View className="h-2.5 bg-muted rounded-full overflow-hidden mt-2">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="text-xs text-muted-foreground mt-1.5">
          {completedCount}/{totalCount} tasks done
        </Text>
      </Card>

      {/* Tasks */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-foreground">Checklist</Text>
        {todayPlan.tasks.map((task) => (
          <Pressable
            key={task.id}
            onPress={() => handleToggleTask(task.id)}
            className={`flex-row items-start gap-3 p-4 rounded-xl border ${
              task.completed
                ? "bg-primary/10 border-primary/30"
                : "bg-card border-border"
            }`}
          >
            {task.completed ? (
              <CheckCircle size={22} color="#3aa27f" />
            ) : (
              <Circle size={22} color="#9ca3af" />
            )}
            <Text
              className={`flex-1 text-sm leading-relaxed ${
                task.completed
                  ? "text-muted-foreground line-through"
                  : "text-foreground"
              }`}
            >
              {task.text}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Day complete celebration */}
      {completedCount === totalCount && totalCount > 0 && (
        <Card className="p-5 bg-primary/10 border-primary/40 items-center gap-3">
          <Award size={32} color="#3aa27f" />
          <Text className="text-lg font-bold text-foreground text-center">
            Day {currentDay} complete!
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            {currentDay < 7
              ? "Come back tomorrow for your next set of tasks."
              : "You've finished the 7-day plan!"}
          </Text>
          {currentDay >= 7 && (
            <Button
              onPress={() => navigation.navigate("OnboardingDay7Summary")}
              className="w-full py-4 rounded-2xl mt-2"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-primary-foreground font-bold">
                  View Your Summary
                </Text>
                <ChevronRight size={18} color="#ffffff" />
              </View>
            </Button>
          )}
        </Card>
      )}

      {/* Bottom CTA */}
      <Pressable
        onPress={() => navigation.goBack()}
        className="py-3"
      >
        <Text className="text-center text-muted-foreground text-sm">
          Back to Home
        </Text>
      </Pressable>
    </Screen>
  );
}
