import { useState, useEffect } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, Image as ImageIcon, Info, ShieldAlert, Utensils, Flame } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import { analyzeFoodImage } from "../services/foodAnalysis";
import { showToast } from "../utils/feedback";
import {
  saveMeal, getPersonalTriggers, getMeals, getUser,
  getStreakInfo, updateBestStreak, STREAK_MILESTONES,
} from "../services/storage";

const riskStyles = {
  Low: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  Moderate: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  High: { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
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
  const [permissionStatus, setPermissionStatus] = useState({
    camera: null,
    gallery: null,
  });
  const userErrorMessage = "There was an error, please try again.";
  const posthog = usePostHog();

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

  const handlePick = async (type) => {
    setError(null);
    setAnalysis(null);
    setHasLoggedMeal(false);

    const allowed = await handlePermission(type);
    if (!allowed) return;

    const picker =
      type === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.4, // OPTIMIZATION: Reduced from 0.6 to 0.4 for faster upload
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
    posthog?.capture("food_scan_started");
    try {
      const personalTriggers = await getPersonalTriggers();
      setPersonalTriggerCount(personalTriggers?.length || 0);
      const result = await analyzeFoodImage(asset, personalTriggers);
      setAnalysis(result);
      posthog?.capture("food_scan_completed", {
        risk_label: result.label,
        score: result.score,
        has_personal_triggers: result.personalTriggerMatch?.length > 0,
      });
    } catch (err) {
      console.warn("Food analysis failed", err);
      posthog?.capture("food_scan_failed");
      setError(userErrorMessage);
      showToast("Analysis failed", userErrorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const buildMealDescription = () => {
    if (!analysis) return "Scanned meal";
    const primaryReason = analysis.reasons?.[0]?.replace(/^•\s*/, "");
    const riskLabel = analysis.label ? `${analysis.label} risk meal` : "Scanned meal";
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
      
      setCurrentStreak(streakInfo.currentStreak); // Update UI instantly
      setHasLoggedMeal(true);
      
      const streakText =
        streakInfo.currentStreak > 1
          ? ` ${streakInfo.currentStreak}-day streak! 🔥`
          : streakInfo.currentStreak === 1
            ? " Streak started! 🔥"
            : "";
      showToast("Meal logged", `Saved to history.${streakText}`);
    } catch (err) {
      console.warn("Failed to auto-log meal", err);
      showToast("Could not log meal", "Please try again or log manually.");
    } finally {
      setIsLoggingMeal(false);
    }
  };

  const riskTone = riskStyles[analysis?.label] || riskStyles.Moderate;
  const explanation =
    analysis?.reasons?.[0] ||
    "We could not generate an explanation. Try retaking the photo.";
  const cameraBlocked =
    (permissionStatus.camera?.status === "denied" && !permissionStatus.camera?.canAskAgain) ||
    (permissionStatus.gallery?.status === "denied" && !permissionStatus.gallery?.canAskAgain);

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
        
        {/* Retention Feature: Streak Display */}
        <View className="flex-row items-center gap-1 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200">
          <Flame size={16} color="#f97316" fill="#f97316" />
          <Text className="text-orange-700 font-bold">{currentStreak}</Text>
        </View>
      </View>

      {/* Main Capture Card - Improved UI */}
      <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-slate-800">Identify Triggers</Text>
          <View className="bg-slate-100 px-2 py-1 rounded-md">
            <Text className="text-xs text-slate-500 font-medium">AI Powered</Text>
          </View>
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

      {/* Analysis Results Card */}
      {analysis && (
        <View className={`p-5 rounded-3xl border ${riskTone.border} ${riskTone.bg} shadow-sm`}>
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
            <View className={`px-4 py-2 rounded-full bg-white shadow-sm border ${riskTone.border}`}>
              <Text className={`font-bold ${riskTone.text}`}>
                {analysis.label} Risk
              </Text>
            </View>
          </View>

          <View className="bg-white/60 p-4 rounded-xl mb-4">
            <Text className="font-semibold text-slate-800 mb-1">Analysis</Text>
            <Text className="text-slate-700 leading-relaxed">{explanation}</Text>
          </View>

          {analysis.personalTriggerMatch?.length > 0 && (
            <View className="mb-4 bg-rose-100 p-3 rounded-xl border border-rose-200">
              <View className="flex-row items-center gap-2 mb-2">
                <ShieldAlert size={16} color="#be123c" />
                <Text className="font-bold text-rose-800">Personal Trigger Detected!</Text>
              </View>
              {analysis.personalTriggerMatch.map((trigger, idx) => (
                <Text key={idx} className="text-rose-700 ml-6">• {trigger}</Text>
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
      )}
    </Screen>
  );
}
