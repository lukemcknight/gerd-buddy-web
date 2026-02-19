import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import {
  getTrialInfo,
} from "../services/storage";
import {
  configureRevenueCat,
  getOfferings,
  getSubscriptionStatus,
  purchasePackage,
  restoreTransactions,
  helpers,
} from "../services/revenuecat";
import { showToast } from "../utils/feedback";

export default function PaywallScreen({ navigation, onUnlock }) {
  const [trialInfo, setTrialInfo] = useState({
    daysRemaining: 3,
    isTrialActive: true,
    requiresPayment: false,
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [debugNote, setDebugNote] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const isWeb = Platform.OS === "web";
  const paywallUnavailable = isWeb; // In-app purchases are native-only

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setStatusError(null);
        setDebugNote(null);
        const info = await getTrialInfo();
        if (!mounted) return;
        setTrialInfo(info);

        // Skip setup on web where purchases are unavailable.
        if (paywallUnavailable) {
          setIsLoading(false);
          return;
        }
        // Configure once per app lifecycle; subsequent calls no-op.
        await configureRevenueCat(info.user?.id);

        const status = await getSubscriptionStatus(info.user?.id);
        if (status.active) {
          onUnlock?.();
          navigation.replace("Main");
          return;
        }

        const offerings = await getOfferings(info.user?.id);
        const preferredOffering =
          offerings?.all?.[helpers.OFFERING_ID] || offerings?.current;
        const currentOffering = preferredOffering;

        if (!currentOffering) {
          console.warn("RevenueCat offerings missing", offerings);
          setDebugNote(
            `No offering returned. Available offering ids: ${
              offerings?.all ? Object.keys(offerings.all).join(", ") : "none"
            }`
          );
          setAvailablePackages([]);
          return;
        }

        if (!currentOffering.availablePackages?.length) {
          console.warn("RevenueCat offering has no available packages", currentOffering);
          setDebugNote("No packages available in current offering.");
          setAvailablePackages([]);
          return;
        }

        setAvailablePackages(currentOffering.availablePackages);
        setSelectedPackage(currentOffering.availablePackages[0]);
      } catch (error) {
        if (mounted) {
          setStatusError(error.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [navigation, onUnlock]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    try {
      setStatusError(null);
      const status = await purchasePackage(selectedPackage, trialInfo.user?.id);
      if (status.active) {
        // Only unlock when the entitlement is confirmed active.
        onUnlock?.();
        navigation.replace("Main");
        showToast("Subscription unlocked");
        return;
      }

      // Retry fetching status once in case entitlements are slightly delayed.
      const refreshed = await getSubscriptionStatus(trialInfo.user?.id);
      if (refreshed.active) {
        onUnlock?.();
        navigation.replace("Main");
        showToast("Subscription unlocked");
        return;
      }

      setStatusError("Purchase completed but entitlement is not active yet.");
      setDebugNote(
        `Entitlement check failed. Active entitlements: ${
          refreshed.activeEntitlements?.join(", ") || "none"
        }. Matched key: ${refreshed.matchedEntitlementKey || "none"}`
      );
    } catch (error) {
      // Ignore user cancellation; surface other errors.
      if (!helpers.isUserCancelled(error)) {
        const message = error?.message || "Purchase failed";
        setStatusError(message);
        showToast("Purchase failed", message);
        console.warn("RevenueCat purchase failed", error);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      setStatusError(null);
      const status = await restoreTransactions(trialInfo.user?.id);
      if (status.active) {
        onUnlock?.();
        navigation.replace("Main");
        showToast("Purchases restored");
        return;
      }
      setStatusError("No active entitlement found after restore.");
      setDebugNote(
        `Restore returned no active entitlement. Active entitlements: ${
          status.activeEntitlements?.join(", ") || "none"
        }. Matched key: ${status.matchedEntitlementKey || "none"}`
      );
    } catch (error) {
      if (!helpers.isUserCancelled(error)) {
        const message = error?.message || "Restore failed";
        setStatusError(message);
        showToast("Restore failed", message);
        console.warn("RevenueCat restore failed", error);
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleContinueWeb = () => {
    onUnlock?.();
    navigation.replace("Main");
  };

  if (paywallUnavailable) {
    return (
      <Screen contentClassName="flex-1 justify-between px-6 pb-8 pt-6" scrollable={false}>
        <View className="gap-3">
          <Text className="text-3xl font-bold text-foreground">Native paywall required</Text>
          <Text className="text-base text-muted-foreground">
            In-app purchases are only available in a native build that includes RevenueCat UI.
            Please open the iOS/Android app (or a dev build that includes RevenueCat) to subscribe
            for $4.99/month.
          </Text>
          <Text className="text-sm text-muted-foreground">
            If you are in Expo Go, install a custom dev build with RevenueCat UI, or run
            `npx expo start --ios` with the dev client to see the native paywall.
          </Text>
        </View>

        <View className="gap-2">
          <Button onPress={handleContinueWeb} className="w-full">
            Continue to app (web preview)
          </Button>
          {statusError && (
            <Text className="text-xs text-destructive text-center">{statusError}</Text>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="flex-1 px-5 pt-6 pb-8" scrollable={false}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#3aa27f" />
          <Text className="mt-3 text-muted-foreground">Loading paywall...</Text>
        </View>
      ) : (
        <View className="flex-1 gap-4">
          <View className="gap-2">
            <Text className="text-2xl font-bold text-foreground">Unlock GERDBuddy</Text>
            <Text className="text-base text-muted-foreground">
              Choose a plan to continue. Entitlements unlock when the purchase is active.
            </Text>
            {debugNote && (
              <Text className="text-xs text-muted-foreground">
                Info: {debugNote} | Selected offering: {helpers.OFFERING_ID}
              </Text>
            )}
          </View>

          {!availablePackages.length && (
            <View className="rounded-xl border border-border/60 bg-card/80 p-4">
              <Text className="text-foreground font-semibold">No packages available</Text>
              <Text className="text-sm text-muted-foreground mt-1">
                We could not load offerings. Please try again later.
              </Text>
              {debugNote && (
                <Text className="text-xs text-muted-foreground mt-2">Details: {debugNote}</Text>
              )}
            </View>
          )}

          {availablePackages.map((pkg) => (
            <Button
              key={pkg?.identifier}
              variant={pkg?.identifier === selectedPackage?.identifier ? "primary" : "outline"}
              onPress={() => setSelectedPackage(pkg)}
              className="w-full justify-between"
              textClassName="flex-1 text-left"
            >
              <View className="w-full flex-row items-center justify-between">
                <Text
                  className={`${
                    pkg?.identifier === selectedPackage?.identifier
                      ? "text-primary-foreground"
                      : "text-foreground"
                  } font-semibold`}
                >
                  {pkg?.product?.title || pkg?.product?.name || "Package"}
                </Text>
                <Text
                  className={`${
                    pkg?.identifier === selectedPackage?.identifier
                      ? "text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {pkg?.product?.priceString || ""}
                </Text>
              </View>
            </Button>
          ))}

          <Button
            onPress={handlePurchase}
            disabled={!selectedPackage || isPurchasing}
            className="w-full"
          >
            <View className="flex-row items-center justify-center gap-2">
              {isPurchasing && <ActivityIndicator size="small" color="#ffffff" />}
              <Text className="text-primary-foreground font-semibold">
                {selectedPackage ? "Continue" : "No package available"}
              </Text>
            </View>
          </Button>

          <Button
            variant="ghost"
            onPress={handleRestore}
            disabled={isRestoring}
            className="w-full"
            textClassName="text-foreground font-semibold"
          >
            {isRestoring ? "Restoring..." : "Restore purchases"}
          </Button>

          {statusError && (
            <Text className="text-xs text-destructive text-center">{statusError}</Text>
          )}

          {debugNote && (
            <Text className="text-xs text-muted-foreground text-center">Info: {debugNote}</Text>
          )}
        </View>
      )}
    </Screen>
  );
}
