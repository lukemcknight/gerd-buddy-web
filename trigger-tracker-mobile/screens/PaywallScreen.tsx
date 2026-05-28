import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Switch,
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
import { Camera, Check, ChevronLeft, FileText, MessageCircle } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { configureRevenueCat, helpers } from "../services/revenuecat";
import { getTrialInfo, getUser, saveUser } from "../services/storage";
import { recordPaywallShown, getEntitlementState } from "../services/paywallTrigger";
import { EVENTS } from "../services/analytics";
import { isNewPaywallFunnelEnabled } from "../services/featureFlags";
import { shouldBypassPaywall } from "../utils/devMode";
import BrandMark from "../components/BrandMark";

type PaywallScreenProps = {
  navigation: any;
  route?: any;
};

// Hide the close button for the first N ms so users see the offer before
// being able to dismiss. Mirrors industry-standard trial-paywall pattern.
const CLOSE_BUTTON_DELAY_MS = 5000;
const canUseDevBypass = typeof __DEV__ !== "undefined" && __DEV__;

const BENEFITS = [
  {
    title: "Ask GERDBuddy AI about your patterns",
    body: "Get answers grounded in YOUR meals and symptoms, not generic GERD advice.",
    Icon: MessageCircle,
    iconColor: "#154212",
    iconBg: "#ecf5e9",
    iconBorder: "#cfdcca",
  },
  {
    title: "Scan meals into evidence",
    body: "Turn photos into logged foods that build your trigger report.",
    Icon: Camera,
    iconColor: "#774400",
    iconBg: "#fff5e8",
    iconBorder: "#f4ddbd",
  },
  {
    title: "Doctor-ready GI visit prep",
    body: "AI-personalized questions plus your full trigger report in one shareable PDF.",
    Icon: FileText,
    iconColor: "#303030",
    iconBg: "#f0eded",
    iconBorder: "#e5e2d9",
  },
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
  if (!intro) return "Start Free Trial";

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
  if (!units || !unit) return "Start Free Trial";

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

// Mirror the active entitlement to the local user record so screens that gate
// on getEntitlementState() (e.g. SettingsScreen's focus effect) reflect Pro
// immediately on return — not after the next navigation cycle.
const syncLocalProFlag = async () => {
  try {
    const u = await getUser();
    if (u && !u.subscriptionActive) {
      await saveUser({ ...u, subscriptionActive: true });
    }
  } catch {
    // Non-fatal: focus effect will recover on next sync
  }
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
  const newFunnelOn = isNewPaywallFunnelEnabled();
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [canClose, setCanClose] = useState(shouldBypassPaywall);
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(true);
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

  useEffect(() => {
    if (canClose) return;
    const timer = setTimeout(() => setCanClose(true), CLOSE_BUTTON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [canClose]);

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

        const hasPackages = (o: any) =>
          Boolean(o && Array.isArray(o.availablePackages) && o.availablePackages.length > 0);
        const preferredOffering =
          (hasPackages(offerings?.current) && offerings.current) ||
          Object.values(offerings?.all || {}).find(hasPackages) ||
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

  const goToMain = () => {
    if (typeof navigation.reset === "function") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
      return;
    }
    navigation.replace("Main");
  };

  const unlockApp = () => {
    if (isHardPaywall || shouldBypassPaywall) {
      goToMain();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      goToMain();
    }
  };

  const handleDevBypass = async () => {
    setStatusMessage("Dev bypass enabled.");
    await syncLocalProFlag();
    goToMain();
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
        await syncLocalProFlag();
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
        await syncLocalProFlag();
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
        await syncLocalProFlag();
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

  const isHardPaywall = newFunnelOn && triggerSource === "onboarding_funnel";

  const monthlyPkg = packages.find((p) => p.packageType === "MONTHLY");
  const annualPkg = packages.find((p) => p.packageType === "ANNUAL");

  const handleToggleTrial = (next: boolean) => {
    setFreeTrialEnabled(next);
    if (next && annualPkg) {
      setSelectedPackage(annualPkg);
    } else if (!next && monthlyPkg) {
      setSelectedPackage(monthlyPkg);
    }
  };

  const headline = isScannerLimit
    ? "Keep scanning with Pro"
    : "Build your doctor-ready trigger report.";

  const primaryCtaText = hasFreeTrial(selectedPackage)
    ? "Start your 3-day trial"
    : isScannerLimit
    ? "Unlock Pro Scans"
    : "Unlock Pro";

  const footerPriceText = (() => {
    if (!selectedPackage) return null;
    const price = selectedPackage.product?.priceString;
    if (!price) return null;
    if (selectedPackage.packageType === "ANNUAL") return `Just ${price} per year`;
    if (selectedPackage.packageType === "MONTHLY") return `Just ${price} per month`;
    return `Just ${price}`;
  })();

  const renderPlanCard = (pkg: PurchasesPackage | undefined, label: string) => {
    if (!pkg) return <View style={{ flex: 1 }} />;
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const isAnnual = pkg.packageType === "ANNUAL";
    const isPopular = isAnnual && bestValueId === pkg.identifier;
    const disabled = isPurchasing || isRestoring || isLoading;
    const monthlyEquiv =
      isAnnual && pkg.product?.price
        ? `$${(pkg.product.price / 12).toFixed(2)} /mo`
        : pkg.product?.priceString
          ? `${pkg.product.priceString} /mo`
          : "";
    return (
      <Pressable
        onPress={() => setSelectedPackage(pkg)}
        disabled={disabled}
        style={{
          flex: 1,
          borderRadius: 16,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? "#154212" : "#e5e2d9",
          backgroundColor: "#ffffff",
          padding: 16,
          position: "relative",
          overflow: "visible",
        }}
      >
        {isPopular ? (
          <View
            style={{
              position: "absolute",
              top: -12,
              alignSelf: "center",
              left: 0,
              right: 0,
              alignItems: "center",
            }}
            pointerEvents="none"
          >
            <View
              style={{
                backgroundColor: "#9e4132",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "700" }}>
                Popular
              </Text>
            </View>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#1b1c1c", fontSize: 16, fontWeight: "700" }}>
              {label}
            </Text>
            <Text style={{ color: "#72796e", fontSize: 14, marginTop: 4 }}>
              {monthlyEquiv}
            </Text>
          </View>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: isSelected ? 0 : 1.5,
              borderColor: "#c2c9bb",
              backgroundColor: isSelected ? "#154212" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSelected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderFallback = () => (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e5e2d9",
        backgroundColor: "#ffffff",
        padding: 16,
      }}
    >
      <Text style={{ color: "#1b1c1c", fontSize: 16, fontWeight: "600" }}>
        Plans unavailable
      </Text>
      <Text style={{ color: "#72796e", fontSize: 13, marginTop: 4 }}>
        We couldn't load subscription options right now. Please try again in a moment.
      </Text>
      <Pressable
        onPress={handleRestore}
        style={{
          marginTop: 12,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "#e5e2d9",
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#1b1c1c", fontWeight: "600", fontSize: 14 }}>
          Restore purchases
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: "#fcf9f8" }}
    >
      {/* Top bar — back (left), Restore (right). Back navigates one step
          back through the funnel via goBack(); the pre-paywall flow uses
          navigation.push so history is preserved and back gets a proper pop
          animation. Falls back to PrePaywallTimeline (hard paywall) or Main
          (dismiss-style entry) when the stack is unexpectedly empty (deep
          link, edge cases). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 8,
          minHeight: 44,
        }}
      >
        <View style={{ width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" }}>
          {/* Back is always visible on the hard-paywall (lets the user step
              back to PrePaywallTimeline). On dismiss-style entries it
              respects the CLOSE_BUTTON_DELAY_MS dwell so users see the
              offer before they can leave. */}
          {isHardPaywall || canClose ? (
            <Pressable
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else if (isHardPaywall) {
                  navigation.replace("PrePaywallTimeline");
                } else {
                  navigation.replace("Main");
                }
              }}
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={26} color="#1b1c1c" />
            </Pressable>
          ) : null}
        </View>

        <View />

        <View style={{ width: 64, alignItems: "flex-end", justifyContent: "center" }}>
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
            accessibilityLabel="Restore purchases"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={{ color: "#72796e", fontSize: 14, fontWeight: "600" }}>
              {isRestoring ? "Restoring…" : "Restore"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#1b1c1c",
                fontSize: 28,
                fontWeight: "800",
                lineHeight: 34,
              }}
            >
              {headline}
            </Text>
            {isScannerLimit ? (
              <Text
                style={{
                  color: "#72796e",
                  fontSize: 15,
                  marginTop: 8,
                }}
              >
                You've used your 3 free scans.
              </Text>
            ) : null}
          </View>
          <BrandMark variant="dark" size={76} />
        </View>

        {/* Benefits */}
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          {BENEFITS.map((item) => (
            <View
              key={item.title}
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: item.iconBg,
                  borderWidth: 1,
                  borderColor: item.iconBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <item.Icon size={22} color={item.iconColor} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#1b1c1c", fontSize: 17, fontWeight: "700" }}>
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: "#72796e",
                    fontSize: 14,
                    marginTop: 4,
                    lineHeight: 20,
                  }}
                >
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Free trial toggle */}
        {!isLoading && packages.length ? (
          <View
            style={{
              marginHorizontal: 24,
              marginTop: 20,
              backgroundColor: "#f0eded",
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#1b1c1c", fontSize: 16, fontWeight: "700" }}>
              Enable free trial
            </Text>
            <Switch
              value={freeTrialEnabled}
              onValueChange={handleToggleTrial}
              trackColor={{ false: "#c2c9bb", true: "#154212" }}
              thumbColor="#ffffff"
              ios_backgroundColor="#c2c9bb"
            />
          </View>
        ) : null}

        {/* Plan selection — side by side */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 16,
          }}
        >
          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 8 }}>
              <ActivityIndicator size="small" color="#154212" />
              <Text style={{ color: "#72796e", fontSize: 14 }}>Loading plans…</Text>
            </View>
          ) : packages.length ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              {renderPlanCard(monthlyPkg, "Monthly")}
              {renderPlanCard(annualPkg, "Yearly")}
            </View>
          ) : (
            renderFallback()
          )}
        </View>

        {statusMessage ? (
          <Text
            style={{
              color: "#72796e",
              fontSize: 12,
              textAlign: "center",
              paddingHorizontal: 24,
              paddingTop: 12,
            }}
          >
            {statusMessage}
          </Text>
        ) : null}
      </View>

      {/* Sticky CTA at bottom */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fcf9f8" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Check size={16} color="#1b1c1c" strokeWidth={3} />
            <Text style={{ color: "#1b1c1c", fontSize: 14, fontWeight: "600" }}>
              Cancel anytime in Settings.
            </Text>
          </View>

          <Pressable
            onPress={handlePurchase}
            disabled={!selectedPackage || isPurchasing || isRestoring || isLoading}
            style={{
              alignSelf: "stretch",
              backgroundColor: "#154212",
              borderRadius: 999,
              minHeight: 56,
              paddingVertical: 18,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity:
                !selectedPackage || isPurchasing || isRestoring || isLoading ? 0.6 : 1,
            }}
          >
            {isPurchasing ? <ActivityIndicator size="small" color="#ffffff" /> : null}
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "700" }}>
              {selectedPackage ? primaryCtaText : "Plans unavailable"}
            </Text>
          </Pressable>

          {footerPriceText ? (
            <Text
              style={{
                color: "#72796e",
                fontSize: 12,
                textAlign: "center",
                marginTop: 10,
              }}
            >
              {footerPriceText}
            </Text>
          ) : null}

          {canUseDevBypass ? (
            <Pressable
              onPress={handleDevBypass}
              style={{
                alignSelf: "center",
                marginTop: 8,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#e5e2d9",
                backgroundColor: "#ffffff",
              }}
            >
              <Text style={{ color: "#72796e", fontSize: 11, fontWeight: "700" }}>
                Dev bypass
              </Text>
            </Pressable>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 18,
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/terms")}
            >
              <Text style={{ color: "#72796e", fontSize: 11 }}>Terms</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/privacy")}
            >
              <Text style={{ color: "#72796e", fontSize: 11 }}>Privacy</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
