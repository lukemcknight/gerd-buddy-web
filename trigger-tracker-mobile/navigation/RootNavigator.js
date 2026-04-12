import { useEffect, useState, useCallback, useRef } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, BarChart3, FileText, Settings, Camera, Image as ImageIcon } from "lucide-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { usePostHog } from "posthog-react-native";
import HomeScreen from "../screens/HomeScreen";
import InsightsScreen from "../screens/InsightsScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingsScreen from "../screens/SettingsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import OnboardingPlanScreen from "../screens/OnboardingPlanScreen";
import OnboardingDay7SummaryScreen from "../screens/OnboardingDay7SummaryScreen";
import LogMealScreen from "../screens/LogMealScreen";
import LogSymptomScreen from "../screens/LogSymptomScreen";
import ScanResultsScreen from "../screens/ScanResultsScreen";
import PaywallScreen from "../screens/PaywallScreen.tsx";
import CustomerCenterScreen from "../screens/CustomerCenterScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LoginScreen from "../screens/LoginScreen";
import BuddyAccessoriesScreen from "../screens/BuddyAccessoriesScreen";
import { getUser } from "../services/storage";
import { isFirebaseConfigured } from "../services/firebase";
import { syncReminderNotifications, syncSmartNotifications } from "../services/notifications";
import { canUserScan } from "../services/scannerGate";
import { EVENTS } from "../services/analytics";
import { showToast } from "../utils/feedback";

const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");

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
          tabBarActiveTintColor: "#3aa27f",
          tabBarInactiveTintColor: "#5f6f74",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#e1e8e3",
            backgroundColor: "#ffffff",
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginBottom: 4,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color }) => <Home size={20} color={color} />,
            title: "Home",
          }}
        />
        <Tab.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} />,
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
                  backgroundColor: "#3aa27f",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                }}
              >
                <Camera size={30} color="#ffffff" />
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
            tabBarIcon: ({ color }) => <FileText size={20} color={color} />,
            title: "Report",
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
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
                <Camera size={20} color="#3aa27f" style={{ marginRight: 14 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1f2a30" }}>
                  Snap Photo
                </Text>
              </View>
            </Pressable>

            <View style={{ height: 1, backgroundColor: "#f1f5f3", marginHorizontal: 16 }} />

            <Pressable onPress={() => pickImage("gallery")}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 }}>
                <ImageIcon size={20} color="#3aa27f" style={{ marginRight: 14 }} />
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
          setFlow("main");
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

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#3aa27f" />
        <Text className="mt-3 text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  const getInitialRoute = () => {
    switch (flow) {
      case "main":
        return "Main";
      case "signup":
        return "SignUp";
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
      <Stack.Screen name="Paywall">
        {(props) => <PaywallScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="LogSymptom" component={LogSymptomScreen} />
      <Stack.Screen name="ScanResults" component={ScanResultsScreen} />
      <Stack.Screen name="CustomerCenter" component={CustomerCenterScreen} />
      <Stack.Screen name="OnboardingPlan" component={OnboardingPlanScreen} />
      <Stack.Screen name="OnboardingDay7Summary" component={OnboardingDay7SummaryScreen} />
      <Stack.Screen name="BuddyAccessories" component={BuddyAccessoriesScreen} />
    </Stack.Navigator>
  );
}
