import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { Home, BarChart3, FileText, Settings } from "lucide-react-native";
import HomeScreen from "../screens/HomeScreen";
import InsightsScreen from "../screens/InsightsScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingsScreen from "../screens/SettingsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import OnboardingPlanScreen from "../screens/OnboardingPlanScreen";
import OnboardingDay7SummaryScreen from "../screens/OnboardingDay7SummaryScreen";
import LogMealScreen from "../screens/LogMealScreen";
import LogSymptomScreen from "../screens/LogSymptomScreen";
import FoodScanScreen from "../screens/FoodScanScreen";
import PaywallScreen from "../screens/PaywallScreen.tsx";
import CustomerCenterScreen from "../screens/CustomerCenterScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LoginScreen from "../screens/LoginScreen";
import BuddyAccessoriesScreen from "../screens/BuddyAccessoriesScreen";
import { getUser } from "../services/storage";
import { isFirebaseConfigured } from "../services/firebase";
import { syncReminderNotifications, syncSmartNotifications } from "../services/notifications";
import { getSubscriptionStatus, configureRevenueCat } from "../services/revenuecat";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState !== "active") return;
      try {
        const user = await getUser();
        if (!user?.id) return;
        await configureRevenueCat(user.id);
        const status = await getSubscriptionStatus(user.id);
        if (!status.active) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Paywall" }],
            })
          );
        }
      } catch {
        // Offline — fail open
      }
    });
    return () => subscription.remove();
  }, [navigation]);

  return (
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
  );
};

export default function RootNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [flow, setFlow] = useState("onboarding"); // onboarding | signup | paywall | main

  useEffect(() => {
    const determineFlow = async () => {
      try {
        const user = await getUser();
        if (user?.onboardingComplete) {
          syncReminderNotifications({
            remindersEnabled: user.remindersEnabled ?? true,
            eveningReminderEnabled: user.eveningReminderEnabled ?? false,
          }).catch((err) => console.warn("Failed to sync reminders:", err));
          syncSmartNotifications().catch((err) =>
            console.warn("Failed to sync smart notifications:", err)
          );

          let hasActiveSubscription = false;
          try {
            await configureRevenueCat(user.id);
            const status = await getSubscriptionStatus(user.id);
            hasActiveSubscription = status.active;
          } catch (err) {
            hasActiveSubscription = Boolean(user.subscriptionActive);
          }

          if (hasActiveSubscription) {
            setFlow("main");
          } else {
            setFlow("paywall");
          }
        } else {
          setFlow("onboarding");
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
    // Return the next screen name - SignUp if Firebase is configured, otherwise straight to Main
    if (isFirebaseConfigured) {
      return "SignUp";
    } else {
      return "Main";
    }
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
      case "paywall":
        return "Paywall";
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
      <Stack.Screen
        name="Paywall"
        options={{ gestureEnabled: false }}
      >
        {(props) => <PaywallScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="LogSymptom" component={LogSymptomScreen} />
      <Stack.Screen name="FoodScan" component={FoodScanScreen} />
      <Stack.Screen name="CustomerCenter" component={CustomerCenterScreen} />
      <Stack.Screen name="OnboardingPlan" component={OnboardingPlanScreen} />
      <Stack.Screen name="OnboardingDay7Summary" component={OnboardingDay7SummaryScreen} />
      <Stack.Screen name="BuddyAccessories" component={BuddyAccessoriesScreen} />
    </Stack.Navigator>
  );
}
