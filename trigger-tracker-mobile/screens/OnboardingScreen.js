import { useState, useEffect } from "react";
import { Text, View, Pressable, TextInput } from "react-native";
import {
  ArrowRight, Clock, CalendarDays, Activity, Utensils, Moon, Bell,
  Pill, AlertTriangle, ChevronRight, Heart,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { createUser } from "../services/storage";
import { configureRevenueCat } from "../services/revenuecat";
import { registerForPushNotifications, syncReminderNotifications } from "../services/notifications";
import { showToast } from "../utils/feedback";
import { generatePlan, getFearFoodOptions, MEAL_TIME_OPTIONS, MEDS_OPTIONS } from "../services/onboardingPlan";
import { EVENTS } from "../services/analytics";

const symptomTimingOptions = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night / while sleeping" },
];

const symptomFrequencyOptions = [
  { id: "rarely", label: "Rarely (1-2x/month)" },
  { id: "occasionally", label: "Occasionally (1-2x/week)" },
  { id: "frequently", label: "Frequently (3-5x/week)" },
  { id: "daily", label: "Daily" },
];

const gerdSymptomOptions = [
  { id: "heartburn", label: "Heartburn" },
  { id: "chest_burning", label: "Chest burning" },
  { id: "regurgitation", label: "Regurgitation" },
  { id: "sour_taste", label: "Sour taste" },
  { id: "throat_irritation", label: "Throat irritation / cough" },
  { id: "bloating_pressure", label: "Bloating / pressure" },
];

const gastritisSymptomOptions = [
  { id: "stomach_pain", label: "Stomach pain / cramping" },
  { id: "nausea", label: "Nausea" },
  { id: "bloating_pressure", label: "Bloating / pressure" },
  { id: "loss_of_appetite", label: "Loss of appetite" },
  { id: "feeling_full", label: "Feeling full quickly" },
  { id: "indigestion", label: "Indigestion / burning" },
];

const bothSymptomOptions = [
  { id: "heartburn", label: "Heartburn" },
  { id: "stomach_pain", label: "Stomach pain / cramping" },
  { id: "nausea", label: "Nausea" },
  { id: "regurgitation", label: "Regurgitation" },
  { id: "bloating_pressure", label: "Bloating / pressure" },
  { id: "sour_taste", label: "Sour taste" },
  { id: "throat_irritation", label: "Throat irritation / cough" },
  { id: "loss_of_appetite", label: "Loss of appetite" },
];

const afterEatingOptions = [
  { id: "within_30", label: "Yes, within 30 minutes" },
  { id: "within_2h", label: "Yes, within 1-2 hours" },
  { id: "after_3h", label: "Mostly later (3+ hours)" },
  { id: "not_sure", label: "Not sure" },
];

const lyingDownOptions = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "sometimes", label: "Sometimes" },
];

const conditionOptions = [
  { id: "gerd", label: "Acid Reflux / GERD" },
  { id: "gastritis", label: "Gastritis" },
];

const severityOptions = [
  { id: "light", label: "Light", description: "Occasional discomfort, manageable" },
  { id: "moderate", label: "Moderate", description: "Regular symptoms, affects daily life" },
  { id: "severe", label: "Severe", description: "Frequent, intense symptoms" },
];

