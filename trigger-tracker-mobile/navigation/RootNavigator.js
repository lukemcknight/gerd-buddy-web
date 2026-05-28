import { useEffect, useState, useCallback, useRef } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BarChart3, Camera, FileText, Home, Image as ImageIcon, Settings } from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { usePostHog } from "posthog-react-native";
import HomeScreen from "../screens/HomeScreen";
import InsightsScreen from "../screens/InsightsScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingsScreen from "../screens/SettingsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import OnboardingPlanScreen from "../screens/OnboardingPlanScreen";
import OnboardingDay7SummaryScreen from "../screens/OnboardingDay7SummaryScreen";
import DoctorChatScreen from "../screens/DoctorChatScreen";
import LogMealScreen from "../screens/LogMealScreen";
import LogSymptomScreen from "../screens/LogSymptomScreen";
import ScanResultsScreen from "../screens/ScanResultsScreen";
import PaywallScreen from "../screens/PaywallScreen.tsx";
import PrePaywallPlanScreen from "../screens/PrePaywallPlanScreen.tsx";
import PrePaywallTryFreeScreen from "../screens/PrePaywallTryFreeScreen.tsx";
import PrePaywallTimelineScreen from "../screens/PrePaywallTimelineScreen.tsx";
import CustomerCenterScreen from "../screens/CustomerCenterScreen";
import CancelSubscriptionScreen from "../screens/CancelSubscriptionScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LoginScreen from "../screens/LoginScreen";
import { getUser, getTrialInfo } from "../services/storage";
import { isFirebaseConfigured } from "../services/firebase";
import { syncReminderNotifications, syncSmartNotifications } from "../services/notifications";
import { canUserScan } from "../services/scannerGate";
import { isGrandfatheredUser } from "../services/featureFlags";
import { EVENTS } from "../services/analytics";
import { showToast } from "../utils/feedback";
import { shouldBypassPaywall } from "../utils/devMode";
import SplashAnimation from "../components/SplashAnimation";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Placeholder component — the Scan tab never renders; its button is intercepted
function ScanPlaceholder() {
  return null;
}

