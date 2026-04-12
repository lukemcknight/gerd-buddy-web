import { useCallback, useEffect, useState } from "react";
import { getSubscriptionStatus } from "../services/revenuecat";
import { getUser } from "../services/storage";

// Reusable hook to surface entitlement state and allow consumers to refresh on demand.
export const usePremiumStatus = (userId) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = useCallback(
    async (nextUserId) => {
      setIsLoading(true);
      try {
        const status = await getSubscriptionStatus(nextUserId ?? userId);
        if (status.active) {
          setIsPro(true);
        } else {
          // Fall back to local flag (supports demo/screenshot mode)
          const user = await getUser();
          setIsPro(Boolean(user?.subscriptionActive));
        }
      } catch (error) {
        console.warn("Premium status refresh failed", error);
        // Fall back to local flag on error too
        try {
          const user = await getUser();
          setIsPro(Boolean(user?.subscriptionActive));
        } catch {
          // ignore
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return { isPro, isLoading, refreshStatus };
};

export default usePremiumStatus;
