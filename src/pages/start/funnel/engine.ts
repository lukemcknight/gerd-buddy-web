import type { Answers, FunnelStep } from "./types";

export const nextIndex = (steps: FunnelStep[], i: number) => Math.min(i + 1, steps.length - 1);
export const prevIndex = (i: number) => Math.max(i - 1, 0);
export const progressPct = (i: number, len: number) => (len <= 1 ? 0 : Math.round((i / (len - 1)) * 100));

export const lossStats = (a: Answers) => {
  const nights = typeof a.nights === "number" ? a.nights : 0;
  const spend = typeof a.spend === "number" ? a.spend : 0;
  return { nightsPerYear: nights * 52, dollarsPerYear: spend * 12 };
};
