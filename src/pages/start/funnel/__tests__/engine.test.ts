import { describe, it, expect, beforeEach } from "vitest";
import { nextIndex, prevIndex, progressPct, lossStats } from "../engine";
import { save, load } from "../persistence";
import type { FunnelStep } from "../types";

const steps = [
  { id: "a", phase: "p", type: "select", title: "A" },
  { id: "b", phase: "p", type: "slider", title: "B", min: 0, max: 7 },
  { id: "c", phase: "p", type: "success", title: "C" },
] as FunnelStep[];

describe("engine", () => {
  it("advances and clamps at the end", () => {
    expect(nextIndex(steps, 0)).toBe(1);
    expect(nextIndex(steps, 2)).toBe(2);
  });
  it("goes back and clamps at 0", () => {
    expect(prevIndex(1)).toBe(0);
    expect(prevIndex(0)).toBe(0);
  });
  it("computes progress", () => {
    expect(progressPct(0, 3)).toBe(0);
    expect(progressPct(2, 3)).toBe(100);
  });
  it("computes loss stats from weekly nights and monthly spend", () => {
    expect(lossStats({ nights: 3, spend: 25 })).toEqual({ nightsPerYear: 156, dollarsPerYear: 300 });
  });
  it("defaults missing inputs to zero", () => {
    expect(lossStats({})).toEqual({ nightsPerYear: 0, dollarsPerYear: 0 });
  });
});

describe("persistence", () => {
  beforeEach(() => localStorage.clear());
  it("round-trips state", () => {
    save({ stepIndex: 4, answers: { age: "45-59" } });
    expect(load()).toEqual({ stepIndex: 4, answers: { age: "45-59" } });
  });
  it("returns null on empty or corrupt storage", () => {
    expect(load()).toBeNull();
    localStorage.setItem("gb_funnel_v1", "{not json");
    expect(load()).toBeNull();
  });
});
