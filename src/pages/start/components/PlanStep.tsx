import { useFunnel, renderTitle } from "../funnel/FunnelContext";

const ROADMAP: { day: number; label: string }[] = [
  { day: 1, label: "Log your first meal" },
  { day: 2, label: "Scan a menu or label" },
  { day: 3, label: "First pattern appears" },
  { day: 5, label: "Your riskiest window mapped" },
  { day: 7, label: "Your personal trigger report" },
];

function formatDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function PlanStep() {
  const { step, next, displayName, stats } = useFunnel();
  const title = renderTitle(step.title, { name: displayName, ...stats });
  const reliefDate = formatDatePlusDays(21);

  return (
    <div className="flex flex-1 flex-col gap-6 py-10">
      <h1 className="text-center font-display text-3xl font-bold leading-tight text-foreground">
        {title}
      </h1>
      <ol className="flex flex-col gap-3">
        {ROADMAP.map((item) => (
          <li
            key={item.day}
            className="flex items-center gap-4 rounded-2xl border border-border bg-white px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {item.day}
            </span>
            <span className="text-sm font-medium text-foreground">
              {item.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-center text-sm font-medium text-primary">
        By {reliefDate}: eating with a plan, not a prayer.
      </p>
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
