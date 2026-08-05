import { Purchases } from "@revenuecat/purchases-js";
import type { CustomerInfo, Package } from "@revenuecat/purchases-js";

// RevenueCat Web Billing config (see .superpowers/sdd/2026-08-03-web-funnel
// task-9-brief.md and ops progress ledger for provisioning details).
const OFFERING_ID = "gerd-buddy-web";
const ENTITLEMENT_ID = "GERD Buddy Pro";

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Configures the RevenueCat Web Billing SDK for the given Firebase uid and
 * returns the configured singleton `Purchases` instance. Safe to call more
 * than once (e.g. on remount): reuses the shared instance instead of
 * reconfiguring, and switches the app user id via `changeUser` if it drifted.
 */
export function configureRC(uid: string): Purchases {
  const apiKey = import.meta.env.VITE_RC_WEB_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_RC_WEB_API_KEY. Set it in .env.local (sandbox key) or the Vercel env."
    );
  }

  if (Purchases.isConfigured()) {
    const instance = Purchases.getSharedInstance();
    if (instance.getAppUserId() !== uid) {
      // Fire and forget: PaywallStep re-reads customer info after configureRC
      // returns, so a late-resolving changeUser does not block rendering.
      void instance.changeUser(uid);
    }
    return instance;
  }

  return Purchases.configure({ apiKey, appUserId: uid });
}

/**
 * Returns the package to purchase: the "gerd-buddy-web" offering's annual
 * package, falling back to that offering's first available package, then to
 * the current offering's annual (or first) package. Returns null if no
 * package can be found at all.
 */
export async function getAnnualPackage(p: Purchases): Promise<Package | null> {
  const offerings = await p.getOfferings();

  const target = offerings.all[OFFERING_ID];
  const fromTarget = target?.annual ?? target?.availablePackages?.[0] ?? null;
  if (fromTarget) return fromTarget;

  const current = offerings.current;
  return current?.annual ?? current?.availablePackages?.[0] ?? null;
}

/**
 * Launches the RC Web Billing purchase flow (card entry included) for the
 * given package and resolves to the resulting customerInfo.
 */
export async function purchaseAnnual(p: Purchases, pkg: Package): Promise<CustomerInfo> {
  const result = await p.purchase({ rcPackage: pkg });
  return result.customerInfo;
}

/**
 * True if `customerInfo` has the GERD Buddy Pro entitlement active. Matches
 * the entitlement id case/whitespace-insensitively, mirroring the
 * normalization approach in trigger-tracker-mobile/services/revenuecat.js.
 */
export function hasPro(customerInfo: CustomerInfo | null | undefined): boolean {
  const active = customerInfo?.entitlements?.active ?? {};
  return Object.keys(active).some((key) => normalize(key) === normalize(ENTITLEMENT_ID));
}

/**
 * Attaches UTM params to the RC customer via `setAttributes` so revenue can
 * be split by source in the RevenueCat dashboard. The installed SDK
 * (@revenuecat/purchases-js 1.51.0) has no reserved UTM attribute keys, so
 * these are set as plain custom attributes using the same key names as the
 * `utm` funnel answer (utm_source/utm_medium/utm_campaign/utm_content).
 * Returns false (never throws) when there is nothing to set or the SDK call
 * fails; PaywallStep also carries the UTMs on the `trial_started` PostHog
 * event so attribution isn't solely dependent on this call succeeding.
 */
export async function setUtmAttributes(
  p: Purchases,
  utm: Record<string, string>
): Promise<boolean> {
  const entries = Object.entries(utm).filter(([, value]) => Boolean(value && value.trim()));
  if (entries.length === 0) return false;

  try {
    await p.setAttributes(Object.fromEntries(entries));
    return true;
  } catch {
    return false;
  }
}
