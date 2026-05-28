export const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;

const isTestRuntime =
  process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);
const isDevRuntime = typeof __DEV__ !== "undefined" && __DEV__;
const flagDisablesBypass = bypassFlag === "false";

// Local-only paywall bypass for Expo Go/dev-client iteration. Set
// EXPO_PUBLIC_BYPASS_PAYWALL=false to force the real RevenueCat flow locally.
export const shouldBypassPaywall =
  !isTestRuntime && isDevRuntime && !flagDisablesBypass;

export const devEntitlementState = shouldBypassPaywall ? "pro" : null;
