import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, ArrowRight, Check, X, Star, Heart, Shield, TrendingUp,
  Clock, CalendarDays, Activity, Utensils, Moon, Bell, Pill, AlertTriangle,
  Flame, Zap, Scan,
} from "lucide-react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import { usePostHog } from "posthog-react-native";
import Purchases from "react-native-purchases";
import { createUser } from "../services/storage";
import { configureRevenueCat } from "../services/revenuecat";
import { registerForPushNotifications, syncReminderNotifications } from "../services/notifications";
import { showToast } from "../utils/feedback";
import { generatePlan, getFearFoodOptions, MEAL_TIME_OPTIONS, MEDS_OPTIONS } from "../services/onboardingPlan";
import { EVENTS } from "../services/analytics";
import SignUpScreen from "./SignUpScreen";
import { useAuth } from "../contexts/AuthContext";

// -- Theme --

const COLORS = {
  primary: "#3aa27f",
  primaryLight: "#e6f4ef",
  primaryDark: "#2d8a6b",
  accent: "#f07c52",
  accentLight: "#ffe7dc",
  bg: "#f6fbf8",
  card: "#ffffff",
  text: "#1f2a30",
  textSecondary: "#5f6f74",
  border: "#e1e8e3",
  muted: "#edf2ee",
  danger: "#c44040",
  dangerLight: "#FEE2E2",
  gold: "#D4A439",
};

const mascotExcited = require("../assets/mascot/turtle_excited.png");
const mascotHappy = require("../assets/mascot/turtle_happy.png");
const mascotContent = require("../assets/mascot/turtle_content.png");
const mascotSad = require("../assets/mascot/turtle_sad.png");
const mascotDefault = require("../assets/mascot/turtle_shell_standing.png");

const TOTAL_STEPS = 16; // steps 0-15

// -- Quiz data --

const conditionOptions = [
  { id: "gerd", label: "Acid Reflux / GERD" },
  { id: "gastritis", label: "Gastritis" },
];

const severityOptions = [
  { id: "light", label: "Light", description: "Occasional discomfort, manageable" },
  { id: "moderate", label: "Moderate", description: "Regular symptoms, affects daily life" },
  { id: "severe", label: "Severe", description: "Frequent, intense symptoms" },
];

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

const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// -- Progress Bar --

function ProgressBar({ step }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / (TOTAL_STEPS - 1), { duration: 300 });
  }, [step]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: COLORS.border, flex: 1, marginLeft: 12 }}>
      <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: COLORS.primary }, barStyle]} />
    </View>
  );
}

// -- Option Card --

