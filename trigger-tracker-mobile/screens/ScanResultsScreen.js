import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import {
  ArrowLeft,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Flame,
  Info,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Button from "../components/Button";
import ProgressRing from "../components/ProgressRing";
import EvidenceBar from "../components/EvidenceBar";
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
  incrementFreeScanCount,
} from "../services/scannerGate";
import { shouldBypassPaywall } from "../utils/devMode";

const trafficLightStyles = {
  "Likely Safe": {
    bg: "#ecf5e9",
    text: "#154212",
    border: "#cfdcca",
    chipBg: "rgba(21, 66, 18, 0.9)",
    color: "#154212",
    safetyLabel: "Strong",
  },
  Caution: {
    bg: "#fff5e8",
    text: "#774400",
    border: "#f4ddbd",
    chipBg: "rgba(119, 68, 0, 0.9)",
    color: "#b87518",
    safetyLabel: "Moderate",
  },
  "Likely Trigger": {
    bg: "#fff3ef",
    text: "#9e4132",
    border: "#ffd4c9",
    chipBg: "rgba(158, 65, 50, 0.92)",
    color: "#9e4132",
    safetyLabel: "Low",
  },
};

const reasonTagLabels = {
  acidic: "Acidic",
  spicy: "Spicy",
  "high-fat": "High fat",
  caffeine: "Caffeine",
  carbonation: "Carbonation",
  mint: "Mint",
  chocolate: "Chocolate",
  alcohol: "Alcohol",
  dairy: "Dairy",
  fried: "Fried",
  citrus: "Citrus",
  garlic: "Garlic",
  onion: "Onion",
  "personal-trigger": "Personal trigger",
};

const triggerTags = new Set([
  "acidic",
  "spicy",
  "high-fat",
  "caffeine",
  "carbonation",
  "mint",
  "chocolate",
  "alcohol",
  "dairy",
  "fried",
  "citrus",
  "garlic",
  "onion",
  "personal-trigger",
]);

const safeIngredients = [
  "water",
  "purified water",
  "rice",
  "oatmeal",
  "banana",
  "chicken",
  "turkey",
  "b12",
  "vitamin b12",
];

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const getSafetyIndex = (score) => clampPercent(Math.round(((5 - (Number(score) || 3)) / 4) * 100));

const getFoodTitle = (analysis) => {
  const detected = analysis?.detectedFoods || [];
  if (detected.length === 0) return "Scanned meal";
  if (detected.length === 1) return detected[0];
  return detected.slice(0, 2).join(" + ");
};

const splitIngredients = (analysis) => {
  const detected = analysis?.detectedFoods || [];
  const tags = analysis?.reasonTags || [];
  const matchedTriggers = new Set(
    (analysis?.personalTriggerMatch || []).map((item) => item.toLowerCase())
  );

  const triggers = [
    ...tags
      .filter((tag) => triggerTags.has(tag))
      .map((tag) => reasonTagLabels[tag] || tag),
    ...(analysis?.personalTriggerMatch || []),
  ];

  const safe = detected.filter((food) => {
    const lower = food.toLowerCase();
    if (matchedTriggers.has(lower)) return false;
    return safeIngredients.some((ingredient) => lower.includes(ingredient));
  });

  return {
    triggers: Array.from(new Set(triggers)).slice(0, 4),
    safe: Array.from(new Set(safe)).slice(0, 3),
  };
};

const FloatingLabel = ({ type, text, style }) => {
  const config = {
    trigger: {
      bg: "rgba(158, 65, 50, 0.92)",
      icon: AlertTriangle,
    },
    caution: {
      bg: "rgba(119, 68, 0, 0.9)",
      icon: Zap,
    },
    safe: {
      bg: "rgba(21, 66, 18, 0.9)",
      icon: CheckCircle2,
    },
  }[type];
  const Icon = config.icon;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          backgroundColor: config.bg,
          borderColor: "rgba(255,255,255,0.25)",
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        },
        style,
      ]}
    >
      <Icon size={15} color="#ffffff" strokeWidth={2.5} />
      <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {text}
      </Text>
    </View>
  );
};

