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
import AccountStep from "./components/AccountStep";

/**
 * Minimal placeholder for step types owned by later tasks (paywall, success).
 * Tasks 9-10 replace these switch arms with real components.
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

  // key={step.id} forces a fresh mount per step so stateful step types
  // (slider, text) never carry a previous step's local state forward.
  switch (step.type) {
    case "interstitial":
      return <InterstitialStep key={step.id} />;
    case "select":
      return <SelectStep key={step.id} />;
    case "multi":
      return <MultiSelectStep key={step.id} />;
    case "slider":
      return <SliderStep key={step.id} />;
    case "text":
      return <TextStep key={step.id} />;
    case "stat":
      return <StatStep key={step.id} />;
    case "plan":
      return <PlanStep key={step.id} />;
    case "account":
      return <AccountStep key={step.id} />;
    case "paywall":
    case "success":
    default:
      return <FallbackStep key={step.id} />;
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