const TabNavigator = () => {
  const posthog = usePostHog();
  const [menuVisible, setMenuVisible] = useState(false);
  const [gateResultCache, setGateResultCache] = useState(null);
  const navigationRef = useRef(null);
  const menuOpacity = useSharedValue(0);

  const openMenu = () => {
    setMenuVisible(true);
    menuOpacity.value = withTiming(1, { duration: 120 });
  };

  const closeMenu = () => {
    menuOpacity.value = withTiming(0, { duration: 100 });
    setTimeout(() => setMenuVisible(false), 110);
  };

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ scale: 0.95 + menuOpacity.value * 0.05 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value * 0.25,
  }));

  const handleScanPress = useCallback(async (navigation) => {
    navigationRef.current = navigation;

    // Gate check before showing menu
    let gateResult = null;
    if (!shouldBypassPaywall) {
      gateResult = await canUserScan();
      if (!gateResult.allowed) {
        posthog?.capture(EVENTS.SCANNER_BLOCKED_LIMIT_REACHED, {
          free_scan_count: gateResult.freeScanCount,
          limit: gateResult.freeScanLimit,
        });
        navigation.navigate("Paywall", { trigger_source: "scanner_limit" });
        return;
      }
      posthog?.capture(EVENTS.SCANNER_ALLOWED, {
        entitlement_state: gateResult.entitlementState,
        free_scan_count_before: gateResult.freeScanCount,
      });
    } else {
      gateResult = { allowed: true, reason: "pro", entitlementState: "pro", freeScanCount: 0, freeScanLimit: 3 };
    }

    posthog?.capture(EVENTS.SCANNER_ATTEMPTED, {
      entitlement_state: gateResult?.entitlementState,
      free_scan_count: gateResult?.freeScanCount,
    });

    setGateResultCache(gateResult);
    openMenu();
  }, [posthog]);

  const pickImage = useCallback(async (type) => {
    closeMenu();

    const request = type === "camera"
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { granted, canAskAgain } = await request();
    if (!granted) {
      if (!canAskAgain) {
        showToast("Permission needed", "Open settings to re-enable camera or gallery access.");
      } else {
        showToast("Permission needed", "Please allow access so we can analyze your meal photo.");
      }
      return;
    }

    const picker = type === "camera"
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

    navigationRef.current?.navigate("ScanResults", { asset, gateResult: gateResultCache });
  }, [gateResultCache]);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#154212",
          tabBarInactiveTintColor: "#72796e",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#e5e2d9",
            backgroundColor: "#fcf9f8",
            paddingBottom: 8,
            paddingTop: 8,
            height: 78,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.4,
            marginBottom: 4,
            textTransform: "uppercase",
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2} />,
            title: "Home",
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} strokeWidth={2} />,
            title: "Insights",
          }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanPlaceholder}
          options={({ navigation }) => ({
            tabBarIcon: () => (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#154212",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 4,
                }}
              >
                <Camera size={32} color="#ffffff" strokeWidth={2.2} />
              </View>
            ),
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => handleScanPress(navigation)}
              />
            ),
          })}
        />
        <Tab.Screen
          name="Report"
          component={ReportScreen}
          options={{
            tabBarIcon: ({ color }) => <FileText size={24} color={color} strokeWidth={2} />,
            title: "Report",
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color }) => <Settings size={24} color={color} strokeWidth={2} />,
            title: "Settings",
          }}
        />
      </Tab.Navigator>

      {/* Popover menu */}
      {menuVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Backdrop */}
          <Pressable
            onPress={closeMenu}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Animated.View
              style={[
                { flex: 1, backgroundColor: "#000" },
                backdropStyle,
              ]}
            />
          </Pressable>

          {/* Menu card — anchored above the center tab button */}
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 80,
                alignSelf: "center",
                backgroundColor: "#ffffff",
                borderRadius: 20,
                paddingVertical: 8,
                paddingHorizontal: 8,
                width: 260,
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
                elevation: 12,
                transformOrigin: "bottom center",
              },
              menuStyle,
            ]}
          >
            {/* Caret / arrow */}
            <View
              style={{
                position: "absolute",
                bottom: -8,
                alignSelf: "center",
                width: 0,
                height: 0,
                borderLeftWidth: 10,
                borderRightWidth: 10,
                borderTopWidth: 8,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: "#ffffff",
              }}
            />

            <Pressable onPress={() => pickImage("camera")}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 }}>
                <Camera size={20} color="#154212" style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1f2a30" }}>
                  Snap Photo
                </Text>
              </View>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "#f1f5f3", marginHorizontal: 16 }} />

            <Pressable onPress={() => pickImage("gallery")}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 }}>
                <ImageIcon size={20} color="#154212" style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1f2a30" }}>
                  Select from Gallery
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default function RootNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [flow, setFlow] = useState("onboarding"); // onboarding | signup | main
  // Enforce a minimum splash duration so the animated brand reveal lands even
  // when route determination is instant. Cold-launch only — this hook runs
  // once on mount.
  const [splashElapsed, setSplashElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSplashElapsed(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const determineFlow = async () => {
      try {
        const user = await getUser();

        if (user?.onboardingComplete) {
          // Sync reminders in background - don't let failures affect navigation
          syncReminderNotifications({
            remindersEnabled: user.remindersEnabled ?? true,
            eveningReminderEnabled: user.eveningReminderEnabled ?? false,
          }).catch((err) => console.warn("Failed to sync reminders:", err));
          syncSmartNotifications().catch((err) =>
            console.warn("Failed to sync smart notifications:", err)
          );
        }

        if (!user?.onboardingComplete) {
          setFlow("onboarding");
        } else {
          const grandfathered = isGrandfatheredUser(user);
          let hasPro = Boolean(user?.subscriptionActive);

          // Stale-cache safeguard: before routing to the hard paywall, refresh
          // entitlement state from RevenueCat. Without this, an active
          // subscriber whose local `subscriptionActive` flag is stale (renewal
          // mid-session, restore on another device, prior write didn't persist)
          // would get locked behind the paywall on launch. Only run for users
          // we'd otherwise paywall — grandfathered and already-Pro users skip
          // the network call.
          if (!grandfathered && !hasPro && !shouldBypassPaywall) {
            try {
              const info = await getTrialInfo();
              hasPro = Boolean(info?.subscriptionActive);
            } catch (err) {
              console.warn("RC refresh before paywall failed; using cached value", err);
            }
          }

          if (!grandfathered && !hasPro && !shouldBypassPaywall) {
            setFlow("hard_paywall");
          } else {
            setFlow("main");
          }
        }
      } catch (error) {
        console.warn("Failed to load user state", error);
        setFlow("onboarding");
      } finally {
        setIsReady(true);
      }
    };
    determineFlow();
  }, []);

  const handleOnboardingComplete = () => {
    // After onboarding, user goes to Paywall (handled inside OnboardingScreen)
    // This is kept for backwards compatibility but is no longer called
    return "Main";
  };

  const handleSignUpComplete = () => {
    setFlow("main");
  };

  if (!isReady || !splashElapsed) {
    return <SplashAnimation />;
  }

  const getInitialRoute = () => {
    switch (flow) {
      case "main":
        return "Main";
      case "signup":
        return "SignUp";
      case "hard_paywall":
        return "PrePaywallPlan";
      default:
        return "Onboarding";
    }
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        initialParams={{ onComplete: handleOnboardingComplete }}
      />
      <Stack.Screen name="SignUp">
        {(props) => (
          <SignUpScreen {...props} onSkip={handleSignUpComplete} />
        )}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {(props) => (
          <LoginScreen {...props} onSuccess={handleSignUpComplete} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="PrePaywallPlan"
        component={PrePaywallPlanScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="PrePaywallTryFree"
        component={PrePaywallTryFreeScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="PrePaywallTimeline"
        component={PrePaywallTimelineScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="Paywall" options={{ gestureEnabled: false }}>
        {(props) => <PaywallScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="LogSymptom" component={LogSymptomScreen} />
      <Stack.Screen name="ScanResults" component={ScanResultsScreen} />
      <Stack.Screen name="CustomerCenter" component={CustomerCenterScreen} />
      <Stack.Screen name="CancelSubscription" component={CancelSubscriptionScreen} />
      <Stack.Screen name="OnboardingPlan" component={OnboardingPlanScreen} />
      <Stack.Screen name="OnboardingDay7Summary" component={OnboardingDay7SummaryScreen} />
      <Stack.Screen name="DoctorChat" component={DoctorChatScreen} />
    </Stack.Navigator>
  );
}
