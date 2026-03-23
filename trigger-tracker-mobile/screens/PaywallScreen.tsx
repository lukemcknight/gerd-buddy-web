import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Purchases, {
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesPackage,
  PurchasesError,
} from "react-native-purchases";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { CommonActions } from "@react-navigation/native";
import Button from "../components/Button";
import { configureRevenueCat, helpers } from "../services/revenuecat";
import { getUser } from "../services/storage";
import { EVENTS } from "../services/analytics";

type PaywallScreenProps = {
  navigation: any;
  route?: any;
};

const turtle = require("../assets/mascot/turtle_excited.png");
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = __DEV__ && bypassFlag !== "false";

const benefits = [
  "Scan any meal",
  "Full trigger analysis with confidence scores",
  "Detailed analytics & pattern reports",
  "Share your pattern reports",
];

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
  if (!intro) return "Try for 7 Days Free";

  const parsePeriod = () => {
    const iso = intro.period || "";
    const numberMatch = iso.match(/\d+/);
    const valueFromIso = numberMatch ? parseInt(numberMatch[0], 10) : null;
    const unitChar = iso.replace(/^P/, "").replace(/\d+/g, "").charAt(0);
    const unitFromIso =
      unitChar === "D"
        ? "Day"
        : unitChar === "W"
        ? "Week"
        : unitChar === "M"
        ? "Month"
        : unitChar === "Y"
        ? "Year"
        : null;

    const units = intro.periodNumberOfUnits || valueFromIso;
    const unit =
      intro.periodUnit?.toString?.().toLowerCase?.() ||
      (unitFromIso ? unitFromIso.toLowerCase() : null);
    return { units, unit };
  };

  const { units, unit } = parsePeriod();
  if (!units || !unit) return "Try for 7 Days Free";

  const singularUnit = unit.replace(/s$/, "");
  const capitalUnit = singularUnit.charAt(0).toUpperCase() + singularUnit.slice(1);
  return `Try for ${units} ${capitalUnit}${Number(units) !== 1 ? "s" : ""} Free`;
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

const getMonthlyEquivalent = (pkg: PurchasesPackage) => {
  const price = pkg.product?.price;
  if (typeof price !== "number") return null;
  switch (pkg.packageType) {
    case "ANNUAL":
      return (price / 12).toFixed(2);
    case "WEEKLY":
      return (price * 4.33).toFixed(2);
    default:
      return null;
  }
};

const getSavingsPercent = (
  annualPkg: PurchasesPackage,
  monthlyPkg: PurchasesPackage | undefined
) => {
  if (!monthlyPkg) return null;
  const annualPrice = annualPkg.product?.price;
  const monthlyPrice = monthlyPkg.product?.price;
  if (typeof annualPrice !== "number" || typeof monthlyPrice !== "number") return null;
  const monthlyTotal = monthlyPrice * 12;
  if (monthlyTotal <= 0) return null;
  const savings = Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  return savings > 0 ? savings : null;
};

