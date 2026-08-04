import { useState } from "react";
import { useFunnel, renderTitle } from "../funnel/FunnelContext";

export default function TextStep() {
  const { step, answer, next, answers, displayName, stats } = useFunnel();
  const initial =
    typeof answers[step.id] === "string" ? (answers[step.id] as string) : "";
  const [value, setValue] = useState(initial);

  const title = renderTitle(step.title, { name: displayName, ...stats });
  const subtitle = step.subtitle
    ? renderTitle(step.subtitle, { name: displayName, ...stats })
    : undefined;

  const handleContinue = () => {
    answer(step.id, value.trim());
    next();
  };

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
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Your first name"
        className="w-full rounded-full border-2 border-border bg-white px-6 py-4 text-center text-lg text-foreground outline-none focus:border-primary"
      />
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