function OptionCard({ label, description, selected, onPress, showCheck, icon: Icon }) {
  return (
    <Pressable
      onPress={() => { haptic(); onPress(); }}
      style={{
        backgroundColor: selected ? COLORS.primary : COLORS.card,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: selected ? COLORS.primary : COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
        {Icon && (
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: selected ? "rgba(255,255,255,0.2)" : COLORS.primaryLight,
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={18} color={selected ? "#FFFFFF" : COLORS.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: selected ? "#FFFFFF" : COLORS.text }}>
            {label}
          </Text>
          {description && (
            <Text style={{ fontSize: 13, color: selected ? "rgba(255,255,255,0.7)" : COLORS.textSecondary, marginTop: 2 }}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {showCheck && selected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
    </Pressable>
  );
}

// -- Continue Button --

function ContinueButton({ onPress, disabled, label = "Continue" }) {
  return (
    <Pressable
      onPress={() => { if (!disabled) { haptic(); onPress(); } }}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? COLORS.muted : COLORS.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: "center",
        shadowColor: disabled ? "transparent" : COLORS.primary,
        shadowOpacity: disabled ? 0 : 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: disabled ? 0 : 4,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "700", color: disabled ? COLORS.textSecondary : "#FFFFFF" }}>
        {label}
      </Text>
    </Pressable>
  );
}

// -- Stat Card --

function StatCard({ value, label, color = COLORS.primary }) {
  return (
    <View style={{
      flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
      alignItems: "center", gap: 4, borderWidth: 1, borderColor: COLORS.border,
    }}>
      <Text style={{ fontSize: 28, fontWeight: "900", color }}>{value}</Text>
      <Text style={{ fontSize: 12, fontWeight: "500", color: COLORS.textSecondary, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

// -- Back Button --

function BackButton({ onPress }) {
  return (
    <Pressable
      onPress={() => { haptic(); onPress(); }}
      style={{
        width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.muted,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <ArrowLeft size={20} color={COLORS.text} />
    </Pressable>
  );
}

// -- Welcome Step (step 0) --

function WelcomeStep({ onStart }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
      <View style={{
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center", justifyContent: "center", marginBottom: 32,
      }}>
        <Image source={mascotDefault} style={{ width: 160, height: 160 }} resizeMode="contain" />
      </View>

      <Text style={{
        fontSize: 34, fontWeight: "900", color: COLORS.text,
        textAlign: "center", letterSpacing: -0.5, lineHeight: 40,
      }}>
        GERDBuddy
      </Text>
      <Text style={{
        fontSize: 16, color: COLORS.textSecondary,
        textAlign: "center", marginTop: 12, lineHeight: 22,
      }}>
        Your calm companion for{"\n"}acid reflux & gastritis
      </Text>

      <View style={{ width: "100%", marginTop: 48, gap: 12 }}>
        <Text style={{
          fontSize: 14, color: COLORS.textSecondary,
          textAlign: "center", lineHeight: 20, marginBottom: 8,
        }}>
          Answer a few quick questions (~60 seconds){"\n"}and we'll build your personalized 7-day plan.
        </Text>
        <Pressable
          onPress={() => { haptic(); onStart(); }}
          style={{
            backgroundColor: COLORS.primary, borderRadius: 16,
            paddingVertical: 20, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 10,
            shadowColor: COLORS.primary, shadowOpacity: 0.35,
            shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Get Started</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </Pressable>
        <Text style={{
          fontSize: 12, color: COLORS.textSecondary,
          textAlign: "center", marginTop: 4, opacity: 0.6,
        }}>
          Educational purposes only. Not medical advice.
        </Text>
      </View>
    </View>
  );
}

// -- Health Stats Step (step 4) --

function HealthStatsStep() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ gap: 24 }}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34 }}>
            Why managing acid{"\n"}reflux matters
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 8 }}>
            Here's what the research shows.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard value="72%" label="of GERD patients improve with trigger tracking" />
          <StatCard value="3x" label="faster symptom relief with guided plans" color={COLORS.accent} />
        </View>

        <View style={{
          backgroundColor: COLORS.card, borderRadius: 16, padding: 20, gap: 16,
          borderWidth: 1, borderColor: COLORS.border,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center",
            }}>
              <Heart size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>Reduced Flare-Ups</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                Tracking food triggers reduces acid reflux episodes by identifying your personal patterns.
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: COLORS.accentLight, alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>Better Sleep & Energy</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                Managing symptoms at night improves sleep quality and daily energy levels significantly.
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.border }} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "#FFF3E0", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={20} color="#E65100" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>Long-Term Healing</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                Consistent tracking leads to lasting lifestyle changes, not just temporary relief.
              </Text>
            </View>
          </View>
        </View>

        <View style={{
          backgroundColor: COLORS.primaryLight, borderRadius: 16, padding: 20,
          flexDirection: "row", alignItems: "center", gap: 14,
        }}>
          <Image source={mascotContent} style={{ width: 48, height: 48 }} resizeMode="contain" />
          <Text style={{ fontSize: 14, color: COLORS.text, flex: 1, fontWeight: "500", lineHeight: 20 }}>
            GERDBuddy helps you identify your unique triggers and build a personalized healing plan.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// -- Value Prop Step (step 8) --

function ValuePropStep() {
  const withoutItems = [
    "Randomly avoid foods and hope for the best",
    "Miss hidden triggers in your diet",
    "Suffer through flare-ups without answers",
    "Feel frustrated and stuck",
  ];
  const withItems = [
    "Scan meals and track triggers instantly",
    "Identify your personal trigger patterns",
    "Get actionable insights after every meal",
    "Build a diet that works for you",
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ gap: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34 }}>
          Take control of{"\n"}your symptoms
        </Text>

        <View style={{
          backgroundColor: COLORS.card, borderRadius: 20, padding: 20, gap: 20,
          borderWidth: 1, borderColor: COLORS.border,
        }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Without GerdBuddy */}
            <View style={{ flex: 1, gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Image source={mascotSad} style={{ width: 48, height: 48 }} resizeMode="contain" />
              </View>
              <View style={{
                backgroundColor: COLORS.dangerLight, borderRadius: 10,
                paddingVertical: 8, alignItems: "center",
              }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.danger }}>Without GERDBuddy</Text>
              </View>
              {withoutItems.map((item) => (
                <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: COLORS.dangerLight,
                    alignItems: "center", justifyContent: "center", marginTop: 1,
                  }}>
                    <X size={11} color={COLORS.danger} strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 18 }}>{item}</Text>
                </View>
              ))}
            </View>

            {/* With GerdBuddy */}
            <View style={{ flex: 1, gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <Image source={mascotExcited} style={{ width: 48, height: 48 }} resizeMode="contain" />
              </View>
              <View style={{
                backgroundColor: COLORS.primaryLight, borderRadius: 10,
                paddingVertical: 8, alignItems: "center",
              }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.primary }}>With GERDBuddy</Text>
              </View>
              {withItems.map((item) => (
                <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: COLORS.primaryLight,
                    alignItems: "center", justifyContent: "center", marginTop: 1,
                  }}>
                    <Check size={11} color={COLORS.primary} strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1, lineHeight: 18 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{
          backgroundColor: COLORS.primary, borderRadius: 16, padding: 20,
          alignItems: "center", gap: 4,
        }}>
          <Text style={{ fontSize: 32, fontWeight: "900", color: "#FFFFFF" }}>85%</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
            of users identify their top triggers{"\n"}within 14 days
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// -- Loading Step (step 15) --

function LoadingStep({ onComplete }) {
  const items = [
    { label: "Analyzing your symptoms", icon: Shield },
    { label: "Building your trigger profile", icon: Scan },
    { label: "Personalizing your plan", icon: Flame },
  ];
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let count = 0;
    timerRef.current = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= items.length) {
        clearInterval(timerRef.current);
        setTimeout(() => onComplete(), 800);
      }
    }, 900);
    return () => { clearInterval(timerRef.current); };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 40 }}>
      <View style={{
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center", justifyContent: "center",
      }}>
        <Image source={mascotHappy} style={{ width: 110, height: 110 }} resizeMode="contain" />
      </View>

      <Text style={{
        fontSize: 28, fontWeight: "900", color: COLORS.text,
        textAlign: "center", lineHeight: 34,
      }}>
        Setting up your{"\n"}healing profile...
      </Text>

      <View style={{ gap: 16, width: "100%", paddingHorizontal: 32 }}>
        {items.map((item, idx) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(idx * 900).duration(400)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 14,
              opacity: idx < visibleCount ? 1 : 0,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: COLORS.primary,
              alignItems: "center", justifyContent: "center",
            }}>
              <item.icon size={18} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>{item.label}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// -- Main Screen --

