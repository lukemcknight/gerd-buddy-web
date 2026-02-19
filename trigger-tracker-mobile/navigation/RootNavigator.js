import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Home, BarChart3, FileText, Settings } from "lucide-react-native";
import HomeScreen from "../screens/HomeScreen";
import InsightsScreen from "../screens/InsightsScreen";
import ReportScreen from "../screens/ReportScreen";
import SettingsScreen from "../screens/SettingsScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import LogMealScreen from "../screens/LogMealScreen";
import LogSymptomScreen from "../screens/LogSymptomScreen";
import FoodScanScreen from "../screens/FoodScanScreen";
import PaywallScreen from "../screens/PaywallScreen.tsx";
import CustomerCenterScreen from "../screens/CustomerCenterScreen";
import { getTrialInfo } from "../services/storage";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => (
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

export default function RootNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [flow, setFlow] = useState("onboarding"); // onboarding | paywall | main

  useEffect(() => {
    const determineFlow = async () => {
      try {
        const info = await getTrialInfo();
        const user = info.user;

        const needsPaywall = !info.subscriptionActive;

        if (!user?.onboardingComplete) {
          setFlow("onboarding");
        } else if (needsPaywall) {
          setFlow("paywall");
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
    setFlow("paywall");
  };

  const handleUnlock = () => {
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

  const initialRoute =
    flow === "main" ? "Main" : flow === "paywall" ? "Paywall" : "Onboarding";

  return (
    <Stack.Navigator
      key={flow}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        initialParams={{ onComplete: handleOnboardingComplete }}
      />
      <Stack.Screen name="Paywall">
        {(props) => <PaywallScreen {...props} onUnlock={handleUnlock} />}
      </Stack.Screen>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="LogSymptom" component={LogSymptomScreen} />
      <Stack.Screen name="FoodScan" component={FoodScanScreen} />
      <Stack.Screen name="CustomerCenter" component={CustomerCenterScreen} />
    </Stack.Navigator>
  );
}
