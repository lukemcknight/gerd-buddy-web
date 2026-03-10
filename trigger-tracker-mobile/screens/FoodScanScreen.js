import { useState, useEffect, useCallback, useRef } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import {
  ArrowLeft, Camera, Image as ImageIcon, Info, ShieldAlert,
  Utensils, Flame, Sparkles, ChevronDown, ChevronUp, ArrowRightLeft, Lock,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
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
  canUserScan, incrementFreeScanCount, FREE_SCAN_LIMIT, FEATURE_FLAGS,
} from "../services/scannerGate";

const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");

const trafficLightStyles = {
  "Likely Safe": {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-100",
    color: "#059669",
  },
  Caution: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    badgeBg: "bg-amber-100",
    color: "#d97706",
  },
  "Likely Trigger": {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    badgeBg: "bg-rose-100",
    color: "#e11d48",
  },
};

const reasonTagLabels = {
  acidic: "Acidic",
  spicy: "Spicy",
  "high-fat": "High-Fat",
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
  "personal-trigger": "Personal Trigger",
};

export default function FoodScanScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [hasLoggedMeal, setHasLoggedMeal] = useState(false);
  const [personalTriggerCount, setPersonalTriggerCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [permissionStatus, setPermissionStatus] = useState({
    camera: null,
    gallery: null,
  });
  // Gate state
  const [gateResult, setGateResult] = useState(null);
  const [isCheckingGate, setIsCheckingGate] = useState(true);
  const scanIdRef = useRef(null);
  const userErrorMessage = "There was an error, please try again.";
  const posthog = usePostHog();

  // ── Gate check (runs on focus) ─────────────────────────────────────
  const checkGate = useCallback(async () => {
    if (shouldBypassPaywall) {
      setGateResult({
        allowed: true,
        reason: "pro",
        entitlementState: "pro",
        freeScanCount: 0,
        freeScanLimit: FREE_SCAN_LIMIT,
      });
      setIsCheckingGate(false);
      return;
    }
    try {
      setIsCheckingGate(true);
      const result = await canUserScan();
      setGateResult(result);
    } catch (err) {
      console.warn("Gate check failed", err);
      // Fail open for legacy behavior if flag is off
      setGateResult({
        allowed: false,
        reason: "limit_reached",
        entitlementState: "free",
        freeScanCount: FREE_SCAN_LIMIT,
        freeScanLimit: FREE_SCAN_LIMIT,
      });
    } finally {
      setIsCheckingGate(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkGate();
    }, [checkGate])
  );

  useEffect(() => {
    posthog?.screen("FoodScan");
    loadStreak();
  }, []);

  const loadStreak = async () => {
    const [meals, user] = await Promise.all([getMeals(), getUser()]);
    const streakInfo = getStreakInfo(meals, user);
    setCurrentStreak(streakInfo.currentStreak);
  };

  const handlePermission = async (type) => {
    const request =
      type === "camera"
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status, granted, canAskAgain } = await request();
    setPermissionStatus((prev) => ({
      ...prev,
      [type]: { status, granted, canAskAgain },
    }));
    if (!granted) {
      const message = canAskAgain
        ? "Please allow access so we can analyze your meal photo."
        : "Access is blocked. Open settings to re-enable camera or gallery access.";
      showToast("Permission needed", message);
      return false;
    }
    return true;
  };

  const openDeviceSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      showToast("Open Settings", "Enable camera and photo access to continue.");
    }
  };

  // ── Scan attempt with gate enforcement ─────────────────────────────
  const handlePick = async (type) => {
    setError(null);
    setAnalysis(null);
    setHasLoggedMeal(false);
    setExpandedTags(new Set());

    // Track attempt
    posthog?.capture(EVENTS.SCANNER_ATTEMPTED, {
      entitlement_state: gateResult?.entitlementState,
      free_scan_count: gateResult?.freeScanCount,
    });

    // Re-check gate at scan time (freshest state)
    if (!shouldBypassPaywall) {
      const freshGate = await canUserScan();
      setGateResult(freshGate);

      if (!freshGate.allowed) {
        posthog?.capture(EVENTS.SCANNER_BLOCKED_LIMIT_REACHED, {
          free_scan_count: freshGate.freeScanCount,
          limit: freshGate.freeScanLimit,
        });
        // Navigate to paywall with scanner_limit source
        navigation.navigate("Paywall", { trigger_source: "scanner_limit" });
        return;
      }

      posthog?.capture(EVENTS.SCANNER_ALLOWED, {
        entitlement_state: freshGate.entitlementState,
        free_scan_count_before: freshGate.freeScanCount,
      });
    }

    const allowed = await handlePermission(type);
    if (!allowed) return;

    const picker =
      type === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.4,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) {
      showToast("No image selected");
      return;
    }

    setSelectedImage(asset);
    analyze(asset);
  };

  const analyze = async (asset) => {
    setIsAnalyzing(true);
    // Generate unique scan ID for dedup
    const thisScanId = generateId();
    scanIdRef.current = thisScanId;

    posthog?.capture("food_scan_started");
    try {
      const personalTriggers = await getPersonalTriggers();
      setPersonalTriggerCount(personalTriggers?.length || 0);
      const rawResult = await analyzeFoodImage(asset, personalTriggers);
      const enhanced = enhanceScanResult(rawResult);
      setAnalysis(enhanced);

      // Increment free scan count ONLY on successful completion, with dedup
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

      // Refresh gate state after increment
      if (!shouldBypassPaywall) {
        const updatedGate = await canUserScan();
        setGateResult(updatedGate);
      }
    } catch (err) {
      console.warn("Food analysis failed", err);
      posthog?.capture("food_scan_failed");
      setError(userErrorMessage);
      showToast("Analysis failed", userErrorMessage);
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
    const primaryReason = analysis.reasons?.[0]?.replace(/^•\s*/, "");
    const riskLabel = analysis.trafficLight || "Scanned meal";
    return primaryReason
      ? `${riskLabel}: ${primaryReason}`
      : `${riskLabel} from photo`;
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
  const cameraBlocked =
    (permissionStatus.camera?.status === "denied" && !permissionStatus.camera?.canAskAgain) ||
    (permissionStatus.gallery?.status === "denied" && !permissionStatus.gallery?.canAskAgain);

  // ── Loading state ──────────────────────────────────────────────────
  if (isCheckingGate) {
    return (
      <Screen contentClassName="flex-1 items-center justify-center gap-3">
        <ActivityIndicator size="small" color="#3aa27f" />
        <Text className="text-muted-foreground text-sm">Loading...</Text>
      </Screen>
    );
  }

  // ── Limit reached state (blocked) ─────────────────────────────────
  const isBlocked = gateResult && !gateResult.allowed && gateResult.reason === "limit_reached";
  const isLegacyBlocked = gateResult && !gateResult.allowed && gateResult.reason === "flag_off_pro_only";

  if (isBlocked) {
    return (
      <Screen contentClassName="gap-6 pb-10">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-2 rounded-xl bg-muted/60"
          >
            <ArrowLeft size={18} color="#1f2a30" />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">Food Scanner</Text>
        </View>

        <View className="flex-1 items-center justify-center gap-6 px-4">
          <Mascot size="medium" />

          <View className="items-center gap-3">
            <View className="w-16 h-16 rounded-2xl bg-amber-100 items-center justify-center">
              <Lock size={32} color="#d97706" />
            </View>
            <Text className="text-2xl font-bold text-foreground text-center">
              You've used your {FREE_SCAN_LIMIT} free scans
            </Text>
            <Text className="text-base text-muted-foreground text-center leading-relaxed max-w-xs">
              Start your 7-day free trial for unlimited scanning and premium insights.
            </Text>
          </View>

          <View className="w-full gap-3 px-2">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Camera size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Unlimited meal scans</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <ShieldAlert size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Full trigger analysis & insights</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Utensils size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Weekly reports you can share with your doctor</Text>
            </View>
          </View>

          <View className="w-full gap-3 mt-2">
            <Button
              onPress={() => {
                posthog?.capture(EVENTS.PAYWALL_TRIGGERED, {
                  trigger_source: "scanner_limit",
                });
                navigation.navigate("Paywall", { trigger_source: "scanner_limit" });
              }}
              className="w-full py-4 rounded-2xl"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Sparkles size={18} color="#ffffff" />
                <Text className="text-primary-foreground font-bold text-base">
                  Start 7-Day Free Trial
                </Text>
              </View>
            </Button>

            <Pressable onPress={() => navigation.goBack()} className="py-3">
              <Text className="text-center text-muted-foreground">Not now</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Legacy Pro-only gate (flag off) ────────────────────────────────
  if (isLegacyBlocked) {
    return (
      <Screen contentClassName="gap-6 pb-10">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-2 rounded-xl bg-muted/60"
          >
            <ArrowLeft size={18} color="#1f2a30" />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">Food Scanner</Text>
        </View>

        <View className="flex-1 items-center justify-center gap-6 px-4">
          <Mascot size="medium" />

          <View className="items-center gap-3">
            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center">
              <Camera size={32} color="#3aa27f" />
            </View>
            <Text className="text-2xl font-bold text-foreground text-center">
              Know Before You Eat
            </Text>
            <Text className="text-base text-muted-foreground text-center leading-relaxed max-w-xs">
              Our AI analyzes your meal photo against known GERD triggers and your personal symptom history to give you a risk score before your first bite.
            </Text>
          </View>

          <View className="w-full gap-3 px-2">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Camera size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Snap a photo for instant risk analysis</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <ShieldAlert size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Matches against your personal trigger history</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Utensils size={20} color="#3aa27f" />
              </View>
              <Text className="flex-1 text-sm text-foreground">Get tailored suggestions for safer eating</Text>
            </View>
          </View>

          <View className="w-full gap-3 mt-2">
            <Button
              onPress={() => navigation.navigate("Paywall", { trigger_source: "food_scan" })}
              className="w-full py-4 rounded-2xl"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Sparkles size={18} color="#ffffff" />
                <Text className="text-primary-foreground font-bold text-base">
                  See Plans
                </Text>
              </View>
            </Button>

            <Pressable onPress={() => navigation.goBack()} className="py-3">
              <Text className="text-center text-muted-foreground">Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Scan allowed — main scanner UI ─────────────────────────────────

  // Remaining scans indicator for free users
  const isFreeUser = gateResult?.entitlementState === "free";
  const remainingScans = isFreeUser
    ? Math.max(0, FREE_SCAN_LIMIT - (gateResult?.freeScanCount ?? 0))
    : null;

  return (
    <Screen contentClassName="gap-6 pb-10">
      {/* Header with Streak */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-2 rounded-full bg-white/10 active:bg-white/20"
          >
            <ArrowLeft size={24} color="#1f2a30" />
          </Pressable>
          <Text className="text-2xl font-bold text-slate-800">Food Scan</Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Free scans remaining badge */}
          {isFreeUser && remainingScans !== null && (
            <View className="flex-row items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Camera size={14} color="#d97706" />
              <Text className="text-amber-700 font-bold text-xs">
                {remainingScans}/{FREE_SCAN_LIMIT}
              </Text>
            </View>
          )}
          <View className="flex-row items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200">
            <Flame size={16} color="#f97316" fill="#f97316" />
            <Text className="text-orange-700 font-bold">{currentStreak}</Text>
          </View>
        </View>
      </View>

      {/* Main Capture Card */}
      <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-slate-800">Scan Your Meal</Text>
        </View>

        <View className="gap-3">
          <Button
            variant="primary"
            className="w-full h-14 rounded-2xl shadow-md bg-emerald-600 active:bg-emerald-700"
            onPress={() => handlePick("camera")}
            disabled={isAnalyzing}
          >
            <View className="flex-row items-center gap-2">
              <Camera size={20} color="#ffffff" />
              <Text className="text-white text-lg font-semibold">Snap Photo</Text>
            </View>
          </Button>
          <Button
            variant="ghost"
            className="w-full h-12 rounded-2xl border border-slate-200"
            onPress={() => handlePick("gallery")}
            disabled={isAnalyzing}
          >
            <View className="flex-row items-center gap-2">
              <ImageIcon size={20} color="#64748b" />
              <Text className="text-slate-600 font-semibold">Select from Gallery</Text>
            </View>
          </Button>
        </View>
      </View>

      {cameraBlocked && (
        <View className="p-4 border border-amber-200 bg-amber-50 rounded-2xl">
          <View className="flex-row items-start gap-3">
            <ShieldAlert size={20} color="#b45309" />
            <View className="flex-1 gap-2">
              <Text className="font-semibold text-amber-900">
                Camera access needed
              </Text>
              <Text className="text-sm text-amber-800 leading-relaxed">
                Enable permissions in settings to identify your food triggers instantly.
              </Text>
              <Button
                variant="outline"
                className="w-full border-amber-300 mt-2 bg-white"
                onPress={openDeviceSettings}
              >
                <Text className="text-amber-900 font-semibold">Open Settings</Text>
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* Image Preview & Analysis */}
      {selectedImage && (
        <View className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <Image
            source={{ uri: selectedImage.uri }}
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
      )}

      {error && (
        <View className="p-4 border border-rose-200 bg-rose-50 rounded-2xl flex-row items-center gap-3">
          <ShieldAlert size={20} color="#e11d48" />
          <Text className="text-rose-700 flex-1">{error}</Text>
        </View>
      )}

      {/* ── Scanner 2.0 Results ── */}
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
