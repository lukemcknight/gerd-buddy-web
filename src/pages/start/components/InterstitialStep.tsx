import { useEffect, useRef } from "react";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function InterstitialStep() {
  const { step, next, displayName, stats } = useFunnel();
  const nextRef = useRef(next);
  nextRef.current = next;

  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;

  useEffect(() => {
    if (!step.autoAdvanceMs) return;
    const timer = setTimeout(() => nextRef.current(), step.autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [step.id, step.autoAdvanceMs]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      {step.autoAdvanceMs ? (
        <div
          aria-hidden="true"
          className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
        />
      ) : null}
      <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="whitespace-pre-line text-base text-muted-foreground">
          {subtitle}
        </p>
      )}
      {step.cta && !step.autoAdvanceMs && (
        <button
          type="button"
          onClick={next}
          className="sticky bottom-6 mt-6 w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
        >
          {step.cta}
        </button>
      )}
    </div>
  );
}
