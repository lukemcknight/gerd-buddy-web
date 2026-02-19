import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import Purchases, {
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesPackage,
  PurchasesError,
} from "react-native-purchases";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { configureRevenueCat, helpers } from "../services/revenuecat";
import { getTrialInfo } from "../services/storage";

type PaywallScreenProps = {
  navigation: any;
  onUnlock?: () => void;
};

const turtle = require("../assets/mascot/turtle_shell_standing.png");
const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");

const benefits = [
  "Daily insights to calm reflux triggers fast",
  "Clear logging to spot patterns without guesswork",
  "Gentle reminders that keep you consistent",
  "Actionable reports to discuss with your care team",
];

const valueLabel = (pkg: PurchasesPackage) => {
  switch (pkg.packageType) {
    case "ANNUAL":
      return "Best value · Most savings";
    case "MONTHLY":
      return "Flexible · Cancel anytime";
    case "WEEKLY":
      return "Quick check-in";
    default:
      return "Popular choice";
  }
};

const cadenceLabel = (pkg: PurchasesPackage) => {
  switch (pkg.packageType) {
    case "ANNUAL":
      return "Yearly";
    case "MONTHLY":
      return "Monthly";
    case "WEEKLY":
      return "Weekly";
    default:
      return pkg.packageType?.toString() || "Plan";
  }
};

const isBestValue = (pkg: PurchasesPackage) =>
  pkg.packageType === "ANNUAL" ||
  /year/i.test(pkg.identifier) ||
  /year/i.test(pkg?.product?.title ?? "");

const getIntroductoryPrice = (pkg: PurchasesPackage | null) => {
  if (!pkg) return null;
  const product: any = pkg.product || {};
  return product.introPrice || product.introductoryPrice || null;
};

const hasFreeTrial = (pkg: PurchasesPackage | null) => {
  const intro = getIntroductoryPrice(pkg);
  if (!intro) return false;
  const priceNumber = typeof intro.price === "number" ? intro.price : Number(intro.price);
  const paymentMode = intro.paymentMode || intro.introPriceType || intro.type;
  const priceIsFree = priceNumber === 0 || intro.priceString === "$0.00";
  const modeIndicatesTrial = typeof paymentMode === "string" && /trial/i.test(paymentMode);
  return Boolean(priceIsFree || modeIndicatesTrial);
};

const trialCtaText = (pkg: PurchasesPackage | null) => {
  const intro = getIntroductoryPrice(pkg);
  if (!intro) return "Start Free Trial";

  const parsePeriod = () => {
    const iso = intro.period || "";
    const numberMatch = iso.match(/\d+/);
    const valueFromIso = numberMatch ? parseInt(numberMatch[0], 10) : null;
    const unitChar = iso.replace(/^P/, "").replace(/\d+/g, "").charAt(0);
    const unitFromIso =
      unitChar === "D"
        ? "day"
        : unitChar === "W"
        ? "week"
        : unitChar === "M"
        ? "month"
        : unitChar === "Y"
        ? "year"
        : null;

    const units = intro.periodNumberOfUnits || valueFromIso;
    const unit =
      intro.periodUnit?.toString?.().toLowerCase?.() ||
      (unitFromIso ? `${unitFromIso}` : null);
    return { units, unit };
  };

  const { units, unit } = parsePeriod();
  if (!units || !unit) return "Start Free Trial";

  const singularUnit = unit.replace(/s$/, "");
  const duration = `${units}-${singularUnit.charAt(0).toUpperCase()}${singularUnit.slice(1)}`;
  return `Start ${duration} Free Trial`;
};

const entitlementActive = (info: CustomerInfo | null) => {
  const active = info?.entitlements?.active || {};
  return Boolean(
    active[helpers.ENTITLEMENT_ID] ||
      active[helpers.ENTITLEMENT_ID?.toLowerCase?.()] ||
      active.pro ||
      active["pro"]
  );
};