export default function PaywallScreen({ navigation, route }: PaywallScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("Paywall");
    posthog?.capture(EVENTS.PAYWALL_VIEWED);
    posthog?.capture(EVENTS.PAYWALL_TRIGGERED);
  }, []);

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

        const user = await getUser();
        if (!mounted) return;
        const currentUserId = user?.id ?? null;

        await configureRevenueCat(currentUserId);
        const offerings = await Purchases.getOfferings();
        if (!mounted) return;

        const offeringMap = offerings?.all || {};
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
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    );
  };

  const handlePurchase = async () => {
    if (shouldBypassPaywall) {
      unlockApp();
      return;
    }
    if (!selectedPackage || isPurchasing) return;
    setIsPurchasing(true);
    posthog?.capture("subscription_attempt", {
      package_type: selectedPackage.packageType,
      price: selectedPackage.product?.priceString,
    });
    try {
      setStatusMessage(null);
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

      if (entitlementActive(customerInfo)) {
        const isTrial = hasFreeTrial(selectedPackage);
        posthog?.capture(isTrial ? EVENTS.TRIAL_STARTED : EVENTS.PURCHASE_COMPLETED, {
          package_type: selectedPackage.packageType,
          price: selectedPackage.product?.priceString,
        });
        unlockApp();
        return;
      }

      const refreshed = await Purchases.getCustomerInfo();
      if (entitlementActive(refreshed)) {
        const isTrial = hasFreeTrial(selectedPackage);
        posthog?.capture(isTrial ? EVENTS.TRIAL_STARTED : EVENTS.PURCHASE_COMPLETED, {
          package_type: selectedPackage.packageType,
          price: selectedPackage.product?.priceString,
        });
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
        posthog?.capture("subscription_cancelled");
        return;
      }
      const message = err?.message || "Purchase failed. Please try again.";
      posthog?.capture("subscription_failed", { error: message });
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
        posthog?.capture(EVENTS.PURCHASE_RESTORED);
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
    : "Unlock Pro";

  const monthlyPkg = packages.find((p) => p.packageType === "MONTHLY");

  const renderPackage = (pkg: PurchasesPackage) => {
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const best = bestValueId === pkg.identifier;
    const disabled = isPurchasing || isRestoring || isLoading;
    const monthlyEquiv = getMonthlyEquivalent(pkg);
    const savings = best ? getSavingsPercent(pkg, monthlyPkg) : null;

    return (
      <Pressable
        key={pkg.identifier}
        onPress={() => setSelectedPackage(pkg)}
        disabled={disabled}
        style={{
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: isSelected ? "#3aa27f" : "#333333",
          backgroundColor: isSelected ? "rgba(58, 162, 127, 0.08)" : "#1a1a1a",
          padding: 16,
          position: "relative",
          overflow: "visible",
        }}
      >
        {savings ? (
          <View
            style={{
              position: "absolute",
              top: -11,
              right: 16,
              backgroundColor: "#3aa27f",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
              {savings}% OFF
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: isSelected ? "#3aa27f" : "#555555",
                backgroundColor: isSelected ? "#3aa27f" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSelected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
            </View>
            <View>
              <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "700" }}>
                {cadenceLabel(pkg)}
              </Text>
              <Text style={{ color: "#999999", fontSize: 13, marginTop: 1 }}>
                {best ? "Most Popular" : "Flexible"}
                {monthlyEquiv ? ` \u00B7 $${monthlyEquiv}/m` : ""}
              </Text>
            </View>
          </View>
          <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "700" }}>
            {pkg.product?.priceString}/{pkg.packageType === "ANNUAL" ? "yr" : pkg.packageType === "WEEKLY" ? "wk" : "mo"}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderFallback = () => (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#333333",
        backgroundColor: "#1a1a1a",
        padding: 16,
      }}
    >
      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
        Plans unavailable
      </Text>
      <Text style={{ color: "#999999", fontSize: 13, marginTop: 4 }}>
        We couldn't load subscription options right now. Please try again in a moment.
      </Text>
      <Pressable
        onPress={handleRestore}
        style={{
          marginTop: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "#444444",
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>
          Restore purchases
        </Text>
      </Pressable>
    </View>
  );

  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <LinearGradient
          colors={["#3aa27f", "#2d8a6b"]}
          style={{
            width: screenWidth,
            paddingTop: 60,
            paddingBottom: 40,
            alignItems: "center",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          {/* Scanner bracket corners with mascot */}
          <View
            style={{
              width: 180,
              height: 180,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Corner brackets */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 40,
                height: 40,
                borderTopWidth: 3,
                borderLeftWidth: 3,
                borderColor: "#ffffff",
                borderTopLeftRadius: 12,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 40,
                height: 40,
                borderTopWidth: 3,
                borderRightWidth: 3,
                borderColor: "#ffffff",
                borderTopRightRadius: 12,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 40,
                height: 40,
                borderBottomWidth: 3,
                borderLeftWidth: 3,
                borderColor: "#ffffff",
                borderBottomLeftRadius: 12,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 40,
                height: 40,
                borderBottomWidth: 3,
                borderRightWidth: 3,
                borderColor: "#ffffff",
                borderBottomRightRadius: 12,
              }}
            />

            <Image
              source={turtle}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: "800",
              textAlign: "center",
              lineHeight: 38,
            }}
          >
            Find your top triggers in 14 days.
          </Text>
          <Text
            style={{
              color: "#999999",
              fontSize: 15,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Unlimited scanning, trigger analysis, and detailed reports
          </Text>
        </View>

        {/* Benefits */}
        <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 14 }}>
          {benefits.map((text) => (
            <View
              key={text}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: "#3aa27f",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={15} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={{ color: "#ffffff", fontSize: 16, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Free trial card */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
          <View
            style={{
              backgroundColor: "#2a2a2a",
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
              Get 7 Day Free Trial!
            </Text>
            <Text style={{ color: "#999999", fontSize: 13, marginTop: 4 }}>
              Try Risk Free. Cancel Anytime.
            </Text>
          </View>
        </View>

        {/* Plan selection */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 14 }}>
          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
              <ActivityIndicator size="small" color="#3aa27f" />
              <Text style={{ color: "#999999", fontSize: 14 }}>Loading plans...</Text>
            </View>
          ) : packages.length ? (
            packages.map(renderPackage)
          ) : (
            renderFallback()
          )}
        </View>

        {/* Subscription disclaimers */}
        <View style={{ paddingHorizontal: 24, paddingTop: 28, gap: 12 }}>
          <Text
            style={{
              color: "#666666",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Subscriptions are charged via your Apple account. Your subscription will
            automatically renew unless it is cancelled at least 24 hours before the end of
            the current period.
          </Text>

          <Text
            style={{
              color: "#666666",
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Any unused portion of a Free Trial, if offered, is forfeited when you buy a
            subscription.
          </Text>
        </View>

        {/* Links row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <Pressable onPress={handleRestore} disabled={isPurchasing || isRestoring}>
            <Text style={{ color: "#999999", fontSize: 13, textDecorationLine: "underline" }}>
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/terms")}
          >
            <Text style={{ color: "#999999", fontSize: 13, textDecorationLine: "underline" }}>
              Terms
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/privacy")}
          >
            <Text style={{ color: "#999999", fontSize: 13, textDecorationLine: "underline" }}>
              Privacy
            </Text>
          </Pressable>
        </View>

        {statusMessage ? (
          <Text
            style={{
              color: "#999999",
              fontSize: 11,
              textAlign: "center",
              paddingHorizontal: 24,
              paddingTop: 8,
            }}
          >
            {statusMessage}
          </Text>
        ) : null}
      </ScrollView>

      {/* Sticky CTA at bottom */}
      <SafeAreaView
        edges={["bottom"]}
        style={{ backgroundColor: "#000000" }}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPackage || isPurchasing || isRestoring || isLoading}
            style={{
              backgroundColor: "#3aa27f",
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity:
                !selectedPackage || isPurchasing || isRestoring || isLoading ? 0.6 : 1,
            }}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : null}
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>
              {selectedPackage ? primaryCtaText : "Plans unavailable"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
