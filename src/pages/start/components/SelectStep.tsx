import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function SelectStep() {
  const { step, answer, answers, displayName, stats } = useFunnel();
  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;
  const selected = answers[step.id];

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {step.options?.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => answer(step.id, opt.value)}
              className={`w-full rounded-full border-2 px-6 py-4 text-left text-base font-medium transition-colors ${
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
    </div>
  );
}