export default function OnboardingScreen({ navigation, route }) {
  const [step, setStep] = useState(0);
  const [conditions, setConditions] = useState([]);
  const [severity, setSeverity] = useState(null);
  const [symptomTiming, setSymptomTiming] = useState([]);
  const [symptomFrequency, setSymptomFrequency] = useState(null);
  const [topSymptoms, setTopSymptoms] = useState([]);
  const [symptomAfterEating, setSymptomAfterEating] = useState(null);
  const [worseLyingDown, setWorseLyingDown] = useState(null);
  const [fearFoods, setFearFoods] = useState([]);
  const [customFearFood, setCustomFearFood] = useState("");
  const [customFearFoods, setCustomFearFoods] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [medsStatus, setMedsStatus] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const posthog = usePostHog();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    posthog?.screen("Onboarding");
    posthog?.capture("onboarding_started");
  }, []);

  useEffect(() => {
    if (step === 1) posthog?.capture(EVENTS.ONBOARDING_TRIAGE_STARTED);
    if (step === 12) {
      posthog?.capture("onboarding_rating_prompted");
      StoreReview.requestReview().catch(() => {});
    }
    if (step > 0) posthog?.capture("onboarding_step_completed", { step: step - 1 });
  }, [step]);

  useEffect(() => {
    if (step !== 14) return;
    if (isAuthenticated && user?.email) {
      Purchases.setEmail(user.email).catch((err) => {
        console.warn("Failed to sync RevenueCat email:", err);
      });
      setStep(15);
    }
  }, [step, isAuthenticated, user]);

  useEffect(() => {
    if (step !== 14) return;
    if (isAuthenticated) return; // auto-skip handles this case; don't double-count
    posthog?.capture(EVENTS.ONBOARDING_SIGNUP_SHOWN, { step_index: 14 });
  }, [step, isAuthenticated]);

  // -- Toggle helpers --

  const toggle = (setter, id) => {
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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

  // -- Completion --

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
          showToast("Notifications disabled", "Go to Settings > GERD Buddy > Notifications to enable reminders.");
        } else {
          showToast("Notifications not enabled", "You can enable reminders later in the app settings.");
        }
        return { remindersEnabled: false, eveningReminderEnabled: false };
      }
      return { remindersEnabled, eveningReminderEnabled };
    } catch (error) {
      showToast("Notifications unavailable", "We could not register this device. You can retry from Settings.");
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

      navigation.replace("Paywall");
    } catch (error) {
      console.warn("Onboarding completion failed:", error);
      showToast("Something went wrong", "Please try again.");
      setIsCompleting(false);
    }
  };

  const goNext = () => { if (step < TOTAL_STEPS - 1) setStep(step + 1); };
  const goBack = () => { if (step > 0) { haptic(); setStep(step - 1); } };

  const getSymptomOptions = () => {
    if (conditions.includes("gerd") && conditions.includes("gastritis")) return bothSymptomOptions;
    if (conditions.includes("gastritis")) return gastritisSymptomOptions;
    return gerdSymptomOptions;
  };

  // -- Step 0: Welcome --
  if (step === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <WelcomeStep onStart={() => setStep(1)} />
      </SafeAreaView>
    );
  }

  // -- Step 15: Loading --
  if (step === 15) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}>
          <BackButton onPress={goBack} />
          <ProgressBar step={step} />
        </View>
        <LoadingStep onComplete={handleComplete} />
      </SafeAreaView>
    );
  }

  // Step 14: SignUp (skippable)
  if (step === 14) {
    return (
      <SignUpScreen
        navigation={navigation}
        onSuccess={async ({ email }) => {
          posthog?.capture(EVENTS.ONBOARDING_SIGNUP_COMPLETED, { step_index: 14 });
          try {
            await Purchases.setEmail(email);
          } catch (err) {
            console.warn("Failed to set RevenueCat email:", err);
          }
          setStep(15);
        }}
        onSkip={() => {
          posthog?.capture(EVENTS.ONBOARDING_SIGNUP_SKIPPED, { step_index: 14 });
          setStep(15);
        }}
      />
    );
  }

  // -- Steps 1-13 --
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, marginBottom: 24 }}>
          <BackButton onPress={goBack} />
          <ProgressBar step={step} />
        </View>

        {/* Step 1: Conditions */}
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              What are you dealing with?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Select all that apply</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {conditionOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={conditions.includes(opt.id)} showCheck
                  onPress={() => toggle(setConditions, opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={conditions.length === 0} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 2: Severity */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              How severe are your symptoms?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>This helps us calibrate your plan</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {severityOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label} description={opt.description}
                  selected={severity === opt.id}
                  onPress={() => setSeverity(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!severity} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 3: Symptom Timing */}
        {step === 3 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              When do you usually experience symptoms?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Select all that apply</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {symptomTimingOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={symptomTiming.includes(opt.id)} showCheck
                  onPress={() => toggle(setSymptomTiming, opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={symptomTiming.length === 0} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 4: Health Stats Interstitial */}
        {step === 4 && (
          <View style={{ flex: 1 }}>
            <HealthStatsStep />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
            </View>
          </View>
        )}

        {/* Step 5: Symptom Frequency */}
        {step === 5 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              How often do you experience symptoms?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Choose one</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {symptomFrequencyOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={symptomFrequency === opt.id}
                  onPress={() => setSymptomFrequency(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!symptomFrequency} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 6: Top Symptoms */}
        {step === 6 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Which symptoms do you experience most?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Select all that apply</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {getSymptomOptions().map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={topSymptoms.includes(opt.id)} showCheck
                  onPress={() => toggle(setTopSymptoms, opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={topSymptoms.length === 0} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 7: After Eating */}
        {step === 7 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Do symptoms usually happen after eating?
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {afterEatingOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={symptomAfterEating === opt.id}
                  onPress={() => setSymptomAfterEating(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!symptomAfterEating} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 8: Value Prop Interstitial */}
        {step === 8 && (
          <View style={{ flex: 1 }}>
            <ValuePropStep />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
            </View>
          </View>
        )}

        {/* Step 9: Lying Down */}
        {step === 9 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Are symptoms worse when lying down?
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {lyingDownOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={worseLyingDown === opt.id}
                  onPress={() => setWorseLyingDown(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!worseLyingDown} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 10: Fear Foods */}
        {step === 10 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Which foods worry you most?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Select any you suspect are triggers</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {getFearFoodOptions(conditions).map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={fearFoods.includes(opt.id)} showCheck
                  onPress={() => toggle(setFearFoods, opt.id)}
                />
              ))}

              {/* Custom fear food input */}
              <View style={{ gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>Add your own:</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={customFearFood}
                    onChangeText={setCustomFearFood}
                    placeholder="e.g. avocado"
                    placeholderTextColor={COLORS.textSecondary}
                    style={{
                      flex: 1, borderWidth: 1, borderColor: COLORS.border,
                      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                      color: COLORS.text, backgroundColor: COLORS.card, fontSize: 15,
                    }}
                    onSubmitEditing={addCustomFearFood}
                    returnKeyType="done"
                  />
                  <Pressable
                    onPress={() => { haptic(); addCustomFearFood(); }}
                    disabled={!customFearFood.trim()}
                    style={{
                      backgroundColor: customFearFood.trim() ? COLORS.primary : COLORS.muted,
                      borderRadius: 12, paddingHorizontal: 16, justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: customFearFood.trim() ? "#FFFFFF" : COLORS.textSecondary, fontWeight: "600" }}>
                      Add
                    </Text>
                  </Pressable>
                </View>
                {customFearFoods.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {customFearFoods.map((food) => (
                      <Pressable
                        key={food}
                        onPress={() => { haptic(); removeCustomFearFood(food); }}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 6,
                          backgroundColor: COLORS.accentLight, borderWidth: 1,
                          borderColor: "rgba(240,124,82,0.3)", borderRadius: 20,
                          paddingHorizontal: 12, paddingVertical: 6,
                        }}
                      >
                        <Text style={{ fontSize: 14, color: COLORS.text }}>{food}</Text>
                        <Text style={{ color: COLORS.textSecondary }}>x</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton
                onPress={goNext}
                label={fearFoods.length === 0 && customFearFoods.length === 0 ? "Skip" : "Continue"}
              />
            </View>
          </View>
        )}

        {/* Step 11: Meal Times + Meds */}
        {step === 11 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Your usual meal times
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>Select all that apply</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {MEAL_TIME_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={mealTimes.includes(opt.id)} showCheck
                  onPress={() => toggle(setMealTimes, opt.id)}
                />
              ))}

              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 16 }}>
                  Current medication?
                </Text>
                <View style={{ gap: 10 }}>
                  {MEDS_OPTIONS.map((opt) => (
                    <OptionCard
                      key={opt.id} label={opt.label}
                      selected={medsStatus === opt.id}
                      onPress={() => setMedsStatus(opt.id)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={mealTimes.length === 0 || !medsStatus} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 12: Rate Us */}
        {step === 12 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{
              width: 220, height: 220, borderRadius: 110,
              backgroundColor: COLORS.primaryLight,
              alignItems: "center", justifyContent: "center", marginBottom: 32,
            }}>
              <Image source={mascotHappy} style={{ width: 160, height: 160 }} resizeMode="contain" />
            </View>

            <Star size={28} color={COLORS.primary} />
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, textAlign: "center", marginTop: 12 }}>
              Enjoying GERDBuddy?
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.textSecondary, textAlign: "center", marginTop: 8 }}>
              Your feedback helps others find relief too
            </Text>

            <View style={{ width: "100%", gap: 12, marginTop: 40 }}>
              <Pressable
                onPress={async () => {
                  haptic();
                  posthog?.capture("onboarding_rating_accepted");
                  try { await StoreReview.requestReview(); } catch (e) { console.warn("StoreReview failed:", e); }
                  setStep(13);
                }}
                style={{
                  backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18,
                  alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
                  shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 }, elevation: 4,
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>Rate Us</Text>
                <Star size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => { haptic(); posthog?.capture("onboarding_rating_skipped"); setStep(13); }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: COLORS.textSecondary, textAlign: "center", fontWeight: "600" }}>Maybe Later</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 13: Reminders */}
        {step === 13 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Enable reminders?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 20 }}>
              Gentle nudges to help you track consistently
            </Text>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => { haptic(); setRemindersEnabled((v) => !v); }}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 20, paddingVertical: 16, borderRadius: 14,
                  borderWidth: 1,
                  backgroundColor: remindersEnabled ? "rgba(58,162,127,0.05)" : COLORS.card,
                  borderColor: remindersEnabled ? "rgba(58,162,127,0.3)" : COLORS.border,
                }}
              >
                <View style={{ gap: 4, flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>Daily reminders</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>Remind me to log meals & symptoms</Text>
                </View>
                <View style={{
                  width: 48, height: 28, borderRadius: 14, paddingHorizontal: 2,
                  justifyContent: "center",
                  backgroundColor: remindersEnabled ? COLORS.primary : COLORS.muted,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF",
                    alignSelf: remindersEnabled ? "flex-end" : "flex-start",
                  }} />
                </View>
              </Pressable>

              <Pressable
                onPress={() => { haptic(); setEveningReminderEnabled((v) => !v); }}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 20, paddingVertical: 16, borderRadius: 14,
                  borderWidth: 1,
                  backgroundColor: eveningReminderEnabled ? "rgba(58,162,127,0.05)" : COLORS.card,
                  borderColor: eveningReminderEnabled ? "rgba(58,162,127,0.3)" : COLORS.border,
                }}
              >
                <View style={{ gap: 4, flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.text }}>Evening reminder</Text>
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>Avoid eating 2 hours before bed</Text>
                </View>
                <View style={{
                  width: 48, height: 28, borderRadius: 14, paddingHorizontal: 2,
                  justifyContent: "center",
                  backgroundColor: eveningReminderEnabled ? COLORS.primary : COLORS.muted,
                }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF",
                    alignSelf: eveningReminderEnabled ? "flex-end" : "flex-start",
                  }} />
                </View>
              </Pressable>
            </View>

            <View style={{
              backgroundColor: "rgba(58,162,127,0.05)", borderWidth: 1,
              borderColor: "rgba(58,162,127,0.2)", borderRadius: 16,
              padding: 16, marginTop: 24,
            }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 4 }}>
                Your 7-day plan is ready
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
                After setup, you'll get a personalized daily checklist to help you identify your triggers in just one week.
              </Text>
            </View>

            <View style={{ flex: 1 }} />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
            </View>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}
