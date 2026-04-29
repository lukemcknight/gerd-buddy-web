import { useCallback, useEffect, useState } from "react";
import { getSubscriptionStatus } from "../services/revenuecat";
import { getUser, saveUser } from "../services/storage";

// RevenueCat is the authoritative source of truth in production. The local
// `subscriptionActive` flag is treated as a cache that we sync from RC, and
// only used as a fallback when RC is unreachable (offline) or in __DEV__
// builds (screenshot/demo mode).
export const resolvePremiumStatus = async (userId) => {
  try {
    const status = await getSubscriptionStatus(userId);
    if (status.active) {
      // Sync local flag UP if it disagrees, so offline reads stay correct.
      const user = await getUser();
      if (user && !user.subscriptionActive) {
        await saveUser({ ...user, subscriptionActive: true });
      }
      return true;
    }

    // RC says inactive. In production, trust it and clear stale local flag.
    if (!__DEV__) {
      const user = await getUser();
      if (user?.subscriptionActive) {
        await saveUser({ ...user, subscriptionActive: false });
      }
      return false;
    }

    // __DEV__: honor a manually set local flag (screenshot/demo mode).
    const user = await getUser();
    return Boolean(user?.subscriptionActive);
  } catch (error) {
    console.warn("Premium status refresh failed", error);
    // Offline fallback: trust the most recent local flag.
    try {
      const user = await getUser();
      return Boolean(user?.subscriptionActive);
    } catch {
      return false;
    }
  }
};

// Reusable hook to surface entitlement state and allow consumers to refresh on demand.
export const usePremiumStatus = (userId) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = useCallback(
    async (nextUserId) => {
      setIsLoading(true);
      const next = await resolvePremiumStatus(nextUserId ?? userId);
      setIsPro(next);
      setIsLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return { isPro, isLoading, refreshStatus };
};

export default usePremiumStatus;
