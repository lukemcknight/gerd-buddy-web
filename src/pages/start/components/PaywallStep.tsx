import { useEffect, useRef, useState } from "react";
import type { Package, Purchases } from "@revenuecat/purchases-js";
import { ErrorCode } from "@revenuecat/purchases-js";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";
import { useAuth } from "../../../contexts/AuthContext";
import { trackEvent, pixel, gtagEvent } from "../funnel/analytics";
import { configureRC, getAnnualPackage, purchaseAnnual, hasPro, setUtmAttributes } from "../funnel/rc";

const CHARGE_MESSAGE = "No charge was made. Try again when ready.";
const PKG_ERROR_MESSAGE = "We could not load the plan. Check your connection and retry.";
const INIT_ERROR_MESSAGE = "We could not start checkout. Please check your connection and try again.";
const ENTITLEMENT_ERROR_MESSAGE = "We could not confirm your subscription status. Please try again.";

type Status =
  | "loading"
  | "ready"
  | "init_error"
  | "entitlement_check_failed"
  | "pkg_error"
  | "skipped";

function getUtm(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return {};
}

/**
 * Checks entitlement, retrying once on a getCustomerInfo failure. Fails
 * "closed" (entitled: false, failed: true) after a second consecutive
 * failure so a flaky network never shows the purchase CTA to a possibly
 * already-entitled user.
 */
async function checkEntitlementWithRetry(
  purchases: Purchases
): Promise<{ entitled: boolean; failed: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const info = await purchases.getCustomerInfo();
      return { entitled: hasPro(info), failed: false };
    } catch {
      if (attempt === 1) return { entitled: false, failed: true };
    }
  }
  return { entitled: false, failed: true };
}

export default function PaywallStep() {
  const { step, next, back, displayName, stats, answers } = useFunnel();
  const { user, loading: authLoading } = useAuth();

  const purchasesRef = useRef<Purchases | null>(null);
  const purchasingRef = useRef(false);
  const utm = getUtm(answers.utm);

  const [pkg, setPkg] = useState<Package | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const nextRef = useRef(next);
  nextRef.current = next;
  const backRef = useRef(back);
  backRef.current = back;

  const title = renderTitle(step.title, { name: displayName, ...stats });
  // "Verbatim" per the brief: no renderTitle substitution on the subtext.
  const subtitle = step.subtitle;

  // Signed-out (post auth-resolution) users have nothing to check out with:
  // send them back to the account step instead of showing an eternal
  // "Loading..." CTA. `authLoading` distinguishes "auth still resolving"
  // (wait) from "resolved to signed-out" (redirect).
  useEffect(() => {
    if (!authLoading && !user) {
      backRef.current();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function init() {
      setStatus("loading");
      setMessage(null);

      let purchases: Purchases;
      try {
        purchases = await configureRC(user.uid);
      } catch (err) {
        if (!cancelled) {
          trackEvent("web_paywall_init_failed", {
            message: err instanceof Error ? err.message : String(err),
          });
          setStatus("init_error");
        }
        return;
      }
      purchasesRef.current = purchases;

      const entitlement = await checkEntitlementWithRetry(purchases);
      if (cancelled) return;

      if (entitlement.entitled) {
        setStatus("skipped");
        nextRef.current();
        return;
      }

      if (entitlement.failed) {
        setStatus("entitlement_check_failed");
        return;
      }

      void setUtmAttributes(purchases, utm);

      try {
        const annualPkg = await getAnnualPackage(purchases);
        if (cancelled) return;
        setPkg(annualPkg);
        setStatus(annualPkg ? "ready" : "pkg_error");
      } catch {
        if (!cancelled) setStatus("pkg_error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, retryToken]);

  const retry = () => {
    setMessage(null);
    setStatus("loading");
    setRetryToken((t) => t + 1);
  };

  const handlePurchase = async () => {
    if (purchasingRef.current) return;
    const purchases = purchasesRef.current;
    if (!purchases || !pkg || status !== "ready") return;

    purchasingRef.current = true;
    setMessage(null);
    setPurchasing(true);

    try {
      await purchaseAnnual(purchases, pkg);
      trackEvent("trial_started", { source: "web_funnel", ...utm });
      pixel("StartTrial");
      gtagEvent("conversion_trial_start");
      next();
      return;
    } catch (err: unknown) {
      // The RC checkout can reject (user cancel, or a post-charge
      // getCustomerInfo network failure inside the SDK's own success
      // handler) even after Stripe has genuinely charged the card. Re-check
      // entitlement before ever telling the user "no charge was made".
      let entitled = false;
      try {
        const info = await purchases.getCustomerInfo();
        entitled = hasPro(info);
      } catch {
        entitled = false;
      }

      if (entitled) {
        trackEvent("trial_started", { source: "web_funnel", ...utm });
        pixel("StartTrial");
        gtagEvent("conversion_trial_start");
        next();
        return;
      }

      const cancelledByUser =
        (err as { errorCode?: number } | undefined)?.errorCode === ErrorCode.UserCancelledError;
      setMessage({ text: CHARGE_MESSAGE, isError: !cancelledByUser });
      purchasingRef.current = false;
      setPurchasing(false);
    }
  };

  if (status === "skipped") return null;

  const ctaDisabled = status !== "ready" || purchasing;
  const ctaLabel = status !== "ready" ? "Loading..." : purchasing ? "Please wait..." : "try for $0.00";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <h1 className="font-display text-3xl font-bold leading-tight text-foreground">{title}</h1>
      <p className="text-sm font-semibold text-primary">✓ No Payment Due Now</p>

      {status === "init_error" && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {INIT_ERROR_MESSAGE}
          </p>
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
          >
            Retry
          </button>
        </>
      )}

      {status === "entitlement_check_failed" && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {ENTITLEMENT_ERROR_MESSAGE}
          </p>
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
          >
            Retry
          </button>
        </>
      )}

      {status === "pkg_error" && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {PKG_ERROR_MESSAGE}
          </p>
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
          >
            Retry
          </button>
        </>
      )}

      {(status === "loading" || status === "ready") && (
        <>
          {message && (
            <p
              role={message.isError ? "alert" : undefined}
              className={
                message.isError
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {message.text}
            </p>
          )}

          <button
            type="button"
            onClick={handlePurchase}
            disabled={ctaDisabled}
            className="sticky bottom-6 mt-auto w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {ctaLabel}
          </button>
        </>
      )}

      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
