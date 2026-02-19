import { useState, useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import { ArrowRight, Clock, CalendarDays, Activity, Utensils, Moon, Bell } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { createUser } from "../services/storage";
import { configureRevenueCat } from "../services/revenuecat";
import { registerForPushNotifications, syncReminderNotifications } from "../services/notifications";
import { showToast } from "../utils/feedback";
import * as StoreReview from "expo-store-review";

const symptomTimingOptions = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night / while sleeping" },
];

const symptomFrequencyOptions = [
  { id: "rarely", label: "Rarely (1–2x/month)" },
  { id: "occasionally", label: "Occasionally (1–2x/week)" },
  { id: "frequently", label: "Frequently (3–5x/week)" },
  { id: "daily", label: "Daily" },
];

const topSymptomOptions = [
  { id: "heartburn", label: "Heartburn", emoji: "🔥" },
  { id: "chest_burning", label: "Chest burning", emoji: "💥" },
  { id: "regurgitation", label: "Regurgitation", emoji: "😮‍💨" },
  { id: "sour_taste", label: "Sour taste", emoji: "🍋" },
  { id: "throat_irritation", label: "Throat irritation / cough", emoji: "🧣" },
  { id: "bloating_pressure", label: "Bloating / pressure", emoji: "🎈" },
];

const afterEatingOptions = [
  { id: "within_30", label: "Yes, within 30 minutes" },
  { id: "within_2h", label: "Yes, within 1–2 hours" },
  { id: "after_3h", label: "Mostly later (3+ hours)" },
  { id: "not_sure", label: "Not sure" },
];

const lyingDownOptions = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "sometimes", label: "Sometimes" },
];

