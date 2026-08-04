import { useState } from "react";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function SliderStep() {
  const { step, answer, next, answers, displayName, stats } = useFunnel();
  const min = step.min ?? 0;
  const max = step.max ?? 10;
  const initial =
    typeof answers[step.id] === "number" ? (answers[step.id] as number) : min;
  const [value, setValue] = useState(initial);

  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;

  const format = (n: number) =>
    step.unit === "$" ? `$${n}` : `${n} ${step.unit ?? ""}`.trim();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setValue(val);
    answer(step.id, val);
  };

  const handleContinue = () => {
    answer(step.id, value);
    next();
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl font-bold text-primary">{format(value)}</div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          aria-label={step.title}
          className="w-full accent-primary"
        />
        <div className="flex w-full justify-between text-xs text-muted-foreground">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleContinue}
        className="sticky bottom-6 mt-auto w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
      >
        {step.cta ?? "Continue"}
      </button>
    </div>
  );
}