const IngredientPanel = ({ title, items, tone }) => {
  const isTrigger = tone === "trigger";
  const color = isTrigger ? "#9e4132" : "#154212";
  const bg = isTrigger ? "#fff3ef" : "#ecf5e9";
  const border = isTrigger ? "#ffd4c9" : "#cfdcca";
  const Icon = isTrigger ? AlertTriangle : CheckCircle2;
  const fallback = isTrigger ? "No obvious trigger tags" : "No likely safe items";

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Icon size={17} color={color} />
        <Text style={{ color, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
          {title} ({items.length})
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {(items.length ? items : [fallback]).map((item) => (
          <View key={item} style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 7 }} />
            <Text style={{ color: "#1b1c1c", fontSize: 14, flex: 1, lineHeight: 20 }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
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
  // Snapshot of the personal triggers actually passed to the AI for this scan,
  // so the sheet can surface a "Personalized" badge with the right number.
  const [personalTriggersUsed, setPersonalTriggersUsed] = useState([]);
  const scanIdRef = useRef(null);
  const posthog = usePostHog();

  // Aspect-matched viewfinder: cover-mode with no cropping by sizing the box
  // to the image's natural aspect. ImagePicker hands us width/height on the
  // asset; fall back to 4:3 landscape if missing.
  const VF_HORIZONTAL_MARGIN = 12;
  const VF_TOP = 116;
  const VF_MIN_HEIGHT = 180;
  const VF_MAX_HEIGHT = 280;
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const naturalAspect =
    asset?.width && asset?.height ? asset.height / asset.width : 0.75;
  const VF_WIDTH = screenWidth - VF_HORIZONTAL_MARGIN * 2;
  const VF_HEIGHT = Math.max(
    VF_MIN_HEIGHT,
    Math.min(VF_MAX_HEIGHT, VF_WIDTH * naturalAspect)
  );

  // Sheet collapse offset: derived at gesture-runtime from the actual
  // measured sheet height (via onLayout below). Using a shared value means
  // the worklet reads the live measurement without triggering React
  // re-renders mid-drag, which was the root cause of an earlier bug where
  // mid-drag re-renders pushed the sheet entirely off-screen.
  const SHEET_GAP_BELOW_IMAGE = 16;
  const SHEET_COLLAPSE_MIN = 60;
  const SHEET_COLLAPSE_MAX = 320;
  const measuredSheetHeight = useSharedValue(520);
  const sheetTranslate = useSharedValue(0);
  const sheetStart = useSharedValue(0);
  // Captured by worklets via closure. Numbers are fine; the shared value is
  // read inside the worklet body so it stays live.
  const imageBottom = VF_TOP + VF_HEIGHT + SHEET_GAP_BELOW_IMAGE;
  const minOffset = SHEET_COLLAPSE_MIN;
  const maxOffset = SHEET_COLLAPSE_MAX;

  const sheetPan = Gesture.Pan()
    .onStart(() => {
      sheetStart.value = sheetTranslate.value;
    })
    .onUpdate((e) => {
      const collapseOffset = Math.max(
        minOffset,
        Math.min(maxOffset, imageBottom - (screenHeight - measuredSheetHeight.value))
      );
      const next = sheetStart.value + e.translationY;
      sheetTranslate.value = Math.max(0, Math.min(collapseOffset, next));
    })
    .onEnd((e) => {
      const collapseOffset = Math.max(
        minOffset,
        Math.min(maxOffset, imageBottom - (screenHeight - measuredSheetHeight.value))
      );
      const halfway = collapseOffset / 2;
      const collapse =
        e.velocityY > 600 ||
        (e.velocityY > -600 && sheetTranslate.value > halfway);
      sheetTranslate.value = withTiming(collapse ? collapseOffset : 0, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslate.value }],
  }));

  // Bottom spacer inside the sheet ScrollView. Its height grows as the sheet
  // is dragged down, so the user can scroll the last item (Log Meal button)
  // back into the visible portion of the sheet even when the sheet's bottom
  // edge is below the screen.
  const sheetBottomSpacerStyle = useAnimatedStyle(() => ({
    height: sheetTranslate.value,
  }));

  // Looping scan-line during loading. Drives translateY 0 → VF_HEIGHT and back.
  const scanLineY = useSharedValue(0);
  useEffect(() => {
    if (isAnalyzing) {
      scanLineY.value = 0;
      scanLineY.value = withRepeat(
        withTiming(VF_HEIGHT - 12, {
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true
      );
    } else {
      scanLineY.value = withTiming(0, { duration: 200 });
    }
  }, [isAnalyzing, VF_HEIGHT]);
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  // Ring-fill ramp: when analysis arrives, sweep the displayed safety index
  // from 0 → final value over ~600ms so the verdict feels considered.
  const [ringProgress, setRingProgress] = useState(0);
  useEffect(() => {
    if (!analysis) {
      setRingProgress(0);
      return;
    }
    const target = Math.max(0, Math.min(100, Math.round(((5 - (Number(analysis.score) || 3)) / 4) * 100)));
    const start = performance.now();
    const duration = 600;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setRingProgress(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analysis]);

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
    setError(null);
    const thisScanId = generateId();
    scanIdRef.current = thisScanId;

    posthog?.capture("food_scan_started");
    try {
      const [personalTriggers, user] = await Promise.all([
        getPersonalTriggers(),
        getUser(),
      ]);
      setPersonalTriggersUsed(personalTriggers || []);

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
  const safetyIndex = getSafetyIndex(analysis?.score);
  const foodsTitle = getFoodTitle(analysis);
  const ingredientGroups = splitIngredients(analysis);
  const primaryTrigger = ingredientGroups.triggers[0] || reasonTagLabels[analysis?.reasonTags?.[0]] || "Possible trigger";
  const primarySafe = ingredientGroups.safe[0] || analysis?.detectedFoods?.[0] || "Likely safe";

  return (
    <View style={{ flex: 1, backgroundColor: "#fcf9f8" }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: 16,
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e5e2d9",
              }}
            >
              <ArrowLeft size={20} color="#1b1c1c" />
            </Pressable>
            <Text style={{ color: "#1b1c1c", fontSize: 22, fontWeight: "800" }}>
              Scanner
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#ffffff",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: "#e5e2d9",
              }}
            >
              <Flame size={15} color="#b87518" fill="#b87518" />
              <Text style={{ color: "#1b1c1c", fontSize: 13, fontWeight: "800" }}>
                {currentStreak}
              </Text>
            </View>
          </View>
        </View>

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: VF_TOP,
            left: VF_HORIZONTAL_MARGIN,
            right: VF_HORIZONTAL_MARGIN,
            height: VF_HEIGHT,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "#e5e2d9",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            overflow: "hidden",
            zIndex: 1,
          }}
        >
          <Image
            source={{ uri: asset.uri }}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
            blurRadius={isAnalyzing ? 1.5 : 0}
          />
          <View style={{ position: "absolute", top: 15, left: 15, width: 28, height: 28, borderTopWidth: 4, borderLeftWidth: 4, borderColor: "#154212", borderTopLeftRadius: 8 }} />
          <View style={{ position: "absolute", top: 15, right: 15, width: 28, height: 28, borderTopWidth: 4, borderRightWidth: 4, borderColor: "#154212", borderTopRightRadius: 8 }} />
          <View style={{ position: "absolute", bottom: 15, left: 15, width: 28, height: 28, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: "#154212", borderBottomLeftRadius: 8 }} />
          <View style={{ position: "absolute", bottom: 15, right: 15, width: 28, height: 28, borderBottomWidth: 4, borderRightWidth: 4, borderColor: "#154212", borderBottomRightRadius: 8 }} />
          {isAnalyzing ? (
            <Animated.View
              style={[
                { position: "absolute", left: 18, right: 18, top: 6, height: 2, backgroundColor: "#154212", opacity: 0.85 },
                scanLineStyle,
              ]}
            />
          ) : null}
          {analysis ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 50,
                left: 12,
                right: 12,
                gap: 6,
                alignItems: "flex-start",
                zIndex: 2,
              }}
            >
              {ingredientGroups.triggers.length > 0 ? (
                <FloatingLabel
                  type="trigger"
                  text={`${primaryTrigger} found`}
                  style={{ position: "relative" }}
                />
              ) : null}
              {analysis.trafficLight !== "Likely Safe" ? (
                <FloatingLabel
                  type="caution"
                  text="Possible trigger"
                  style={{ position: "relative" }}
                />
              ) : null}
              <FloatingLabel
                type="safe"
                text={`${primarySafe} checked`}
                style={{ position: "relative" }}
              />
            </View>
          ) : null}
        </View>

        {isAnalyzing ? (
          <View
            style={{
              position: "absolute",
              top: 468,
              left: 24,
              right: 24,
              zIndex: 2,
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.94)",
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <ActivityIndicator size="small" color="#154212" />
              <Text style={{ color: "#1b1c1c", fontSize: 14, fontWeight: "700" }}>
                Scanning ingredients...
              </Text>
            </View>
          </View>
        ) : null}

        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 4,
            },
            sheetStyle,
          ]}
        >
          <SafeAreaView
            edges={["bottom"]}
            style={{ backgroundColor: "#fcf9f8" }}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0) measuredSheetHeight.value = h;
            }}
          >
            <View
              style={{
                backgroundColor: "#fcf9f8",
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                borderWidth: 1,
                borderColor: "#e5e2d9",
                maxHeight: 640,
                overflow: "hidden",
              }}
            >
              <GestureDetector gesture={sheetPan}>
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
                  <View style={{ width: 48, height: 5, borderRadius: 999, backgroundColor: "#c2c9bb" }} />
                </View>
              </GestureDetector>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "#ffd4c9",
                    backgroundColor: "#fff3ef",
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldAlert size={20} color="#9e4132" />
                  <Text style={{ color: "#9e4132", flex: 1, fontSize: 14 }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Animated.View
                entering={analysis ? FadeInDown.delay(0).duration(220) : undefined}
                style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1b1c1c", fontSize: 22, fontWeight: "800" }} numberOfLines={2}>
                    {analysis ? foodsTitle : "Analyzing meal"}
                  </Text>
                  <Text style={{ color: "#72796e", fontSize: 14, marginTop: 4 }}>
                    {analysis ? `Detected: ${analysis.detectedFoods?.length || 0} item${analysis.detectedFoods?.length === 1 ? "" : "s"}` : "Checking common reflux triggers"}
                  </Text>
                </View>

                <ProgressRing
                  progress={analysis ? ringProgress : 0}
                  size={68}
                  strokeWidth={5}
                  color={tlStyle.color}
                >
                  <Text style={{ color: tlStyle.text, fontSize: 15, fontWeight: "800" }}>
                    {analysis ? ringProgress : "--"}
                  </Text>
                  <Text style={{ color: "#72796e", fontSize: 9, fontWeight: "700" }}>
                    /100
                  </Text>
                </ProgressRing>
              </Animated.View>

              {analysis ? (
                <>
                  <Animated.View entering={FadeInDown.delay(40).duration(220)}>
                    {personalTriggersUsed.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          backgroundColor: "#ecf5e9",
                          borderColor: "#cfdcca",
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#154212",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Sparkles size={16} color="#ffffff" strokeWidth={2.4} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#154212", fontSize: 13, fontWeight: "800" }}>
                            Personalized for you
                          </Text>
                          <Text style={{ color: "#42493e", fontSize: 12, marginTop: 2 }}>
                            Scored against {personalTriggersUsed.length} of your tracked pattern
                            {personalTriggersUsed.length === 1 ? "" : "s"}
                            {analysis.personalTriggerMatch?.length
                              ? ` — matched ${analysis.personalTriggerMatch.length}`
                              : ""}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          backgroundColor: "#f0eded",
                          borderColor: "#e5e2d9",
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: "#72796e",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Info size={16} color="#ffffff" strokeWidth={2.4} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#1b1c1c", fontSize: 13, fontWeight: "800" }}>
                            General GERD scoring
                          </Text>
                          <Text style={{ color: "#72796e", fontSize: 12, marginTop: 2 }}>
                            Log a few more meals — once patterns appear, scores will adapt to YOUR data.
                          </Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>

                  <Animated.View entering={FadeInDown.delay(80).duration(220)}>
                    <EvidenceBar
                      label="GERD Safety Index"
                      value={`${safetyIndex}/100`}
                      percent={safetyIndex}
                      fillColor={tlStyle.color}
                    />
                  </Animated.View>

                  <Animated.View
                    entering={FadeInDown.delay(120).duration(220)}
                    style={{ flexDirection: "row", gap: 10 }}
                  >
                    <IngredientPanel title="Triggers" items={ingredientGroups.triggers} tone="trigger" />
                    <IngredientPanel title="Likely safe" items={ingredientGroups.safe} tone="safe" />
                  </Animated.View>

                  {analysis.reasonTags.length > 0 ? (
                    <Animated.View
                      entering={FadeInDown.delay(180).duration(220)}
                      style={{ gap: 8 }}
                    >
                      <Text style={{ color: "#72796e", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                        Evidence chips
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {analysis.reasonTags.map((tag) => {
                          const isExpanded = expandedTags.has(tag);
                          const isPersonal = tag === "personal-trigger";
                          const chipColor = isPersonal ? "#9e4132" : tlStyle.color;
                          return (
                            <Pressable
                              key={tag}
                              onPress={() => handleToggleTag(tag)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 5,
                                borderRadius: 999,
                                paddingHorizontal: 11,
                                paddingVertical: 7,
                                backgroundColor: isPersonal ? "#fff3ef" : "#f0eded",
                                borderWidth: 1,
                                borderColor: isPersonal ? "#ffd4c9" : "#e5e2d9",
                              }}
                            >
                              <Text style={{ color: chipColor, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                                {reasonTagLabels[tag] || tag}
                              </Text>
                              {isExpanded ? (
                                <ChevronUp size={13} color={chipColor} />
                              ) : (
                                <ChevronDown size={13} color={chipColor} />
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </Animated.View>
                  ) : null}

                  <Animated.View
                    entering={FadeInDown.delay(240).duration(220)}
                    style={{
                      borderRadius: 18,
                      backgroundColor: "#ffffff",
                      borderWidth: 1,
                      borderColor: "#e5e2d9",
                      padding: 14,
                      gap: 6,
                    }}
                  >
                    <Text style={{ color: "#1b1c1c", fontSize: 15, fontWeight: "800" }}>
                      Analysis
                    </Text>
                    <Text style={{ color: "#42493e", fontSize: 14, lineHeight: 20 }}>
                      {analysis.reasons?.[0] || "We could not generate an explanation. Try retaking the photo."}
                    </Text>
                  </Animated.View>

                  {analysis.personalTriggerMatch?.length > 0 ? (
                    <View
                      style={{
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: "#ffd4c9",
                        backgroundColor: "#fff3ef",
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ShieldAlert size={17} color="#9e4132" />
                        <Text style={{ color: "#9e4132", fontSize: 14, fontWeight: "800" }}>
                          Personal Trigger Detected!
                        </Text>
                      </View>
                      {analysis.personalTriggerMatch.map((trigger) => (
                        <Text key={trigger} style={{ color: "#752317", fontSize: 14 }}>
                          - {trigger}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {analysis.saferSwaps.length > 0 ? (
                    <View
                      style={{
                        borderRadius: 18,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderColor: "#e5e2d9",
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ArrowRightLeft size={17} color="#154212" />
                        <Text style={{ color: "#1b1c1c", fontSize: 15, fontWeight: "800" }}>
                          Safer Swaps
                        </Text>
                      </View>
                      {analysis.saferSwaps.map((swap, index) => (
                        <Pressable
                          key={`${swap.original}-${index}`}
                          onPress={() => handleSwapTap(swap)}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "#e5e2d9",
                            backgroundColor: "#fcf9f8",
                            padding: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: "#72796e", fontSize: 12, textDecorationLine: "line-through" }}>
                              {swap.original}
                            </Text>
                            <Text style={{ color: "#1b1c1c", fontSize: 14, fontWeight: "800", marginTop: 2 }}>
                              {swap.suggestion}
                            </Text>
                            {swap.reason ? (
                              <Text style={{ color: "#154212", fontSize: 12, marginTop: 3 }}>
                                {swap.reason}
                              </Text>
                            ) : null}
                          </View>
                          <ArrowRightLeft size={15} color="#154212" />
                        </Pressable>
                      ))}
                    </View>
                  ) : analysis.suggestions?.length > 0 ? (
                    <View
                      style={{
                        borderRadius: 18,
                        backgroundColor: "#ffffff",
                        borderWidth: 1,
                        borderColor: "#e5e2d9",
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: "#1b1c1c", fontSize: 15, fontWeight: "800" }}>
                        Suggestions
                      </Text>
                      {analysis.suggestions.map((suggestion) => (
                        <Text key={suggestion} style={{ color: "#42493e", fontSize: 14, lineHeight: 20 }}>
                          - {suggestion}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={{ gap: 10, paddingTop: 2 }}>
                    <Button
                      className="w-full py-4"
                      disabled={isLoggingMeal || hasLoggedMeal}
                      onPress={handleLogMeal}
                      style={{ opacity: isLoggingMeal || hasLoggedMeal ? 0.72 : 1 }}
                    >
                      {hasLoggedMeal ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <CheckCircle2 size={18} color="#ffffff" />
                          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>
                            Meal Logged
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "800" }}>
                          {isLoggingMeal ? "Saving..." : "Log Scanned Meal"}
                        </Text>
                      )}
                    </Button>
                    <Text style={{ color: "#72796e", fontSize: 10, textAlign: "center" }}>
                      Log to History to include this scan in your trigger evidence.
                    </Text>
                  </View>
                </>
              ) : (
                <View style={{ gap: 12 }}>
                  <EvidenceBar
                    label="GERD Safety Index"
                    value="Analyzing"
                    percent={0}
                    fillColor="#154212"
                  />
                  <View style={{ height: 110, borderRadius: 18, borderWidth: 1, borderColor: "#e5e2d9", backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator size="small" color="#154212" />
                    <Text style={{ color: "#72796e", fontSize: 14, fontWeight: "700" }}>
                      Scanning ingredients...
                    </Text>
                  </View>
                </View>
              )}
              <Animated.View style={sheetBottomSpacerStyle} />
            </ScrollView>
          </View>
        </SafeAreaView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
