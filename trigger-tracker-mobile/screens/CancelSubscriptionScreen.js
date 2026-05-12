import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import CancellationReasonStep from "../components/cancel/CancellationReasonStep";
import RetentionOfferStep from "../components/cancel/RetentionOfferStep";
import CancellationConfirmStep from "../components/cancel/CancellationConfirmStep";
import { getUser } from "../services/storage";
import { getSubscriptionStatus } from "../services/revenuecat";
import { EVENTS } from "../services/analytics";
import {
  isOtherReason,
  reasonLabelFor,
} from "../services/cancellationReasons";

const FALLBACK_MANAGE_URL = "https://apps.apple.com/account/subscriptions";
const RETENTION_OFFER_PRICE_LABEL = "$29.99/year";

export default function CancelSubscriptionScreen({ navigation }) {
  const posthog = usePostHog();
  const [step, setStep] = useState("reason");
  const [reasonId, setReasonId] = useState(null);
  const [otherText, setOtherText] = useState("");
  const [manageUrl, setManageUrl] = useState(FALLBACK_MANAGE_URL);
  const flowExitedRef = useRef(false);
  const offerShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getUser();
        const status = await getSubscriptionStatus(user?.id);
        if (!cancelled && status?.managementURL) {
          setManageUrl(status.managementURL);
        }
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    posthog?.capture(EVENTS.CANCEL_FLOW_STARTED);
  }, [posthog]);

  useEffect(() => {
    if (step === "offer" && !offerShownRef.current) {
      offerShownRef.current = true;
      posthog?.capture(EVENTS.RETENTION_OFFER_SHOWN, {
        reason_id: reasonId,
        offer_price_label: RETENTION_OFFER_PRICE_LABEL,
      });
    }
  }, [step, reasonId, posthog]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.("beforeRemove", () => {
      if (!flowExitedRef.current) {
        posthog?.capture(EVENTS.CANCEL_FLOW_DISMISSED, { last_step: step });
      }
    });
    return unsubscribe;
  }, [navigation, step, posthog]);

  const handleReasonContinue = useCallback(() => {
    if (!reasonId) return;
    posthog?.capture(EVENTS.CANCEL_REASON_SELECTED, {
      reason_id: reasonId,
      reason_label: reasonLabelFor(reasonId),
      other_text: isOtherReason(reasonId) ? otherText.trim() : null,
    });
    setStep("offer");
  }, [reasonId, otherText, posthog]);

  const exitFlow = useCallback(
    (outcome) => {
      flowExitedRef.current = true;
      posthog?.capture(EVENTS.CANCEL_FLOW_COMPLETED, {
        outcome,
        reason_id: reasonId,
      });
      navigation.goBack();
    },
    [navigation, posthog, reasonId]
  );

  const openAppStore = useCallback(async () => {
    try {
      await Linking.openURL(manageUrl);
    } catch {
      try {
        await Linking.openURL(FALLBACK_MANAGE_URL);
      } catch {
        // swallow — best effort.
      }
    }
  }, [manageUrl]);

  const handleOfferAccept = useCallback(async () => {
    posthog?.capture(EVENTS.RETENTION_OFFER_ACCEPTED, { reason_id: reasonId });
    // v1: the "accept offer" CTA also routes the user to App Store subs
    // management so they can adjust there. Future: swap to RevenueCat
    // Win-Back Offer or a discounted-product purchase flow.
    await openAppStore();
    exitFlow("retained");
  }, [reasonId, posthog, openAppStore, exitFlow]);

  const handleOfferDecline = useCallback(() => {
    posthog?.capture(EVENTS.RETENTION_OFFER_DECLINED, { reason_id: reasonId });
    setStep("confirm");
  }, [reasonId, posthog]);

  const handleConfirmOpenAppStore = useCallback(async () => {
    await openAppStore();
    exitFlow("opened_app_store");
  }, [openAppStore, exitFlow]);

  const handleAbort = useCallback(() => {
    exitFlow("aborted");
  }, [exitFlow]);

  const handleBackFromReason = useCallback(() => {
    exitFlow("aborted");
  }, [exitFlow]);

  const handleBackFromOffer = useCallback(() => {
    setStep("reason");
  }, []);

  const handleBackFromConfirm = useCallback(() => {
    setStep("offer");
  }, []);

  return (
    <Screen scrollable={false} contentClassName="pb-8">
      {step === "reason" && (
        <CancellationReasonStep
          selectedId={reasonId}
          otherText={otherText}
          onSelect={setReasonId}
          onOtherTextChange={setOtherText}
          onBack={handleBackFromReason}
          onContinue={handleReasonContinue}
        />
      )}
      {step === "offer" && (
        <RetentionOfferStep
          offerPriceLabel={RETENTION_OFFER_PRICE_LABEL}
          onAccept={handleOfferAccept}
          onDecline={handleOfferDecline}
          onBack={handleBackFromOffer}
        />
      )}
      {step === "confirm" && (
        <CancellationConfirmStep
          onBack={handleBackFromConfirm}
          onOpenAppStore={handleConfirmOpenAppStore}
          onAbort={handleAbort}
        />
      )}
    </Screen>
  );
}
