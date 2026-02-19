import "react-native-gesture-handler";
import "react-native-reanimated";
import "./global.css";
import "./services/notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PostHogProvider } from "posthog-react-native";
import { AuthProvider } from "./contexts/AuthContext";
import RootNavigator from "./navigation/RootNavigator";
import { POSTHOG_CONFIG } from "./services/analytics";
import { getDaysSinceStart, getMeals } from "./services/storage";
import { maybePromptForReview } from "./services/reviewPrompt";

const queryClient = new QueryClient();

function useReviewPrompt() {
  useEffect(() => {
    let isActive = true;
    const checkForReview = async () => {
      try {
        const [daysSinceStart, meals] = await Promise.all([
          getDaysSinceStart(),
          getMeals(),
        ]);
        if (!isActive) return;
        await maybePromptForReview({
          daysSinceStart,
          mealCount: meals.length,
        });
      } catch (error) {
        console.warn("Review prompt check failed", error);
      }
    };

    checkForReview();
    return () => {
      isActive = false;
    };
  }, []);
}

function AppContent() {
  useReviewPrompt();

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}

export default function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            {POSTHOG_CONFIG.apiKey ? (
              <PostHogProvider
                apiKey={POSTHOG_CONFIG.apiKey}
                options={{ host: POSTHOG_CONFIG.host }}
                autocapture={{
                  captureTouches: true,
                  captureScreens: false,
                }}
              >
                <AppContent />
              </PostHogProvider>
            ) : (
              <AppContent />
            )}
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
