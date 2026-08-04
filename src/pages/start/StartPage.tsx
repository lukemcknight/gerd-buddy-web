import { ChevronLeft } from "lucide-react";
import { FunnelProvider, useFunnel, renderTitle } from "./funnel/FunnelContext";
import ProgressBar from "./components/ProgressBar";
import InterstitialStep from "./components/InterstitialStep";
import SelectStep from "./components/SelectStep";
import MultiSelectStep from "./components/MultiSelectStep";
import SliderStep from "./components/SliderStep";
import TextStep from "./components/TextStep";
import StatStep from "./components/StatStep";
import PlanStep from "./components/PlanStep";

/**
 * Minimal placeholder for step types owned by later tasks (account, paywall,
 * success). Tasks 8-10 replace these switch arms with real components.
 */
function FallbackStep() {
  const { step, displayName, stats } = useFunnel();
  const title = renderTitle(step.title, { name: displayName, ...stats });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">
        This step continues in the app.
      </p>
    </div>
  );
}

function StepRenderer() {
  const { step } = useFunnel();

  switch (step.type) {
    case "interstitial":
      return <InterstitialStep />;
    case "select":
      return <SelectStep />;
    case "multi":
      return <MultiSelectStep />;
    case "slider":
      return <SliderStep />;
    case "text":
      return <TextStep />;
    case "stat":
      return <StatStep />;
    case "plan":
      return <PlanStep />;
    case "account":
    case "paywall":
    case "success":
    default:
      return <FallbackStep />;
  }
}

function BackButton() {
  const { index, back } = useFunnel();
  if (index === 0) return null;

  return (
    <button
      type="button"
      onClick={back}
      aria-label="Back"
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}

function FunnelShell() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pt-4">
          <BackButton />
          <ProgressBar />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8">
        <StepRenderer />
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <FunnelProvider>
      <FunnelShell />
    </FunnelProvider>
  );
}
