import { useFunnel } from "../funnel/FunnelContext";
import { progressPct } from "../funnel/engine";

export default function ProgressBar() {
  const { index, total } = useFunnel();
  const pct = progressPct(index, total);

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
