import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function MultiSelectStep() {
  const { step, answer, next, answers, displayName, stats } = useFunnel();
  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;
  const selected = Array.isArray(answers[step.id])
    ? (answers[step.id] as string[])
    : [];

  const toggle = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    answer(step.id, updated);
  };

  const canContinue = selected.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-8 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {step.options?.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(opt.value)}
              className={`rounded-full border-2 px-5 py-3 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-white text-foreground hover:border-primary/50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!canContinue}
        onClick={next}
        className="sticky bottom-6 mt-auto w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {step.cta ?? "Continue"}
      </button>
    </div>
  );
}
