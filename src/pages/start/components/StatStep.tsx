import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function StatStep() {
  const { step, next, displayName, stats } = useFunnel();
  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
      <h1 className="font-display text-2xl font-bold leading-snug text-foreground">
        {title}
      </h1>
      <div className="flex w-full justify-center gap-10">
        <div>
          <div className="text-5xl font-bold text-primary">
            {stats.nightsPerYear}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            rough nights/year
          </div>
        </div>
        <div>
          <div className="text-5xl font-bold text-primary">
            ${stats.dollarsPerYear}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            spent/year
          </div>
        </div>
      </div>
      {subtitle && (
        <p className="text-base text-muted-foreground">{subtitle}</p>
      )}
      <button
        type="button"
        onClick={next}
        className="sticky bottom-6 mt-auto w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
      >
        {step.cta ?? "Continue"}
      </button>
    </div>
  );
}
