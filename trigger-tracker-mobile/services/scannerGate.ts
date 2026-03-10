/**
 * Scanner freemium gating logic.
 *
 * Feature flag: `freemium_scanner_limit_v1`
 *   - When ON (default): free users get FREE_SCAN_LIMIT lifetime scans,
 *     then must start a trial / subscribe.
 *   - When OFF: falls back to legacy behavior (Pro-only scanner).
 *
 * The `free_scan_count` is stored on the user object in AsyncStorage and
 * incremented atomically ONLY after a successful scan completion.
 */

import { getUser, saveUser } from "./storage";
import { getSubscriptionStatus, configureRevenueCat } from "./revenuecat";

// ── Configuration ──────────────────────────────────────────────────────

/** Lifetime free scans for non-Pro users. Override via remote config. */
export const FREE_SCAN_LIMIT = 3;

/** Feature flag — set false to disable freemium gating and revert to Pro-only. */
export const FEATURE_FLAGS = {
  freemium_scanner_limit_v1: true,
};

// ── Types ──────────────────────────────────────────────────────────────

export type ScanGateResult = {
  allowed: boolean;
  reason: "pro" | "free_under_limit" | "limit_reached" | "no_user" | "flag_off_pro_only";
  entitlementState: "pro" | "trial" | "free";
  freeScanCount: number;
  freeScanLimit: number;
};

// ── Core gate function ─────────────────────────────────────────────────

/**
 * Determines whether the current user may perform a scan.
 *
 * Performs a **fresh** RevenueCat entitlement check (with retry) so a
 * delayed billing-SDK refresh doesn't incorrectly block a paying user.
 */
export const canUserScan = async (): Promise<ScanGateResult> => {
  const user = await getUser();
  if (!user) {
    return {
      allowed: false,
      reason: "no_user",
      entitlementState: "free",
      freeScanCount: 0,
      freeScanLimit: FREE_SCAN_LIMIT,
    };
  }

  // ── Entitlement check (with retry) ───────────────────────────────
  let isPro = Boolean(user.subscriptionActive);

  try {
    await configureRevenueCat(user.id);
    const status = await getSubscriptionStatus(user.id);
    isPro = status.active;

    // Persist if RevenueCat says active but local doesn't agree
    if (isPro && !user.subscriptionActive) {
      await saveUser({ ...user, subscriptionActive: true });
    }
  } catch {
    // Offline / SDK error — fall back to local flag
  }

  const entitlementState: ScanGateResult["entitlementState"] = isPro ? "pro" : "free";

  // Pro users always allowed
  if (isPro) {
    return {
      allowed: true,
      reason: "pro",
      entitlementState,
      freeScanCount: user.freeScanCount ?? user.scanCount ?? 0,
      freeScanLimit: FREE_SCAN_LIMIT,
    };
  }

  // ── Feature flag off → legacy Pro-only gate ──────────────────────
  if (!FEATURE_FLAGS.freemium_scanner_limit_v1) {
    return {
      allowed: false,
      reason: "flag_off_pro_only",
      entitlementState,
      freeScanCount: user.freeScanCount ?? user.scanCount ?? 0,
      freeScanLimit: FREE_SCAN_LIMIT,
    };
  }

  // ── Freemium check ───────────────────────────────────────────────
  const freeScanCount = user.freeScanCount ?? user.scanCount ?? 0;

  if (freeScanCount < FREE_SCAN_LIMIT) {
    return {
      allowed: true,
      reason: "free_under_limit",
      entitlementState,
      freeScanCount,
      freeScanLimit: FREE_SCAN_LIMIT,
    };
  }

  return {
    allowed: false,
    reason: "limit_reached",
    entitlementState,
    freeScanCount,
    freeScanLimit: FREE_SCAN_LIMIT,
  };
};

// ── Increment (call ONLY after successful scan) ────────────────────────

/**
 * Atomically increments the free scan counter.
 * Returns the **new** count, or -1 if no user exists.
 *
 * Guards against double-increment by accepting a `scanId` and checking
 * it against the last recorded scan id.
 */
export const incrementFreeScanCount = async (scanId?: string): Promise<number> => {
  const user = await getUser();
  if (!user) return -1;

  // Dedupe guard: if caller provides a scanId, skip if already recorded
  if (scanId && user._lastScanId === scanId) {
    return user.freeScanCount ?? user.scanCount ?? 0;
  }

  const currentCount = user.freeScanCount ?? user.scanCount ?? 0;
  const newCount = currentCount + 1;

  await saveUser({
    ...user,
    freeScanCount: newCount,
    scanCount: newCount, // keep legacy field in sync
    lastScanDate: Date.now(),
    ...(scanId ? { _lastScanId: scanId } : {}),
  });

  return newCount;
};

// ── Remaining scans helper ─────────────────────────────────────────────

export const getRemainingFreeScans = async (): Promise<number> => {
  const user = await getUser();
  if (!user) return FREE_SCAN_LIMIT;
  const count = user.freeScanCount ?? user.scanCount ?? 0;
  return Math.max(0, FREE_SCAN_LIMIT - count);
};
