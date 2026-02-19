import { useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, Image as ImageIcon, Info, ShieldAlert, Utensils } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import { analyzeFoodImage } from "../services/foodAnalysis";
import { showToast } from "../utils/feedback";
import { saveMeal } from "../services/storage";

const riskStyles = {
  Low: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Moderate: { bg: "bg-amber-50", text: "text-amber-700" },
  High: { bg: "bg-rose-50", text: "text-rose-700" },
};

export default function FoodScanScreen() {
  const navigation = useNavigation();
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);
  const [hasLoggedMeal, setHasLoggedMeal] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    camera: null,
    gallery: null,
  });
  const userErrorMessage = "There was an error, please try again.";

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
      quality: 0.6,
      base64: true, // OpenAI vision requires inline base64 when no hosted URL is available.
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
    try {
      const result = await analyzeFoodImage(asset);
      setAnalysis(result);
    } catch (err) {
      console.warn("Food analysis failed", err);
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
      setHasLoggedMeal(true);
      showToast("Meal logged", "We saved this scan to your meal history.");
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
    <Screen contentClassName="gap-5">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="p-2 rounded-xl bg-muted/60"
        >
          <ArrowLeft size={18} color="#1f2a30" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">Food Scan</Text>
          <Text className="text-sm text-muted-foreground">
            Snap a meal to get a quick GERD risk read.
          </Text>
        </View>
        <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
          <Camera size={22} color="#3aa27f" />
        </View>
      </View>

      <Card className="p-4 gap-3">
        <Text className="text-sm font-medium text-foreground">Capture</Text>
        <View className="gap-3">
          <Button
            variant="primary"
            className="w-full h-auto py-4"
            onPress={() => handlePick("camera")}
            disabled={isAnalyzing}
          >
            <View className="flex-row items-center gap-2">
              <Camera size={18} color="#ffffff" />
              <Text className="text-primary-foreground font-semibold">Take Photo</Text>
            </View>
          </Button>
          <Button
            variant="outline"
            className="w-full h-auto py-4"
            onPress={() => handlePick("gallery")}
            disabled={isAnalyzing}
          >
            <View className="flex-row items-center gap-2">
              <ImageIcon size={18} color="#1f2a30" />
              <Text className="text-foreground font-semibold">Choose from Gallery</Text>
            </View>
          </Button>
        </View>
        <Text className="text-xs text-muted-foreground">
          Images stay on device until they are securely sent for analysis. We do not keep or reuse
          your photos after generating a result.
        </Text>
      </Card>

      {cameraBlocked && (
        <Card className="p-4 border border-amber-200 bg-amber-50">
          <View className="flex-row items-start gap-3">
            <ShieldAlert size={18} color="#b45309" />
            <View className="flex-1 gap-2">
              <Text className="text-sm font-semibold text-amber-900">
                Camera or photo access is off
              </Text>
              <Text className="text-sm text-amber-900">
                Enable camera and photo permissions to snap meals. You can also choose from the
                gallery once access is restored.
              </Text>
              <Button
                variant="outline"
                className="w-full border-amber-300"
                onPress={openDeviceSettings}
              >
                <Text className="text-foreground font-semibold">Open device settings</Text>
              </Button>
            </View>
          </View>
        </Card>
      )}

      {selectedImage && (
        <Card className="p-3">
          <View className="overflow-hidden rounded-xl">
            <Image
              source={{ uri: selectedImage.uri }}
              className="w-full h-56"
              resizeMode="cover"
            />
          </View>
          <Text className="mt-3 text-sm text-muted-foreground">
            Photo ready. We compress uploads to keep things snappy.
          </Text>
        </Card>
      )}

      {isAnalyzing && (
        <Card className="p-4 flex-row items-center gap-3">
          <ActivityIndicator size="small" color="#3aa27f" />
          <Text className="text-sm text-foreground">Analyzing your meal...</Text>
        </Card>
      )}

      {error && (
        <Card className="p-4 border border-rose-200 bg-rose-50">
          <View className="flex-row items-center gap-2 mb-2">
            <ShieldAlert size={18} color="#b42318" />
            <Text className="text-sm font-semibold text-rose-800">Something went wrong</Text>
          </View>
          <Text className="text-sm text-rose-700">{error}</Text>
        </Card>
      )}

      {analysis && (
        <Card className="p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-muted-foreground">GERD score</Text>
              <Text className="text-3xl font-bold text-foreground">
                {analysis.score} / 5
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${riskTone.bg}`}
            >
              <Text className={`text-xs font-semibold ${riskTone.text}`}>
                {analysis.label} risk
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Quick take</Text>
            <Text className="text-sm text-muted-foreground">{explanation}</Text>
            <Text className="text-xs text-muted-foreground">
              Confidence: {Math.round((analysis.confidence || 0) * 100)}%
            </Text>
          </View>

          {analysis.reasons?.length > 1 && (
            <View className="gap-1">
              <Text className="text-sm font-semibold text-foreground">Triggers noticed</Text>
              {analysis.reasons.slice(1).map((reason, idx) => (
                <Text key={idx} className="text-sm text-muted-foreground">
                  • {reason}
                </Text>
              ))}
            </View>
          )}

          {analysis.suggestions?.length > 0 && (
            <View className="gap-1">
              <Text className="text-sm font-semibold text-foreground">Suggestions</Text>
              {analysis.suggestions.map((item, idx) => (
                <Text key={idx} className="text-sm text-muted-foreground">
                  • {item}
                </Text>
              ))}
            </View>
          )}

          <View className="flex-row items-start gap-2 pt-2">
            <Info size={16} color="#5f6f74" />
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">
                Informational only, not medical advice. Pair with your logged history for context; we
                tailor suggestions as your records grow.
              </Text>
            </View>
          </View>

          <View className="gap-2 pt-4 border-t border-border">
            <Text className="text-sm font-semibold text-foreground">Add this to your meal log?</Text>
            <Text className="text-sm text-muted-foreground">
              Save the photo analysis so it counts toward your trigger insights.
            </Text>
            <View className="flex-row gap-2">
              <Button
                className="flex-1 h-auto py-3"
                disabled={isLoggingMeal || hasLoggedMeal}
                onPress={handleLogMeal}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Utensils size={16} color="#ffffff" />
                  <Text className="text-primary-foreground font-semibold">
                    {hasLoggedMeal ? "Logged" : isLoggingMeal ? "Logging..." : "Log this meal"}
                  </Text>
                </View>
              </Button>
              {!hasLoggedMeal && (
                <Button
                  variant="outline"
                  className="h-auto py-3 px-3"
                  onPress={() => showToast("Skipped", "You can log manually anytime.")}
                >
                  <Text className="text-foreground font-semibold">Maybe later</Text>
                </Button>
              )}
            </View>
            {hasLoggedMeal && (
              <Text className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                Added to your meal log with today&apos;s timestamp.
              </Text>
            )}
          </View>
        </Card>
      )}
    </Screen>
  );
}
