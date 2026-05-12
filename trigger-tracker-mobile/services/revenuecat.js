import Purchases, { PurchasesErrorCode } from "react-native-purchases";
import { auth } from "./firebase";

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

// RevenueCat defaults: use a single entitlement and default offering.
// Entitlement must stay consistent across the app to unlock access.
const ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
const OFFERING_ID = process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID || "default";

// Offering presented when a Pro subscriber accepts the cancellation-flow
// retention offer. Override at build time with
// EXPO_PUBLIC_REVENUECAT_RETENTION_OFFERING_ID if the dashboard id changes.
const RETENTION_OFFERING_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_RETENTION_OFFERING_ID?.trim() ||
  "yearly_subscription_retention";

// The actual App Store product the user is swapped into. The offering may
// also include other packages (e.g., a monthly), so we match this product
// by id rather than blindly picking the first package.
const RETENTION_PRODUCT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_RETENTION_PRODUCT_ID?.trim() ||
  "yearly_subscription_retention";

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
  const email = auth?.currentUser?.email;
  if (email) {
    await Purchases.setEmail(email);
  }
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

// Fetches the retention offering and runs a purchase against the package that
// wraps RETENTION_PRODUCT_ID. The offering may also include other packages
// (e.g., a monthly placeholder) so we match by product id, not position.
// Throws with code "RETENTION_OFFERING_NOT_FOUND" if the offering can't be
// resolved or doesn't contain the retention product — the caller is expected
// to fall back gracefully.
export const purchaseRetentionOffer = async (userId) => {
  await ensureConfigured(userId);
  const offerings = await Purchases.getOfferings();
  const offering = offerings?.all?.[RETENTION_OFFERING_ID];
  const packages = offering?.availablePackages || [];
  const pkg = packages.find(
    (p) => p?.product?.identifier === RETENTION_PRODUCT_ID
  );
  if (!pkg) {
    const err = new Error("retention_offering_not_found");
    err.code = "RETENTION_OFFERING_NOT_FOUND";
    throw err;
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
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
  RETENTION_OFFERING_ID,
  RETENTION_PRODUCT_ID,
};
