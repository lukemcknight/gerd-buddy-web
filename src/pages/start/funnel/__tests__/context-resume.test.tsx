import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Real persistence is exercised here (unmocked), unlike context.test.tsx --
// the point of this file is to prove FunnelProvider hydrates by asking
// persistence to resolve the saved stepId, not by trusting the raw saved
// stepIndex directly.
vi.mock("../analytics", () => ({
  trackStep: vi.fn(),
  trackEvent: vi.fn(),
  pixel: vi.fn(),
  gtagEvent: vi.fn(),
}));

// A small fixed 3-step funnel so the "reorder" scenario is easy to reason
// about: "b" sits at index 1 in this order.
vi.mock("../steps", () => ({
  FUNNEL_STEPS: [
    { id: "a", phase: "p", type: "interstitial", title: "A" },
    { id: "b", phase: "p", type: "interstitial", title: "B" },
    { id: "c", phase: "p", type: "success", title: "C" },
  ],
  STEP_IDS: ["a", "b", "c"],
}));

import { FunnelProvider, useFunnel } from "../FunnelContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <FunnelProvider>{children}</FunnelProvider>
);

describe("FunnelProvider: id-based resume is reorder-resilient", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("resumes at the step matching the saved stepId, even when the saved stepIndex now points at a different step", async () => {
    // Simulates a payload saved before FUNNEL_STEPS reordered: "b" was
    // saved as stepId, but its raw stepIndex (0) is stale -- under the
    // *current* order (mocked above) index 0 belongs to "a", not "b". A
    // resume that trusted the raw index would land on "a"; the fix must
    // resolve by id and land on "b" (index 1).
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 2, stepId: "b", stepIndex: 0, answers: { x: 1 } })
    );

    const { result } = renderHook(() => useFunnel(), { wrapper });

    await waitFor(() => {
      expect(result.current.step.id).toBe("b");
    });
    expect(result.current.index).toBe(1);
    expect(result.current.answers).toEqual({ x: 1 });
  });

  it("still resumes correctly when the saved stepIndex agrees with the current order (no regression on the common case)", async () => {
    localStorage.setItem(
      "gb_funnel_v1",
      JSON.stringify({ v: 2, stepId: "c", stepIndex: 2, answers: {} })
    );

    const { result } = renderHook(() => useFunnel(), { wrapper });

    await waitFor(() => {
      expect(result.current.step.id).toBe("c");
    });
    expect(result.current.index).toBe(2);
  });
});