export default function OnboardingScreen({ navigation, route }) {
  const [step, setStep] = useState(0);
  const [symptomTiming, setSymptomTiming] = useState([]);
  const [symptomFrequency, setSymptomFrequency] = useState(null);
  const [topSymptoms, setTopSymptoms] = useState([]);
  const [symptomAfterEating, setSymptomAfterEating] = useState(null);
  const [worseLyingDown, setWorseLyingDown] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [reviewAvailable, setReviewAvailable] = useState(false);
  const onComplete = route?.params?.onComplete;
  const totalSteps = 7;
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("Onboarding");
    posthog?.capture("onboarding_started");

    // Check if store review is available on this device
    StoreReview.isAvailableAsync().then(setReviewAvailable).catch(() => setReviewAvailable(false));
  }, []);

  useEffect(() => {
    if (step > 0) {
      posthog?.capture("onboarding_step_completed", { step: step - 1 });
    }
  }, [step]);

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

      return {
        remindersEnabled,
        eveningReminderEnabled,
      };
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
        topSymptoms,
        symptomTiming,
        symptomFrequency,
        symptomAfterEating,
        worseLyingDown,
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
      });

      await syncReminderNotifications({
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
      }).catch((err) => console.warn("Sync reminders failed:", err));

      await configureRevenueCat(user.id).catch((err) =>
        console.warn("RevenueCat setup failed:", err)
      );

      posthog?.capture("onboarding_completed", {
        symptom_frequency: symptomFrequency,
        top_symptoms_count: topSymptoms.length,
        reminders_enabled: reminderSettings.remindersEnabled,
      });
      posthog?.identify(user.id, {
        symptom_frequency: symptomFrequency,
        top_symptoms: topSymptoms,
      });

      // Check if we should show signup screen (passed via onComplete return value or params)
      const nextScreen = onComplete?.() || "Paywall";
      navigation.replace(nextScreen);
    } catch (error) {
      console.warn("Onboarding completion failed:", error);
      showToast("Something went wrong", "Please try again.");
      setIsCompleting(false);
    }
  };

  return (
    <Screen contentClassName="gap-8">
      {step === 0 && (
        <View className="flex-1 items-center justify-center gap-8 px-2">
          <Mascot size="large" />
          <View className="items-center gap-3">
            <Text className="text-4xl font-extrabold text-foreground tracking-tight">
              GERDBuddy
            </Text>
            <Text className="text-lg text-muted-foreground text-center leading-relaxed">
              Your calm companion for understanding GERD patterns
            </Text>
          </View>
          <View className="w-full gap-4 mt-4">
            <Text className="text-sm text-muted-foreground/80 text-center leading-relaxed">
              Track meals, spot triggers, and take control of your digestive health.
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

      {step === 1 && (
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
            {symptomTimingOptions.map((option) => {
              const active = symptomTiming.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleTimingToggle(option.id)}
                  className={`flex-row items-center gap-4 p-4 rounded-xl border ${
                    active ? "bg-primary-light border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <Text className="flex-1 text-left font-medium text-foreground">
                    {option.label}
                  </Text>
                  <View
                    className={`w-5 h-5 rounded-md border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="bg-accent-light border border-accent/40 rounded-xl p-4">
            <Text className="text-sm text-foreground font-semibold mb-1">Why this matters</Text>
            <Text className="text-sm text-muted-foreground">
              Nighttime GERD behaves differently. It guides meal timing advice, trigger weighting, and
              notification timing.
            </Text>
          </View>

          <Button
            disabled={symptomTiming.length === 0}
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

      {step === 2 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-accent-light items-center justify-center">
              <CalendarDays size={26} color="#f07c52" />
            </View>
            <Text className="text-2xl font-bold text-foreground">
              How often do you experience reflux symptoms?
            </Text>
            <Text className="text-muted-foreground">Choose one</Text>
          </View>

          <View className="gap-3">
            {symptomFrequencyOptions.map((option) => {
              const active = symptomFrequency === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSymptomFrequency(option.id)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${
                    active ? "bg-primary-light border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <Text className="text-foreground font-medium">{option.label}</Text>
                  <View
                    className={`w-5 h-5 rounded-full border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="bg-accent-light border border-accent/40 rounded-xl p-4">
            <Text className="text-sm text-foreground font-semibold mb-1">Why</Text>
            <Text className="text-sm text-muted-foreground">
              Sets a baseline so we do not over-alarm users with mild GERD.
            </Text>
          </View>

          <Button
            disabled={!symptomFrequency}
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

      {step === 3 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Activity size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Which symptoms do you experience most?</Text>
            <Text className="text-muted-foreground">Select all that apply</Text>
          </View>

          <View className="gap-3">
            {topSymptomOptions.map((symptom) => {
              const active = topSymptoms.includes(symptom.id);
              return (
                <Pressable
                  key={symptom.id}
                  onPress={() => handleSymptomToggle(symptom.id)}
                  className={`flex-row items-center gap-4 p-4 rounded-xl border ${
                    active ? "bg-primary-light border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <Text className="text-2xl">{symptom.emoji}</Text>
                  <Text className="flex-1 text-left font-medium text-foreground">
                    {symptom.label}
                  </Text>
                  <View
                    className={`w-5 h-5 rounded-md border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="bg-accent-light border border-accent/40 rounded-xl p-4">
            <Text className="text-sm text-foreground font-semibold mb-1">Why</Text>
            <Text className="text-sm text-muted-foreground">
              Different symptoms point to different triggers like acid, volume, or gas.
            </Text>
          </View>

          <Button
            disabled={topSymptoms.length === 0}
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

      {step === 4 && (
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
            {afterEatingOptions.map((option) => {
              const active = symptomAfterEating === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSymptomAfterEating(option.id)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${
                    active ? "bg-primary-light border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <Text className="text-foreground font-medium">{option.label}</Text>
                  <View
                    className={`w-5 h-5 rounded-full border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="bg-accent-light border border-accent/40 rounded-xl p-4">
            <Text className="text-sm text-foreground font-semibold mb-1">Why this matters</Text>
            <Text className="text-sm text-muted-foreground">
              Helps portion-size guidance, fat digestion assumptions, and AI food photo interpretation.
            </Text>
          </View>

          <Button
            disabled={!symptomAfterEating}
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

      {step === 5 && (
        <View className="gap-6">
          <View className="items-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <Moon size={26} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground">Are symptoms worse when lying down?</Text>
          </View>

          <View className="gap-3">
            {lyingDownOptions.map((option) => {
              const active = worseLyingDown === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setWorseLyingDown(option.id)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border ${
                    active ? "bg-primary-light border-primary/40" : "bg-card border-border"
                  }`}
                >
                  <Text className="text-foreground font-medium">{option.label}</Text>
                  <View
                    className={`w-5 h-5 rounded-full border ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="bg-accent-light border border-accent/40 rounded-xl p-4">
            <Text className="text-sm text-foreground font-semibold mb-1">Why this matters</Text>
            <Text className="text-sm text-muted-foreground">
              Points to lower esophageal sphincter sensitivity and night reflux risk.
            </Text>
          </View>

          <Button
            disabled={!worseLyingDown}
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

      {step === 6 && (
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

          <Button onPress={() => setStep(7)} className="w-full py-4 rounded-2xl">
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-primary-foreground font-bold text-base">Continue</Text>
              <ArrowRight size={18} color="#ffffff" />
            </View>
          </Button>
        </View>
      )}

      {step === 7 && (
        <View className="flex-1 items-center justify-center gap-6">
          <View className="w-20 h-20 rounded-3xl bg-primary/10 items-center justify-center">
            <Text className="text-4xl">⭐</Text>
          </View>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-foreground text-center">
              Enjoying GERDBuddy?
            </Text>
            <Text className="text-muted-foreground text-center max-w-xs">
              Your feedback helps others discover our app and motivates us to keep improving.
            </Text>
          </View>

          <Mascot
            size="small"
            message="A quick review would mean the world to me!"
          />

          <View className="w-full gap-3">
            {reviewAvailable && (
              <Button
                onPress={async () => {
                  try {
                    await StoreReview.requestReview();
                    posthog?.capture("onboarding_review_requested");
                  } catch (error) {
                    console.warn("Store review failed:", error);
                  }
                  handleComplete();
                }}
                className="w-full"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-primary-foreground font-semibold">Rate the App</Text>
                  <Text className="text-primary-foreground">⭐</Text>
                </View>
              </Button>
            )}

            <Pressable
              onPress={() => {
                posthog?.capture("onboarding_review_skipped");
                handleComplete();
              }}
              disabled={isCompleting}
              className="py-3"
            >
              <Text className="text-center text-muted-foreground">
                {isCompleting ? "Setting up..." : "Maybe later"}
              </Text>
            </Pressable>
          </View>
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
