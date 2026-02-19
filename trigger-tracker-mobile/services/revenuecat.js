import Purchases, { PurchasesErrorCode } from "react-native-purchases";

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

// RevenueCat defaults: use a single entitlement and default offering.
// Entitlement must stay consistent across the app to unlock access.
const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID || "default";

let configurePromise = null;
let currentUserId = null;

const ensureConfigured = async (userId) => {
  if (!API_KEY) {
    throw new Error(
      "Missing RevenueCat API key. Set EXPO_PUBLIC_REVENUECAT_API_KEY."
    );
  }

  // Use a promise-based singleton to prevent race conditions when multiple
  // components call RevenueCat functions simultaneously.
  if (!configurePromise) {
    configurePromise = (async () => {
      await Purchases.configure({ apiKey: API_KEY, appUserID: userId || null });
      currentUserId = userId || null;
    })();
  }

  await configurePromise;

  if (userId && userId !== currentUserId) {
    await Purchases.logIn(userId);
    currentUserId = userId;
  }
};

const isUserCancelled = (error) =>
  error?.userCancelled ||
  error?.code === PurchasesErrorCode.PurchaseCancelledError ||
  error?.code === PurchasesErrorCode.PurchaseCancelled;

const parseStatus = (customerInfo) => {
  const activeEntitlements = Object.keys(customerInfo?.entitlements?.active || {});

  // Normalize and match the entitlement key case/whitespace-insensitively to avoid config drift.
  const normalize = (value) => (value || "").toString().trim().toLowerCase();
  const matchedKey =
    activeEntitlements.find((key) => normalize(key) === normalize(ENTITLEMENT_ID)) || null;
  const entitlement = matchedKey
    ? customerInfo?.entitlements?.active?.[matchedKey]
    : customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];

  return {
    active: Boolean(entitlement),
    isTrial: entitlement?.periodType === "TRIAL",
    expiresAt: entitlement?.expirationDate
      ? new Date(entitlement.expirationDate).getTime()
      : null,
    customerInfo,
    managementURL: customerInfo?.managementURL ?? null,
    activeEntitlements,
    matchedEntitlementKey: matchedKey,
  };
};

export const configureRevenueCat = async (userId) => {
  await ensureConfigured(userId);
};

export const getSubscriptionStatus = async (userId) => {
  await ensureConfigured(userId);
  const customerInfo = await Purchases.getCustomerInfo();
  return parseStatus(customerInfo);
};

export const getOfferings = async (userId) => {
  await ensureConfigured(userId);
  const offerings = await Purchases.getOfferings();
  return offerings;
};

export const purchasePackage = async (selectedPackage, userId) => {
  await ensureConfigured(userId);
  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  return parseStatus(customerInfo);
};

export const restoreTransactions = async (userId) => {
  await ensureConfigured(userId);
  const customerInfo = await Purchases.restorePurchases();
  return parseStatus(customerInfo);
};

export const helpers = {
  isUserCancelled,
  ENTITLEMENT_ID,
  OFFERING_ID,
};
