import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { save, load } from "../persistence";
import { STEP_IDS } from "../steps";

describe("persistence", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips state, writing the current version and the id of the saved step", () => {
    save({ stepIndex: 4, answers: { age: "45-59" } });
    expect(load()).toEqual({ stepIndex: 4, answers: { age: "45-59" } });

    const raw = JSON.parse(localStorage.getItem("gb_funnel_v1") || "{}");
    expect(raw.v).toBe(2);
    expect(raw.stepId).toBe(STEP_IDS[4]);
    expect(raw.stepIndex).toBe(4);
  });

  it("returns null on empty or corrupt storage", () => {
    expect(load()).toBeNull();
    localStorage.setItem("gb_funnel_v1", "{not json");
    expect(load()).toBeNull();
  });

  it("migrates a legacy v1 payload (no stepId) by trusting its numeric stepIndex", () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 1, stepIndex: 2, answers: { age: "45-59" } })
    );
    expect(load()).toEqual({ stepIndex: 2, answers: { age: "45-59" } });
  });

  it("clamps an out-of-range legacy v1 stepIndex instead of resolving off the end of the array", () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 1, stepIndex: 9999, answers: {} })
    );
    expect(load()).toEqual({ stepIndex: STEP_IDS.length - 1, answers: {} });
  });

  it("falls back to a clamped stepIndex when a v2 payload's stepId no longer matches any current step", () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 2, stepId: "a-step-that-was-removed", stepIndex: 3, answers: {} })
    );
    expect(load()).toEqual({ stepIndex: 3, answers: {} });
  });

  it("returns null when neither stepId nor stepIndex resolve to anything usable", () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 2, stepId: "a-step-that-was-removed", answers: {} })
    );
    expect(load()).toBeNull();
  });

  it("returns null for an unversioned or unknown-version payload", () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ stepIndex: 2, answers: {} })
    );
    expect(load()).toBeNull();
  });
});

describe("persistence: reorder resilience", () => {
  afterEach(() => {
    localStorage.clear();
    vi.doUnmock("../steps");
    vi.resetModules();
  });

  it("save()s a step id under one FUNNEL_STEPS order and load() resolves it to that step's NEW index after a reorder, not the stale saved index", async () => {
    // The test file's top-level (unmocked) `save`/`load`/`STEP_IDS` imports
    // above already populated the module cache with the real "../steps" --
    // reset it first so the dynamic import below actually picks up the mock
    // factory instead of the cached real module.
    vi.resetModules();

    // Steps order #1: "b" lives at index 1. Save under this order using the
    // real save() (not hand-crafted JSON), matching what FunnelContext does
    // today.
    vi.doMock("../steps", () => ({
      FUNNEL_STEPS: [{ id: "a" }, { id: "b" }, { id: "c" }],
      STEP_IDS: ["a", "b", "c"],
    }));
    const persistenceBeforeReorder = await import("../persistence");
    persistenceBeforeReorder.save({ stepIndex: 1, answers: { x: 1 } });

    const raw = JSON.parse(localStorage.getItem("gb_funnel_v1") || "{}");
    expect(raw.stepId).toBe("b");
    expect(raw.stepIndex).toBe(1);

    // A later release reorders FUNNEL_STEPS: "b" now lives at index 2, and
    // the stale raw index (1) would now point at "a".
    vi.resetModules();
    vi.doMock("../steps", () => ({
      FUNNEL_STEPS: [{ id: "c" }, { id: "a" }, { id: "b" }],
      STEP_IDS: ["c", "a", "b"],
    }));
    const persistenceAfterReorder = await import("../persistence");

    expect(persistenceAfterReorder.load()).toEqual({ stepIndex: 2, answers: { x: 1 } });
  });
});
