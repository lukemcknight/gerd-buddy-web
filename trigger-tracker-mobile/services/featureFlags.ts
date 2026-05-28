export const isNewPaywallFunnelEnabled = (): boolean =>
  process.env.EXPO_PUBLIC_NEW_PAYWALL_FUNNEL === "true";

// Cutover timestamp: users with createdAt strictly before this keep freemium
// access (limited triggers/safe-foods/scans, dismissible upgrade prompts).
// Users created at or after must subscribe before reaching the main app —
// no freemium fallback. Update to the App Store release moment (with some
// padding backward) of the build that ships the hard-paywall flow.
export const PAYWALL_GRANDFATHER_CUTOFF_MS = Date.UTC(2026, 4, 21);

type GrandfatherableUser = { createdAt?: unknown } | null | undefined;

// Safe default: when `createdAt` is missing or unparseable, grandfather the
// user rather than paywall them. A user object exists at all (passed through
// `onboardingComplete`), so they predate or completed onboarding under code
// that may not have stamped a numeric `createdAt`. Falsely grandfathering a
// brand-new install is one lost conversion; falsely paywalling a long-time
// freemium user is a support ticket and a 1-star review.
export const isGrandfatheredUser = (user: GrandfatherableUser): boolean => {
  if (!user) return false;
  const createdAt = (user as { createdAt?: unknown }).createdAt;
  if (typeof createdAt !== "number") return true;
  return createdAt < PAYWALL_GRANDFATHER_CUTOFF_MS;
};
