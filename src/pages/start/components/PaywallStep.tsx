import { useEffect, useRef, useState } from "react";
import type { Package, Purchases } from "@revenuecat/purchases-js";
import { ErrorCode } from "@revenuecat/purchases-js";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";
import { useAuth } from "../../../contexts/AuthContext";
import { trackEvent, pixel, gtagEvent } from "../funnel/analytics";
import { configureRC, getAnnualPackage, purchaseAnnual, hasPro, setUtmAttributes } from "../funnel/rc";

const CHARGE_MESSAGE = "No charge was made. Try again when ready.";

function getUtm(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return {};
}

export default function PaywallStep() {
  const { step, next, displayName, stats, answers } = useFunnel();
  const { user } = useAuth();

  const purchasesRef = useRef<Purchases | null>(null);
  const utm = getUtm(answers.utm);

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [skipped, setSkipped] = useState(false);

  const nextRef = useRef(next);
  nextRef.current = next;

  const title = renderTitle(step.title, { name: displayName, ...stats });
  // "Verbatim" per the brief: no renderTitle substitution on the subtext.
  const subtitle = step.subtitle;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function init() {
      const purchases = configureRC(user.uid);
      purchasesRef.current = purchases;

      try {
        const info = await purchases.getCustomerInfo();
        if (hasPro(info)) {
          if (!cancelled) {
            setSkipped(true);
            nextRef.current();
          }
          return;
        }
      } catch {
        // Non-fatal: fall through to the normal purchase flow.
      }

      void setUtmAttributes(purchases, utm);

      setLoadingPkg(true);
      try {
        const annualPkg = await getAnnualPackage(purchases);
        if (!cancelled) setPkg(annualPkg);
      } catch {
        if (!cancelled) {
          setMessage({ text: CHARGE_MESSAGE, isError: true });
        }
      } finally {
        if (!cancelled) setLoadingPkg(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handlePurchase = async () => {
    const purchases = purchasesRef.current;
    if (!purchases || !pkg || purchasing || loadingPkg) return;

    setMessage(null);
    setPurchasing(true);

    try {
      await purchaseAnnual(purchases, pkg);
      trackEvent("trial_started", { source: "web_funnel", ...utm });
      pixel("StartTrial");
      gtagEvent("conversion_trial_start");
      next();
    } catch (err: unknown) {
      const cancelledByUser =
        (err as { errorCode?: number } | undefined)?.errorCode === ErrorCode.UserCancelledError;
      setMessage({ text: CHARGE_MESSAGE, isError: !cancelledByUser });
      setPurchasing(false);
    }
  };

  if (skipped) return null;

  const initializing = !user || loadingPkg;
  const ctaLabel = initializing ? "Loading..." : purchasing ? "Please wait..." : "try for $0.00";
  const ctaDisabled = initializing || purchasing || !pkg;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <h1 className="font-display text-3xl font-bold leading-tight text-foreground">{title}</h1>
      <p className="text-sm font-semibold text-primary">✓ No Payment Due Now</p>

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

      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
