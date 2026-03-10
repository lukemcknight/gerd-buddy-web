import { getUser, getMeals, getSymptoms, getScanCount7d, getDaysSinceStart } from "./storage";
import { getOnboardingPlan, getCurrentPlanDay } from "./onboardingPlan";

// ── Feature flags (defaults; override via remote config if available) ──

export const PAYWALL_CONFIG = {
  // Number of scans before showing paywall
  scanThreshold: 3,
  // Onboarding day to trigger paywall (after day 3 completion)
  onboardingDayThreshold: 3,
  // Minimum insights count to trigger "first insight" paywall
  insightThreshold: 1,
  // Cooldown between paywall shows (ms) - 24 hours
  cooldownMs: 24 * 60 * 60 * 1000,
};

export type PaywallTriggerSource =
  | "post_scan"
  | "post_insight"
  | "onboarding_day3"
  | "manual"
  | "cold_start";

export type PaywallCheck = {
  show: boolean;
  source: PaywallTriggerSource;
  reason?: string;
};

// ── Paywall trigger logic ──────────────────────────────────────────────

export const shouldShowPaywall = async (
  source: PaywallTriggerSource
): Promise<PaywallCheck> => {
  try {
    const user = await getUser();
    if (!user) return { show: false, source, reason: "no_user" };

    // Already subscribed — never show
    if (user.subscriptionActive) {
      return { show: false, source, reason: "already_subscribed" };
    }

    // Cooldown check
    if (user.lastPaywallShownAt) {
      const elapsed = Date.now() - user.lastPaywallShownAt;
      if (elapsed < PAYWALL_CONFIG.cooldownMs) {
        return { show: false, source, reason: "cooldown" };
      }
    }

    // Never show on cold start (outcomes-based approach)
    if (source === "cold_start") {
      return { show: false, source, reason: "no_cold_start" };
    }

    // Post-scan trigger
    if (source === "post_scan") {
      const scanCount = user.scanCount || 0;
      if (scanCount >= PAYWALL_CONFIG.scanThreshold) {
        return { show: true, source, reason: "scan_threshold_reached" };
      }
      return { show: false, source, reason: "below_scan_threshold" };
    }

    // Post-insight trigger
    if (source === "post_insight") {
      return { show: true, source, reason: "first_meaningful_insight" };
    }

    // Onboarding day 3 trigger
    if (source === "onboarding_day3") {
      const plan = await getOnboardingPlan();
      if (plan) {
        const currentDay = getCurrentPlanDay(plan);
        if (currentDay >= PAYWALL_CONFIG.onboardingDayThreshold) {
          return { show: true, source, reason: "onboarding_day3_complete" };
        }
      }
      return { show: false, source, reason: "onboarding_not_ready" };
    }

    // Manual trigger always shows
    if (source === "manual") {
      return { show: true, source, reason: "manual" };
    }

    return { show: false, source, reason: "no_match" };
  } catch {
    return { show: false, source, reason: "error" };
  }
};

// ── Record paywall shown ───────────────────────────────────────────────

export const recordPaywallShown = async (): Promise<void> => {
  try {
    const { getUser: getUserFn, saveUser: saveUserFn } = await import("./storage");
    const user = await getUserFn();
    if (user) {
      await saveUserFn({ ...user, lastPaywallShownAt: Date.now() });
    }
  } catch {
    // Non-critical
  }
};

// ── Entitlement structure ──────────────────────────────────────────────

export const ENTITLEMENTS = {
  free: {
    logging: true,
    scansPerDay: 2,
    insights: "limited",
    weeklyReport: false,
    export: false,
  },
  pro: {
    logging: true,
    scansPerDay: Infinity,
    insights: "full",
    weeklyReport: true,
    export: true,
  },
} as const;

export const getEntitlementState = async (): Promise<"free" | "pro" | "trial"> => {
  const user = await getUser();
  if (!user) return "free";
  if (user.subscriptionActive) return "pro";
  // Check trial
  const now = Date.now();
  if (user.trialEndsAt && now < user.trialEndsAt) return "trial";
  return "free";
};
