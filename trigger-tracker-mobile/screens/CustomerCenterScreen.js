import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
import Constants from "expo-constants";
import Screen from "../components/Screen";
import { configureRevenueCat } from "../services/revenuecat";
import { showToast } from "../utils/feedback";
import { getUser } from "../services/storage";

export default function CustomerCenterScreen({ navigation }) {
  const isExpoGo = Constants?.appOwnership === "expo";
  const [ready, setReady] = useState(false);
  const [CustomerCenterComponent, setCustomerCenterComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isExpoGo) {
      setError("Manage Subscription isn't available in Expo Go. Use a dev build to test.");
      return;
    }

    let mounted = true;
    const init = async () => {
      try {
        const RevenueCatUI = (await import("react-native-purchases-ui")).default;
        if (!mounted) return;
        setCustomerCenterComponent(() => RevenueCatUI.CustomerCenterView);

        const user = await getUser();
        await configureRevenueCat(user?.id);
        if (mounted) setReady(true);
      } catch (e) {
        setError(e.message);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [isExpoGo]);

  const handleEvent = async (event) => {
    if (event.type === "ACTION_COMPLETED") {
      showToast("Subscription updated");
    } else if (event.type === "ERROR") {
      const message = event.error?.message || "Something went wrong";
      setError(message);
      showToast("Customer Center error", message);
    } else if (event.type === "CLOSED") {
      navigation.goBack();
    }
  };

  const openSystemSubscriptions = () => {
    Linking.openURL("https://apps.apple.com/account/subscriptions");
  };

  return (
    <Screen contentClassName="flex-1">
      {isExpoGo && (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-lg font-semibold text-foreground">Manage Subscription</Text>
          <Text className="text-center text-muted-foreground">
            Manage Subscription uses native RevenueCat screens that are not bundled in Expo Go.
            Install a development build or production build to open the Customer Center.
          </Text>
          <Text
            onPress={() => navigation.goBack()}
            className="text-primary font-semibold"
          >
            Go back
          </Text>
        </View>
      )}
      {!ready && !error && !isExpoGo && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#3aa27f" />
          <Text className="mt-3 text-muted-foreground">Loading Customer Center...</Text>
        </View>
      )}
      {error && !ready && !isExpoGo && (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-center text-muted-foreground">
            Manage Subscription isn't available in this build. You can update or cancel from your
            App Store subscriptions.
          </Text>
          <Text
            onPress={openSystemSubscriptions}
            className="text-primary font-semibold"
          >
            Open App Store Subscriptions
          </Text>
          <Text
            onPress={() => navigation.goBack()}
            className="text-muted-foreground underline text-sm"
          >
            Go back
          </Text>
        </View>
      )}
      {ready && !isExpoGo && CustomerCenterComponent && (
        <CustomerCenterComponent
          style={{ flex: 1 }}
          onDismiss={() => navigation.goBack()}
        />
      )}
    </Screen>
  );
}