export default function OnboardingScreen({ navigation, route }) {
  const [step, setStep] = useState(0);
  // Existing fields
  const [symptomTiming, setSymptomTiming] = useState([]);
  const [symptomFrequency, setSymptomFrequency] = useState(null);
  const [topSymptoms, setTopSymptoms] = useState([]);
  const [symptomAfterEating, setSymptomAfterEating] = useState(null);
  const [worseLyingDown, setWorseLyingDown] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  // Condition selection
  const [conditions, setConditions] = useState([]);
  // New triage fields
  const [severity, setSeverity] = useState(null);
  const [fearFoods, setFearFoods] = useState([]);
  const [customFearFood, setCustomFearFood] = useState("");
  const [customFearFoods, setCustomFearFoods] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [medsStatus, setMedsStatus] = useState(null);

  const onComplete = route?.params?.onComplete;
  const totalSteps = 11; // 0=welcome, 1=conditions, 2=severity, 3=timing, 4=frequency, 5=symptoms, 6=afterEating, 7=lyingDown, 8=fearFoods, 9=mealTimes+meds, 10=reminders
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("Onboarding");
    posthog?.capture("onboarding_started");
  }, []);

  useEffect(() => {
    if (step === 1) {
      posthog?.capture(EVENTS.ONBOARDING_TRIAGE_STARTED);
    }
    if (step > 0) {
      posthog?.capture("onboarding_step_completed", { step: step - 1 });
    }
  }, [step]);

  const handleConditionToggle = (id) => {
    setConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSymptomToggle = (id) => {
    setTopSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleTimingToggle = (id) => {
    setSymptomTiming((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFearFoodToggle = (id) => {
    setFearFoods((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleMealTimeToggle = (id) => {
    setMealTimes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const addCustomFearFood = () => {
    const trimmed = customFearFood.trim();
    if (trimmed && !customFearFoods.includes(trimmed)) {
      setCustomFearFoods((prev) => [...prev, trimmed]);
      setCustomFearFood("");
    }
  };

  const removeCustomFearFood = (food) => {
    setCustomFearFoods((prev) => prev.filter((f) => f !== food));
  };

  const normalizeReminderSettings = async () => {
    if (!remindersEnabled && !eveningReminderEnabled) {
      return { remindersEnabled: false, eveningReminderEnabled: false };
    }

    try {
      const result = await registerForPushNotifications();
      if (!result.permission.granted) {
        setRemindersEnabled(false);
        setEveningReminderEnabled(false);
        if (!result.permission.canAskAgain) {
          showToast(
            "Notifications disabled",
            "Go to Settings > GERD Buddy > Notifications to enable reminders."
          );
        } else {
          showToast(
            "Notifications not enabled",
            "You can enable reminders later in the app settings."
          );
        }
        return { remindersEnabled: false, eveningReminderEnabled: false };
      }
      return { remindersEnabled, eveningReminderEnabled };
    } catch (error) {
      showToast(
        "Notifications unavailable",
        "We could not register this device. You can retry from Settings."
      );
      return { remindersEnabled: false, eveningReminderEnabled: false };
    }
  };

  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      const reminderSettings = await normalizeReminderSettings();
      const user = await createUser({
        conditions: conditions.length > 0 ? conditions : ["gerd"],
        topSymptoms,
        symptomTiming,
        symptomFrequency,
        symptomAfterEating,
        worseLyingDown,
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
        // New triage fields
        severity: severity || "moderate",
        fearFoods,
        customFearFoods,
        mealTimes,
        medsStatus: medsStatus || "none",
      });

      await syncReminderNotifications({
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
      }).catch((err) => console.warn("Sync reminders failed:", err));

      await configureRevenueCat(user.id).catch((err) =>
        console.warn("RevenueCat setup failed:", err)
      );

      // Generate 7-day plan
      const plan = await generatePlan({
        conditions: conditions.length > 0 ? conditions : ["gerd"],
        severity: severity || "moderate",
        fearFoods,
        customFearFoods,
        mealTimes,
        medsStatus: medsStatus || "none",
      });

      posthog?.capture(EVENTS.ONBOARDING_TRIAGE_COMPLETED, {
        conditions,
        severity_level: severity,
        fear_foods_count: fearFoods.length + customFearFoods.length,
        meds_status: medsStatus,
        symptom_frequency: symptomFrequency,
        top_symptoms_count: topSymptoms.length,
        reminders_enabled: reminderSettings.remindersEnabled,
      });
      posthog?.capture(EVENTS.ONBOARDING_PLAN_GENERATED, {
        severity_level: severity,
        plan_id: plan.id,
      });
      posthog?.capture("onboarding_completed", {
        symptom_frequency: symptomFrequency,
        top_symptoms_count: topSymptoms.length,
        reminders_enabled: reminderSettings.remindersEnabled,
      });
      posthog?.identify(user.id, {
        symptom_frequency: symptomFrequency,
        top_symptoms: topSymptoms,
        severity_level: severity,
        meds_status: medsStatus,
      });

      // Navigate to SignUp if Firebase is configured, otherwise straight to Main
      const nextScreen = onComplete?.() || "Main";
      navigation.replace(nextScreen);
    } catch (error) {
      console.warn("Onboarding completion failed:", error);
      showToast("Something went wrong", "Please try again.");
      setIsCompleting(false);
    }
  };

  const renderMultiSelectOption = (option, selected, onToggle) => {
    const active = selected.includes(option.id);
    return (
      <Pressable
        key={option.id}
        onPress={() => onToggle(option.id)}
        className={`flex-row items-center gap-4 p-4 rounded-xl border ${
          active ? "bg-primary-light border-primary/40" : "bg-card border-border"
        }`}
      >
        {option.emoji && <Text className="text-2xl">{option.emoji}</Text>}
        <View className="flex-1">
          <Text className="text-left font-medium text-foreground">
            {option.label}
          </Text>
          {option.description && (
            <Text className="text-xs text-muted-foreground mt-0.5">{option.description}</Text>
          )}
        </View>
        <View
          className={`w-5 h-5 rounded-md border ${
            active ? "bg-primary border-primary" : "border-border"
          }`}
        />
      </Pressable>
    );
  };

  const renderSingleSelectOption = (option, selected, onSelect) => {
    const active = selected === option.id;
    return (
      <Pressable
        key={option.id}
        onPress={() => onSelect(option.id)}
        className={`flex-row items-center justify-between p-4 rounded-xl border ${
          active ? "bg-primary-light border-primary/40" : "bg-card border-border"
        }`}
      >
        <View className="flex-1">
          <Text className="text-foreground font-medium">{option.label}</Text>
          {option.description && (
            <Text className="text-xs text-muted-foreground mt-0.5">{option.description}</Text>
          )}
        </View>
        <View
          className={`w-5 h-5 rounded-full border ${
            active ? "bg-primary border-primary" : "border-border"
          }`}
        />
      </Pressable>
    );
  };

  return (
    <Screen contentClassName="gap-8">
      {/* Step 0: Welcome */}
      {step === 0 && (
        <View className="flex-1 items-center justify-center gap-8 px-2">
          <Mascot size="large" />
          <View className="items-center gap-3">
            <Text className="text-4xl font-extrabold text-foreground tracking-tight">
              GERDBuddy
            </Text>
            <Text className="text-lg text-muted-foreground text-center leading-relaxed">
              Your calm companion for acid reflux & gastritis
            </Text>
          </View>
          <View className="w-full gap-4 mt-4">
            <Text className="text-sm text-muted-foreground/80 text-center leading-relaxed">
              Answer a few quick questions (~60 seconds) and we'll build your personalized 7-day plan.
            </Text>
            <Button
              className="w-full py-5 rounded-2xl shadow-sm"
              onPress={() => setStep(1)}
            >

              <View className="flex-row items-center justify-center gap-3">
                <Text className="text-primary-foreground font-bold text-lg">Get Started</Text>
                <ArrowRight size={20} color="#ffffff" />
              </View>
            </Button>
            <Text className="text-xs text-muted-foreground/60 text-center">
              Educational purposes only. Not medical advice.
            </Text>
          </View>
        </View>
      )}

      {/* Step 1: Condition Selection */}
      {step === 1 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Heart size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              What are you dealing with?
            </Text>
            <Text className="text-muted-foreground">Select all that apply</Text>
          </View>

          <View className="gap-3">
            {conditionOptions.map((option) =>
              renderMultiSelectOption(option, conditions, handleConditionToggle)
            )}
          </View>

          <Button
            disabled={conditions.length === 0}
            onPress={() => setStep(2)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 2: Symptom Severity */}
      {step === 2 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <AlertTriangle size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              How severe are your symptoms?
            </Text>
            <Text className="text-muted-foreground">This helps us calibrate your plan</Text>
          </View>

          <View className="gap-3">
            {severityOptions.map((option) =>
              renderSingleSelectOption(option, severity, setSeverity)
            )}
          </View>

          <Button
            disabled={!severity}
            onPress={() => setStep(3)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 3: Symptom Timing */}
      {step === 3 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Clock size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              When do you usually experience symptoms?
            </Text>
            <Text className="text-muted-foreground">Select all that apply</Text>
          </View>

          <View className="gap-3">
            {symptomTimingOptions.map((option) =>
              renderMultiSelectOption(option, symptomTiming, handleTimingToggle)
            )}
          </View>

          <Button
            disabled={symptomTiming.length === 0}
            onPress={() => setStep(4)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 4: Frequency */}
      {step === 4 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <CalendarDays size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              How often do you experience symptoms?
            </Text>
            <Text className="text-muted-foreground">Choose one</Text>
          </View>

          <View className="gap-3">
            {symptomFrequencyOptions.map((option) =>
              renderSingleSelectOption(option, symptomFrequency, setSymptomFrequency)
            )}
          </View>

          <Button
            disabled={!symptomFrequency}
            onPress={() => setStep(5)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 5: Top Symptoms */}
      {step === 5 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Activity size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Which symptoms do you experience most?</Text>
            <Text className="text-muted-foreground">Select all that apply</Text>
          </View>

          <View className="gap-3">
            {(conditions.includes("gerd") && conditions.includes("gastritis")
              ? bothSymptomOptions
              : conditions.includes("gastritis")
              ? gastritisSymptomOptions
              : gerdSymptomOptions
            ).map((symptom) =>
              renderMultiSelectOption(symptom, topSymptoms, handleSymptomToggle)
            )}
          </View>

          <Button
            disabled={topSymptoms.length === 0}
            onPress={() => setStep(6)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 6: After Eating */}
      {step === 6 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <Utensils size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              Do symptoms usually happen after eating?
            </Text>
          </View>

          <View className="gap-3">
            {afterEatingOptions.map((option) =>
              renderSingleSelectOption(option, symptomAfterEating, setSymptomAfterEating)
            )}
          </View>

          <Button
            disabled={!symptomAfterEating}
            onPress={() => setStep(7)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 7: Lying Down */}
      {step === 7 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Moon size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Are symptoms worse when lying down?</Text>
          </View>

          <View className="gap-3">
            {lyingDownOptions.map((option) =>
              renderSingleSelectOption(option, worseLyingDown, setWorseLyingDown)
            )}
          </View>

          <Button
            disabled={!worseLyingDown}
            onPress={() => setStep(8)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 8: Fear Foods */}
      {step === 8 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <Utensils size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              Which foods worry you most?
            </Text>
            <Text className="text-muted-foreground">Select any you suspect are triggers</Text>
          </View>

          <View className="gap-2">
            {getFearFoodOptions(conditions).map((option) =>
              renderMultiSelectOption(option, fearFoods, handleFearFoodToggle)
            )}
          </View>

          {/* Custom fear food input */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">Add your own:</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={customFearFood}
                onChangeText={setCustomFearFood}
                placeholder="e.g. avocado"
                placeholderTextColor="#9ca3af"
                className="flex-1 border border-border rounded-xl px-4 py-3 text-foreground bg-card"
                onSubmitEditing={addCustomFearFood}
                returnKeyType="done"
              />
              <Button
                onPress={addCustomFearFood}
                disabled={!customFearFood.trim()}
                className="px-4 rounded-xl"
              >
                <Text className="text-primary-foreground font-semibold">Add</Text>
              </Button>
            </View>
            {customFearFoods.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-1">
                {customFearFoods.map((food) => (
                  <Pressable
                    key={food}
                    onPress={() => removeCustomFearFood(food)}
                    className="flex-row items-center gap-1 bg-accent-light border border-accent/30 rounded-full px-3 py-1.5"
                  >
                    <Text className="text-sm text-foreground">{food}</Text>
                    <Text className="text-muted-foreground ml-1">x</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Button
            onPress={() => setStep(9)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">
                {fearFoods.length === 0 && customFearFoods.length === 0 ? "Skip" : "Continue"}
              </Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 9: Meal Times + Meds */}
      {step === 9 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Clock size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              Your usual meal times
            </Text>
            <Text className="text-muted-foreground">Select all that apply</Text>
          </View>

          <View className="gap-2">
            {MEAL_TIME_OPTIONS.map((option) =>
              renderMultiSelectOption(option, mealTimes, handleMealTimeToggle)
            )}
          </View>

          <View className="items-center gap-3 mt-2">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <Pill size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              Current medication?
            </Text>
          </View>

          <View className="gap-2">
            {MEDS_OPTIONS.map((option) =>
              renderSingleSelectOption(option, medsStatus, setMedsStatus)
            )}
          </View>

          <Button
            disabled={mealTimes.length === 0 || !medsStatus}
            onPress={() => setStep(10)}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {/* Step 10: Reminders */}
      {step === 10 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Bell size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Enable reminders?</Text>
            <Text className="text-muted-foreground">Gentle nudges to help you track consistently</Text>
          </View>

          <View className="gap-4">
            <View className="bg-card border border-border rounded-2xl p-5 flex-row items-center justify-between">
              <View className="gap-1">
                <Text className="font-semibold text-foreground">Daily reminders</Text>
                <Text className="text-sm text-muted-foreground">
                  Remind me to log meals & symptoms
                </Text>
              </View>
              <Pressable
                onPress={() => setRemindersEnabled((v) => !v)}
                className={`w-12 h-7 rounded-full px-1 ${remindersEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white mt-1 ${
                    remindersEnabled ? "ml-5" : "ml-0"
                  }`}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setEveningReminderEnabled((v) => !v)}
              className={`bg-card border border-border rounded-2xl p-5 flex-row items-center justify-between ${
                eveningReminderEnabled ? "bg-accent-light border-accent/40" : ""
              }`}
            >
              <View className="gap-1">
                <Text className="font-semibold text-foreground">Evening reminder</Text>
                <Text className="text-sm text-muted-foreground">Avoid eating 2 hours before bed</Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full px-1 ${
                  eveningReminderEnabled ? "bg-accent" : "bg-muted"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white mt-1 ${
                    eveningReminderEnabled ? "ml-5" : "ml-0"
                  }`}
                />
              </View>
            </Pressable>
          </View>

          <View className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <Text className="text-sm font-semibold text-foreground mb-1">
              Your 7-day plan is ready
            </Text>
            <Text className="text-sm text-muted-foreground">
              After setup, you'll get a personalized daily checklist to help you identify your triggers in just one week.
            </Text>
          </View>

          <Button
            onPress={handleComplete}
            disabled={isCompleting}
            className="w-full py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">
                {isCompleting ? "Setting up your plan..." : "Start My 7-Day Plan"}
              </Text>
              <ChevronRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      <View className="flex-row justify-center gap-2 mt-6">
        {Array.from({ length: totalSteps + 1 }, (_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${i === step ? "w-8 bg-primary" : "w-2 bg-muted"}`}
          />
        ))}
      </View>
    </Screen>
  );
}