export default function PaywallScreen({ navigation, onUnlock }: PaywallScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const bestValueId = useMemo(
    () => packages.find(isBestValue)?.identifier ?? null,
    [packages]
  );

  useEffect(() => {
    let mounted = true;

    const loadOfferings = async () => {
      if (shouldBypassPaywall) {
        unlockApp();
        setIsLoading(false);
        setStatusMessage("Paywall bypassed for Expo/Dev.");
        return;
      }

      try {
        setIsLoading(true);
        setStatusMessage(null);

        const trialInfo = await getTrialInfo();
        if (!mounted) return;
        const currentUserId = trialInfo.user?.id ?? null;

        await configureRevenueCat(currentUserId);
        const offerings = await Purchases.getOfferings();
        if (!mounted) return;

        const offeringMap = offerings?.all || {};
        // Prefer RevenueCat's default/current offering; fallback to the first with packages.
        const preferredOffering =
          (offerings?.current?.availablePackages?.length ? offerings.current : null) ||
          Object.values(offeringMap).find(
            (offering: any) => offering?.availablePackages?.length
          ) ||
          null;

        if (!preferredOffering) {
          setPackages([]);
          setSelectedPackage(null);
          setStatusMessage(
            "We couldn't load plans right now. Please check your connection and try again."
          );
          return;
        }

        if (!preferredOffering.availablePackages?.length) {
          setPackages([]);
          setSelectedPackage(null);
          setStatusMessage("Plans are temporarily unavailable. Please try again soon.");
          return;
        }

        const available = preferredOffering.availablePackages;
        setPackages(available);
        const initial =
          available.find(isBestValue) ??
          available.find((pkg) => pkg.packageType === "MONTHLY") ??
          available[0] ??
          null;
        setSelectedPackage(initial);
      } catch (error) {
        const err = error as PurchasesError;
        setStatusMessage(
          err?.message || "Something went wrong while loading plans. Please try again."
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadOfferings();

    return () => {
      mounted = false;
    };
  }, []);

  const unlockApp = () => {
    onUnlock?.();
    navigation.replace("Main");
  };

  const handlePurchase = async () => {
    if (shouldBypassPaywall) {
      unlockApp();
      return;
    }
    if (!selectedPackage || isPurchasing) return;
    setIsPurchasing(true);
    try {
      setStatusMessage(null);
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

      if (entitlementActive(customerInfo)) {
        unlockApp();
        return;
      }

      const refreshed = await Purchases.getCustomerInfo();
      if (entitlementActive(refreshed)) {
        unlockApp();
        return;
      }

      setStatusMessage(
        "Purchase completed, but we couldn't confirm access yet. Please pull to refresh or try again."
      );
      Alert.alert(
        "Almost there",
        "We didn't see the entitlement unlock yet. It usually activates within a few seconds."
      );
    } catch (error) {
      const err = error as PurchasesError;
      const cancelled =
        err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
        (err as any)?.userCancelled;
      if (cancelled) {
        return;
      }
      const message = err?.message || "Purchase failed. Please try again.";
      setStatusMessage(message);
      Alert.alert("Purchase issue", message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (shouldBypassPaywall) {
      unlockApp();
      return;
    }
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      setStatusMessage(null);
      const restored = await Purchases.restorePurchases();
      if (entitlementActive(restored)) {
        unlockApp();
        return;
      }
      setStatusMessage("No active subscription found to restore.");
      Alert.alert("No purchases to restore", "We couldn't find an active subscription.");
    } catch (error) {
      const err = error as PurchasesError;
      const cancelled =
        err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
        (err as any)?.userCancelled;
      if (cancelled) {
        return;
      }
      const message = err?.message || "Restore failed. Please try again.";
      setStatusMessage(message);
      Alert.alert("Restore issue", message);
    } finally {
      setIsRestoring(false);
    }
  };

  const primaryCtaText = hasFreeTrial(selectedPackage)
    ? trialCtaText(selectedPackage)
    : "Subscribe to GERDBuddy Pro";

  const renderPackage = (pkg: PurchasesPackage) => {
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const best = bestValueId === pkg.identifier;
    const disabled = isPurchasing || isRestoring || isLoading;

    return (
      <Pressable
        key={pkg.identifier}
        onPress={() => setSelectedPackage(pkg)}
        disabled={disabled}
        className="rounded-3xl border border-border/80 bg-white"
        style={{
          shadowColor: "#1f3d33",
          shadowOpacity: best ? 0.12 : 0.06,
          shadowRadius: best ? 12 : 8,
          shadowOffset: { width: 0, height: 6 },
          elevation: best ? 6 : 2,
        }}
      >
        <LinearGradient
          colors={best ? ["#e1f3ec", "#f5fbf8"] : ["#ffffff", "#ffffff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 1 }}
        >
          <View
            className={`rounded-3xl px-4 py-4 ${
              isSelected ? "border border-primary/50 bg-primary/5" : "bg-white"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg font-semibold text-foreground">
                    {pkg.product?.title || "Premium"}
                  </Text>
                  {best ? (
                    <View className="rounded-full bg-primary/15 px-3 py-1">
                      <Text className="text-xs font-semibold text-primary">Best value</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-sm text-muted-foreground mt-1">
                  {valueLabel(pkg)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-xl font-bold text-foreground">
                  {pkg.product?.priceString}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  {cadenceLabel(pkg)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  const renderFallback = () => (
    <View className="rounded-3xl border border-border bg-white p-5">
      <Text className="text-lg font-semibold text-foreground">Plans unavailable</Text>
      <Text className="text-sm text-muted-foreground mt-2">
        We couldn't load subscription options right now. Please try again in a moment.
      </Text>
      <Button
        onPress={handleRestore}
        variant="outline"
        className="mt-4"
        textClassName="text-foreground font-semibold"
      >
        Restore purchases
      </Button>
    </View>
  );

  return (
    <Screen contentClassName="gap-6 pb-10 pt-6">
      <View className="items-center gap-4">
        <Image
          source={turtle}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
          className="rounded-3xl"
        />
        <Text className="text-center text-3xl font-extrabold text-foreground">
          Breathe easier with GERD Buddy
        </Text>
        <Text className="text-center text-base text-muted-foreground px-4">
          Friendly guidance to calm reflux triggers, track meals without stress, and feel in control
          every day.
        </Text>
      </View>

      <View className="rounded-3xl border border-border bg-white p-5">
        <Text className="text-lg font-semibold text-foreground">Premium gives you</Text>
        <View className="mt-3 gap-3">
          {benefits.map((benefit) => (
            <View key={benefit} className="flex-row items-start gap-3">
              <View className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <Text className="flex-1 text-base text-foreground">{benefit}</Text>
            </View>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center gap-3 py-8">
          <ActivityIndicator size="small" color="#3aa27f" />
          <Text className="text-muted-foreground">Loading your plans…</Text>
        </View>
      ) : packages.length ? (
        <View className="gap-3">{packages.map(renderPackage)}</View>
      ) : (
        renderFallback()
      )}

      <View className="gap-3">
        <Button
          onPress={handlePurchase}
          disabled={!selectedPackage || isPurchasing || isRestoring || isLoading}
          className="w-full"
        >
          <View className="flex-row items-center justify-center gap-2">
            {isPurchasing && <ActivityIndicator size="small" color="#ffffff" />}
            <Text className="text-lg font-semibold text-primary-foreground">
              {selectedPackage ? primaryCtaText : "Plans unavailable"}
            </Text>
          </View>
        </Button>

        <View className="gap-1">
          <Text className="text-center text-sm font-semibold text-foreground">
            GERDBuddy Pro subscription required
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            Cancel anytime during the free trial
          </Text>
        </View>

        <Button
          variant="ghost"
          onPress={handleRestore}
          disabled={isPurchasing || isRestoring}
          className="w-full"
          textClassName="text-foreground font-semibold"
        >
          {isRestoring ? "Restoring…" : "Restore purchases"}
        </Button>

        {statusMessage ? (
          <Text className="text-center text-xs text-muted-foreground">{statusMessage}</Text>
        ) : null}

        <Text className="text-center text-[11px] text-muted-foreground">
          After the 3-day free trial, the subscription automatically renews unless canceled at least
          24 hours before the end of the trial.
        </Text>

        <View className="flex-row justify-center gap-4 pt-2">
          <Pressable onPress={() => Linking.openURL("https://gerdbuddy.app/privacy")}>
            <Text className="text-[11px] text-primary underline">Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL("https://gerdbuddy.app/terms")}>
            <Text className="text-[11px] text-primary underline">Terms of Service</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
