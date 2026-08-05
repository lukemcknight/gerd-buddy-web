import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";
import { trackEvent } from "../funnel/analytics";

const APP_STORE_URL = "https://apps.apple.com/us/app/gerdbuddy-acid-reflux-relief/id6756620910";

export default function SuccessStep() {
  const { step, displayName, answers, stats } = useFunnel();

  const title = renderTitle(step.title, { name: displayName, ...stats });

  const email =
    typeof answers.email === "string" && answers.email.trim()
      ? answers.email.trim()
      : null;

  // Fire the completion event exactly once on mount
  useEffect(() => {
    trackEvent("web_funnel_completed");
  }, []);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="space-y-3 text-center">
          <p className="text-base text-muted-foreground">
            Sign in with{" "}
            <strong>
              {email || "the email you just used"}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Your subscription is active. The app unlocks the moment you sign in.
          </p>
        </div>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-white font-semibold transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Download on App Store
        </a>

        <div className="hidden md:flex flex-col items-center gap-3">
          <div className="rounded-lg border-2 border-border bg-white p-4">
            <QRCodeSVG
              value={APP_STORE_URL}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-sm text-muted-foreground">Scan with your phone</p>
        </div>
      </div>
    </div>
  );
}
