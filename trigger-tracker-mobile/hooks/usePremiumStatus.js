import { useCallback, useEffect, useState } from "react";
import { getSubscriptionStatus } from "../services/revenuecat";

// Reusable hook to surface entitlement state and allow consumers to refresh on demand.
export const usePremiumStatus = (userId) => {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = useCallback(
    async (nextUserId) => {
      setIsLoading(true);
      try {
        const status = await getSubscriptionStatus(nextUserId ?? userId);
        setIsPro(Boolean(status.active));
      } catch (error) {
        console.warn("Premium status refresh failed", error);
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
