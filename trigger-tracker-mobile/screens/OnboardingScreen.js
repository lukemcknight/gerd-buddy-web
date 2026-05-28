import { useEffect, useRef, useState } from "react";
import { InputAccessoryView, Keyboard, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft, ArrowRight, Check, X, Star, Heart, Shield, TrendingUp,
  Clock, CalendarDays, Activity, Utensils, Moon, Bell, Pill, AlertTriangle,
  Flame, Zap, Scan, FileText,
} from "lucide-react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeInDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import { usePostHog } from "posthog-react-native";
import { createUser, saveUser } from "../services/storage";
import { configureRevenueCat } from "../services/revenuecat";
import { registerForPushNotifications, syncReminderNotifications } from "../services/notifications";
import { showToast } from "../utils/feedback";
import { generatePlan, getFearFoodOptions, MEAL_TIME_OPTIONS, MEDS_OPTIONS } from "../services/onboardingPlan";
import { EVENTS } from "../services/analytics";
import { isNewPaywallFunnelEnabled } from "../services/featureFlags";
import { shouldBypassPaywall } from "../utils/devMode";
import BrandMark from "../components/BrandMark";

// -- Theme --

const COLORS = {
  primary: "#154212",
  primaryLight: "#ecf5e9",
  primaryDark: "#0d3a2b",
  accent: "#9e4132",
  accentLight: "#fff3ef",
  bg: "#fcf9f8",
  card: "#ffffff",
  text: "#1b1c1c",
  textSecondary: "#72796e",
  border: "#e5e2d9",
  muted: "#f0eded",
  danger: "#9e4132",
  dangerLight: "#fff3ef",
  gold: "#b87518",
  goldLight: "#fff5e8",
  outline: "#c2c9bb",
  ink: "#303030",
};

const TOTAL_STEPS = 16; // steps 0-15
const KEYBOARD_DONE_ID = "onboarding-numeric-done";

// -- Quiz data --

const severityOptions = [
  { id: "light", label: "Light", description: "Occasional discomfort, manageable" },
  { id: "moderate", label: "Moderate", description: "Regular symptoms, affects daily life" },
  { id: "severe", label: "Severe", description: "Frequent, intense symptoms" },
];

const genderOptions = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

const ageOptions = [
  { id: "under_18", label: "Under 18" },
  { id: "18_24", label: "18-24" },
  { id: "25_29", label: "25-29" },
  { id: "30_34", label: "30-34" },
  { id: "35_44", label: "35-44" },
  { id: "45_54", label: "45-54" },
  { id: "55_64", label: "55-64" },
  { id: "65_plus", label: "65+" },
];

const gerdDurationOptions = [
  { id: "less_6m", label: "Less than 6 months" },
  { id: "6_12m", label: "6-12 months" },
  { id: "1_2y", label: "1-2 years" },
  { id: "2_5y", label: "2-5 years" },
  { id: "5_plus_y", label: "5+ years" },
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

const goalOptions = [
  { id: "identify_triggers", label: "Identify my trigger foods" },
  { id: "reduce_symptoms", label: "Reduce daily symptoms" },
  { id: "sleep_better", label: "Sleep without heartburn" },
  { id: "eat_without_fear", label: "Eat without fear" },
  { id: "off_medication", label: "Stop relying on medication" },
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
    <View style={{ height: 5, borderRadius: 999, backgroundColor: COLORS.border, flex: 1, marginLeft: 12, overflow: "hidden" }}>
      <Animated.View style={[{ height: 5, borderRadius: 999, backgroundColor: COLORS.primary }, barStyle]} />
    </View>
  );
}

// -- Option Card --

