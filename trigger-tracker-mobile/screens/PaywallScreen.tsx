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
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Button from "../components/Button";
import { configureRevenueCat, helpers } from "../services/revenuecat";
import { getTrialInfo } from "../services/storage";
import { recordPaywallShown, getEntitlementState } from "../services/paywallTrigger";
import { EVENTS } from "../services/analytics";

type PaywallScreenProps = {
  navigation: any;
  route?: any;
};

const turtle = require("../assets/mascot/turtle_excited.png");
const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");

const APP_STORE_RATING = 4.3;

const benefits = [
  "Personal trigger confidence scores",
  "14-day symptom + food heatmap",
  "Doctor-ready PDF report for GI appointments",
  "Scan any food or menu in 2 seconds",
  "Safe-foods shortlist that learns as you log",
  "Private by default — your data stays on your device",
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
  const triggerSource = route?.params?.trigger_source || "manual";
  const isScannerLimit = triggerSource === "scanner_limit";
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("Paywall");
    posthog?.capture(EVENTS.PAYWALL_VIEWED, {
      trigger_source: triggerSource,
    });
    posthog?.capture(EVENTS.PAYWALL_TRIGGERED, {
      trigger_source: triggerSource,
    });
    recordPaywallShown().catch(() => {});
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

        const trialInfo = await getTrialInfo();
        if (!mounted) return;
        const currentUserId = trialInfo.user?.id ?? null;

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
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Main");
    }
  };

  const handlePurchase = async () => {
    if (shouldBypassPaywall) {
      unlockApp();
      return;
    }
    if (!selectedPackage || isPurchasing) return;
    setIsPurchasing(true);
    posthog?.capture(EVENTS.SUBSCRIPTION_ATTEMPT, {
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
          trigger_source: triggerSource,
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
          trigger_source: triggerSource,
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
        posthog?.capture(EVENTS.SUBSCRIPTION_CANCELLED);
        return;
      }
      const message = err?.message || "Purchase failed. Please try again.";
      posthog?.capture(EVENTS.SUBSCRIPTION_FAILED, { error: message });
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
        posthog?.capture(EVENTS.PURCHASE_RESTORED, {
          trigger_source: triggerSource,
        });
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

  const primaryCtaText = isScannerLimit
    ? "Start 7-Day Free Trial"
    : hasFreeTrial(selectedPackage)
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
            paddingTop: 56,
            paddingBottom: 24,
            alignItems: "center",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.replace("Main")
            }
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.2)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={18} color="#ffffff" />
          </Pressable>

          {/* Scanner bracket corners with mascot */}
          <View
            style={{
              width: 124,
              height: 124,
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
                width: 28,
                height: 28,
                borderTopWidth: 3,
                borderLeftWidth: 3,
                borderColor: "#ffffff",
                borderTopLeftRadius: 10,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 28,
                height: 28,
                borderTopWidth: 3,
                borderRightWidth: 3,
                borderColor: "#ffffff",
                borderTopRightRadius: 10,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 28,
                height: 28,
                borderBottomWidth: 3,
                borderLeftWidth: 3,
                borderColor: "#ffffff",
                borderBottomLeftRadius: 10,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 28,
                height: 28,
                borderBottomWidth: 3,
                borderRightWidth: 3,
                borderColor: "#ffffff",
                borderBottomRightRadius: 10,
              }}
            />

            <Image
              source={turtle}
              style={{ width: 84, height: 84 }}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* Headline */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4 }}>
          {!isScannerLimit ? (
            <>
              <Text
                className="text-2xl font-extrabold"
                style={{
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: "800",
                  textAlign: "center",
                  lineHeight: 34,
                }}
              >
                Stop guessing what triggers your reflux.
              </Text>
              <Text
                style={{
                  color: "#999999",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Try free for 7 days. Cancel anytime.
              </Text>
              <Text
                style={{
                  color: "#c9c9c9",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 10,
                  letterSpacing: 0.2,
                }}
              >
                ★★★★☆  {APP_STORE_RATING.toFixed(1)} on the App Store
              </Text>
            </>
          ) : (
            <>
              <Text
                className="text-2xl font-extrabold"
                style={{
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: "800",
                  textAlign: "center",
                  lineHeight: 34,
                }}
              >
                Try Pro free for 7 days
              </Text>
              <Text
                style={{
                  color: "#999999",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                You've used your 3 free scans
              </Text>
            </>
          )}
        </View>

        {/* Benefits */}
        <View style={{ paddingHorizontal: 24, paddingTop: 12, gap: 10 }}>
          {benefits.map((text) => (
            <View
              key={text}
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#3aa27f",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={14} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={{ color: "#ffffff", fontSize: 15, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Trial timeline — reframes the trial as safe/time-boxed */}
        {hasFreeTrial(selectedPackage) ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 22, gap: 12 }}>
            {[
              { when: "Today", body: "Unlock everything. $0 charged." },
              { when: "Day 5", body: "We'll remind you your trial is ending." },
              {
                when: "Day 7",
                body: "Trial ends. Cancel in Settings before then and pay nothing.",
              },
            ].map((step) => (
              <View
                key={step.when}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: "#3aa27f",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  <Check size={13} color="#3aa27f" strokeWidth={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>
                    {step.when}
                  </Text>
                  <Text style={{ color: "#999999", fontSize: 13, marginTop: 1 }}>
                    {step.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Plan selection */}
        <View style={{ paddingHorizontal: 24, paddingTop: 18, gap: 12 }}>
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
          {hasFreeTrial(selectedPackage) ? (
            <Text
              style={{
                color: "#9ca3af",
                fontSize: 12,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              $0 today · We'll remind you 2 days before the trial ends
            </Text>
          ) : null}
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