function OptionCard({ label, description, selected, onPress, showCheck, icon: Icon }) {
  return (
    <Pressable
      onPress={() => { haptic(); onPress(); }}
      style={{
        backgroundColor: selected ? COLORS.primaryLight : COLORS.card,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: selected ? COLORS.primary : COLORS.border,
        shadowColor: selected ? COLORS.primaryDark : "transparent",
        shadowOpacity: selected ? 0.08 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
        {Icon && (
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: selected ? COLORS.card : COLORS.primaryLight,
            alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={18} color={COLORS.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
            {label}
          </Text>
          {description && (
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 }}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {selected && (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: COLORS.primary,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 10,
          }}
        >
          <Check size={14} color="#ffffff" strokeWidth={3} />
        </View>
      )}
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
        borderRadius: 999,
        minHeight: 56,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: disabled ? "transparent" : COLORS.primary,
        shadowOpacity: disabled ? 0 : 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: disabled ? 0 : 3,
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
      flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
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
        width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card,
        alignItems: "center", justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
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
        width: 204, height: 204, borderRadius: 102,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center", marginBottom: 32,
        shadowColor: COLORS.primaryDark,
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      }}>
        <BrandMark variant="dark" size={146} />
      </View>

      <Text style={{
        fontSize: 36, fontWeight: "900", color: COLORS.primary,
        textAlign: "center", letterSpacing: -0.5, lineHeight: 40,
      }}>
        GERDBuddy
      </Text>
      <Text style={{
        fontSize: 16, color: COLORS.textSecondary,
        textAlign: "center", marginTop: 12, lineHeight: 22,
      }}>
        Build reflux trigger evidence{"\n"}from meals and symptoms
      </Text>

      <View style={{ width: "100%", marginTop: 48, gap: 12 }}>
        <Text style={{
          fontSize: 14, color: COLORS.textSecondary,
          textAlign: "center", lineHeight: 20, marginBottom: 8,
        }}>
          Answer a few quick questions (~60 seconds){"\n"}and we'll prepare your trigger plan.
        </Text>
        <Pressable
          onPress={() => { haptic(); onStart(); }}
          style={{
            backgroundColor: COLORS.primary, borderRadius: 999,
            minHeight: 58,
            paddingVertical: 18, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 10,
            shadowColor: COLORS.primary, shadowOpacity: 0.18,
            shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Get Started</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </Pressable>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 18,
            marginTop: 4,
          }}
        >
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/terms")}
            hitSlop={8}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Terms</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/privacy")}
            hitSlop={8}
          >
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Privacy</Text>
          </Pressable>
        </View>
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
          backgroundColor: COLORS.card, borderRadius: 14, padding: 20, gap: 16,
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
              backgroundColor: COLORS.goldLight, alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={20} color={COLORS.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>Long-Term Healing</Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                Consistent tracking leads to lasting lifestyle changes, not just temporary relief.
              </Text>
            </View>
          </View>
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
    "Ask an AI that knows YOUR data",
    "Walk into your GI visit with answers",
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ gap: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34 }}>
          Take control of{"\n"}your symptoms
        </Text>

        <View style={{
          backgroundColor: COLORS.card, borderRadius: 14, padding: 20, gap: 20,
          borderWidth: 1, borderColor: COLORS.border,
        }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {/* Without GerdBuddy */}
            <View style={{ flex: 1, gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: "#fff3ef", borderWidth: 1, borderColor: "#ffd4c9",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Activity size={24} color="#9e4132" strokeWidth={2} />
                </View>
              </View>
              <View style={{
                backgroundColor: COLORS.dangerLight, borderRadius: 10,
                borderWidth: 1,
                borderColor: "#ffd4c9",
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
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: "#ecf5e9", borderWidth: 1, borderColor: "#cfdcca",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <FileText size={24} color="#154212" strokeWidth={2} />
                </View>
              </View>
              <View style={{
                backgroundColor: COLORS.primaryLight, borderRadius: 10,
                borderWidth: 1,
                borderColor: "#cfdcca",
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
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
        shadowColor: COLORS.primaryDark,
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      }}>
        <BrandMark variant="dark" size={112} />
      </View>

      <Text style={{
        fontSize: 28, fontWeight: "900", color: COLORS.primary,
        textAlign: "center", lineHeight: 34,
      }}>
        Setting up your{"\n"}trigger evidence...
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
              backgroundColor: COLORS.primaryLight,
              alignItems: "center", justifyContent: "center",
              borderWidth: 1,
              borderColor: "#cfdcca",
            }}>
              <item.icon size={18} color={COLORS.primary} />
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
  // Keyboard visibility — used to show a floating Done pill on the
  // height/weight step so users on Android (no InputAccessoryView) and any
  // iOS user who doesn't notice the accessory bar have a visible way out.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  // Gate the Continue button on the Rate Us step (12) for 5 seconds so
  // users have a beat to interact with the Apple system rating sheet
  // before being able to skip past it.
  const [canContinueRating, setCanContinueRating] = useState(false);
  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [heightUnit, setHeightUnit] = useState("imperial");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gerdDuration, setGerdDuration] = useState(null);
  // Conditions step was removed from the quiz; defaulted to GERD which is the
  // app's positioning. Downstream code (getSymptomOptions, createUser,
  // generatePlan) already handles single-condition arrays correctly.
  const [conditions] = useState(["gerd"]);
  const [severity, setSeverity] = useState(null);
  const [symptomFrequency, setSymptomFrequency] = useState(null);
  const [topSymptoms, setTopSymptoms] = useState([]);
  const [fearFoods, setFearFoods] = useState([]);
  const [customFearFood, setCustomFearFood] = useState("");
  const [customFearFoods, setCustomFearFoods] = useState([]);
  const [mealTimes, setMealTimes] = useState([]);
  const [medsStatus, setMedsStatus] = useState(null);
  const [goal, setGoal] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("Onboarding");
    posthog?.capture("onboarding_started");
  }, []);

  useEffect(() => {
    if (step === 5) posthog?.capture(EVENTS.ONBOARDING_TRIAGE_STARTED);
    if (step === 12) {
      posthog?.capture("onboarding_rating_prompted");
      StoreReview.requestReview().catch(() => {});
      setCanContinueRating(false);
      const timer = setTimeout(() => setCanContinueRating(true), 4000);
      if (step > 0) posthog?.capture("onboarding_step_completed", { step: step - 1 });
      return () => clearTimeout(timer);
    }
    if (step > 0) posthog?.capture("onboarding_step_completed", { step: step - 1 });
  }, [step]);

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

      const heightCmNormalized =
        heightUnit === "imperial"
          ? Math.round(
              (parseInt(heightFeet || "0", 10) * 12 + parseInt(heightInches || "0", 10)) * 2.54
            ) || null
          : parseInt(heightCm || "0", 10) || null;
      const weightKgNormalized =
        heightUnit === "imperial"
          ? Math.round(parseInt(weightLbs || "0", 10) * 0.453592) || null
          : parseInt(weightKg || "0", 10) || null;

      const goalLabel = goal ? (goalOptions.find((o) => o.id === goal)?.label ?? null) : null;

      const user = await createUser({
        conditions: conditions.length > 0 ? conditions : ["gerd"],
        topSymptoms,
        symptomFrequency,
        age,
        gender,
        heightCm: heightCmNormalized,
        weightKg: weightKgNormalized,
        heightUnitPreference: heightUnit,
        gerdDuration,
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
        severity: severity || "moderate",
        fearFoods,
        customFearFoods,
        mealTimes,
        medsStatus: medsStatus || "none",
        goal,
        goalLabel,
      });

      await syncReminderNotifications({
        remindersEnabled: reminderSettings.remindersEnabled,
        eveningReminderEnabled: reminderSettings.eveningReminderEnabled,
      }).catch((err) => console.warn("Sync reminders failed:", err));

      if (shouldBypassPaywall) {
        await saveUser({ ...user, subscriptionActive: true });
      } else {
        await configureRevenueCat(user.id).catch((err) =>
          console.warn("RevenueCat setup failed:", err)
        );
      }

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
        age_bracket: age,
        gender,
        gerd_duration: gerdDuration,
        height_cm: heightCmNormalized,
        weight_kg: weightKgNormalized,
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
        age_bracket: age,
        gender,
        gerd_duration: gerdDuration,
      });

      if (shouldBypassPaywall) {
        navigation.replace("Main");
      } else if (isNewPaywallFunnelEnabled()) {
        navigation.replace("PrePaywallPlan");
      } else {
        navigation.replace("Paywall");
      }
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

  // -- Steps 1-13 --
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8, marginBottom: 24 }}>
          <BackButton onPress={goBack} />
          <ProgressBar step={step} />
        </View>

        {/* Step 1: Age */}
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              How old are you?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>
              This is used to make your custom plan more accurate.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {ageOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={age === opt.id}
                  onPress={() => setAge(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!age} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 2: Gender */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              What's your gender?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>
              This is used to make your custom plan more accurate.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {genderOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={gender === opt.id}
                  onPress={() => setGender(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!gender} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 3: Height & Weight */}
        {step === 3 && (
          <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              Height & Weight
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 20 }}>
              This is used to make your custom plan more accurate.
            </Text>

            {/* Imperial/Metric toggle */}
            <View
              style={{
                flexDirection: "row",
                alignSelf: "center",
                backgroundColor: COLORS.muted,
                borderRadius: 999,
                padding: 4,
                marginBottom: 32,
              }}
            >
              {["imperial", "metric"].map((unit) => {
                const active = heightUnit === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => { haptic(); setHeightUnit(unit); }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 24,
                      borderRadius: 999,
                      backgroundColor: active ? COLORS.card : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: active ? COLORS.text : COLORS.textSecondary,
                        textTransform: "capitalize",
                      }}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Inputs */}
            <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
              {heightUnit === "imperial" ? (
                <>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                      Height
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          value={heightFeet}
                          onChangeText={(t) => setHeightFeet(t.replace(/[^0-9]/g, "").slice(0, 1))}
                          placeholder="ft"
                          placeholderTextColor={COLORS.textSecondary}
                          keyboardType="number-pad"
                          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ID : undefined}
                          maxLength={1}
                          style={{
                            borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                            paddingVertical: 14, paddingHorizontal: 12,
                            color: COLORS.text, backgroundColor: COLORS.card, fontSize: 18,
                            textAlign: "center", fontWeight: "700",
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          value={heightInches}
                          onChangeText={(t) => setHeightInches(t.replace(/[^0-9]/g, "").slice(0, 2))}
                          placeholder="in"
                          placeholderTextColor={COLORS.textSecondary}
                          keyboardType="number-pad"
                          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ID : undefined}
                          maxLength={2}
                          style={{
                            borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                            paddingVertical: 14, paddingHorizontal: 12,
                            color: COLORS.text, backgroundColor: COLORS.card, fontSize: 18,
                            textAlign: "center", fontWeight: "700",
                          }}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                      Weight
                    </Text>
                    <TextInput
                      value={weightLbs}
                      onChangeText={(t) => setWeightLbs(t.replace(/[^0-9]/g, "").slice(0, 3))}
                      placeholder="lbs"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ID : undefined}
                      maxLength={3}
                      style={{
                        borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                        paddingVertical: 14, paddingHorizontal: 12,
                        color: COLORS.text, backgroundColor: COLORS.card, fontSize: 18,
                        textAlign: "center", fontWeight: "700",
                        width: "100%",
                      }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                      Height
                    </Text>
                    <TextInput
                      value={heightCm}
                      onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, "").slice(0, 3))}
                      placeholder="cm"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ID : undefined}
                      maxLength={3}
                      style={{
                        borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                        paddingVertical: 14, paddingHorizontal: 12,
                        color: COLORS.text, backgroundColor: COLORS.card, fontSize: 18,
                        textAlign: "center", fontWeight: "700",
                        width: "100%",
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                      Weight
                    </Text>
                    <TextInput
                      value={weightKg}
                      onChangeText={(t) => setWeightKg(t.replace(/[^0-9]/g, "").slice(0, 3))}
                      placeholder="kg"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="number-pad"
                      inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ID : undefined}
                      maxLength={3}
                      style={{
                        borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
                        paddingVertical: 14, paddingHorizontal: 12,
                        color: COLORS.text, backgroundColor: COLORS.card, fontSize: 18,
                        textAlign: "center", fontWeight: "700",
                        width: "100%",
                      }}
                    />
                  </View>
                </>
              )}
            </View>

            {keyboardVisible ? (
              <View style={{ alignItems: "center", marginTop: 18 }}>
                <Pressable
                  onPress={Keyboard.dismiss}
                  hitSlop={8}
                  accessibilityLabel="Dismiss keyboard"
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>
                    Done
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={{ flex: 1 }} />

            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton
                disabled={
                  heightUnit === "imperial"
                    ? !heightFeet || !weightLbs
                    : !heightCm || !weightKg
                }
                onPress={goNext}
              />
            </View>
          </Pressable>
        )}

        {/* Step 4: Reflux Duration */}
        {step === 4 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              How long have you struggled with reflux/GERD?
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {gerdDurationOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={gerdDuration === opt.id}
                  onPress={() => setGerdDuration(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton disabled={!gerdDuration} onPress={goNext} />
            </View>
          </View>
        )}

        {/* Step 5: Severity */}
        {step === 5 && (
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

        {/* Step 6: Health Stats Interstitial */}
        {step === 6 && (
          <View style={{ flex: 1 }}>
            <HealthStatsStep />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
            </View>
          </View>
        )}

        {/* Step 7: Symptom Frequency */}
        {step === 7 && (
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

        {/* Step 8: Top Symptoms */}
        {step === 8 && (
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

        {/* Step 9: Value Prop Interstitial */}
        {step === 9 && (
          <View style={{ flex: 1 }}>
            <ValuePropStep />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
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
                          borderColor: "#ffd4c9", borderRadius: 20,
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

        {/* Step 12: Rate Us — Apple's system rating sheet auto-fires
            on mount via the step-12 useEffect above. We just provide
            visual context (5 big stars) and a Continue that's gated
            for 5s so users have time to interact with the sheet. */}
        {step === 12 && (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    size={56}
                    color={COLORS.gold}
                    fill={COLORS.gold}
                    strokeWidth={0}
                  />
                ))}
              </View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: COLORS.text,
                  textAlign: "center",
                }}
              >
                Enjoying GERDBuddy?
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  marginTop: 8,
                  paddingHorizontal: 24,
                }}
              >
                Your feedback helps others find relief too.
              </Text>
            </View>
            <ContinueButton
              disabled={!canContinueRating}
              onPress={() => {
                posthog?.capture("onboarding_rating_continued");
                setStep(13);
              }}
            />
          </View>
        )}

        {/* Step 13: Goal */}
        {step === 13 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, lineHeight: 34, marginBottom: 8 }}>
              What is your goal?
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 8 }}>
              We'll personalize your plan around this.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 20 }} contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
              {goalOptions.map((opt) => (
                <OptionCard
                  key={opt.id} label={opt.label}
                  selected={goal === opt.id}
                  onPress={() => setGoal(opt.id)}
                />
              ))}
            </ScrollView>
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton
                disabled={!goal}
                onPress={() => {
                  posthog?.capture("onboarding_goal_set", { goal });
                  setStep(14);
                }}
              />
            </View>
          </View>
        )}

        {/* Step 14: Reminders */}
        {step === 14 && (
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
                  backgroundColor: remindersEnabled ? COLORS.primaryLight : COLORS.card,
                  borderColor: remindersEnabled ? "#cfdcca" : COLORS.border,
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
                  backgroundColor: eveningReminderEnabled ? COLORS.primaryLight : COLORS.card,
                  borderColor: eveningReminderEnabled ? "#cfdcca" : COLORS.border,
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
              backgroundColor: COLORS.primaryLight, borderWidth: 1,
              borderColor: "#cfdcca", borderRadius: 16,
              padding: 16, marginTop: 24,
            }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 4 }}>
                Your evidence plan is ready
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
                After setup, GERDBuddy will turn your meals, symptoms, and timing into clearer trigger patterns.
              </Text>
            </View>

            <View style={{ flex: 1 }} />
            <View style={{ paddingBottom: 16, paddingTop: 8 }}>
              <ContinueButton onPress={goNext} disabled={false} />
            </View>
          </View>
        )}

      </View>

      {/* InputAccessoryView rendered persistently at screen root (not inside
          the step 3 conditional) so iOS keeps the Done bar bound to every
          numeric input on step 3. When nested inside the step block it only
          attaches to the first focused input. */}
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              backgroundColor: COLORS.muted,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              paddingVertical: 8,
              paddingHorizontal: 16,
            }}
          >
            <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
              <Text style={{ color: COLORS.primary, fontSize: 17, fontWeight: "600" }}>
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}
