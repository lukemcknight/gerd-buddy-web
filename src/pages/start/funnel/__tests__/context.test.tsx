import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { vi, it, expect, beforeEach, afterEach } from "vitest";
import { FunnelProvider, useFunnel, renderTitle } from "../FunnelContext";
import { FUNNEL_STEPS } from "../steps";
import { lossStats } from "../engine";
import * as persistence from "../persistence";
import * as analytics from "../analytics";

// Mock persistence and analytics
vi.mock("../persistence", () => ({
  save: vi.fn(),
  load: vi.fn(() => null),
}));
vi.mock("../analytics", () => ({
  trackStep: vi.fn(),
  trackEvent: vi.fn(),
  pixel: vi.fn(),
  gtagEvent: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <FunnelProvider>{children}</FunnelProvider>
);

it("initializes with landing step", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });
  expect(result.current.step.id).toBe("landing");
  expect(result.current.index).toBe(0);
  expect(result.current.total).toBe(FUNNEL_STEPS.length);
});

it("answer() on select step advances and persists", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });

  act(() => {
    result.current.next();
  });
  expect(result.current.step.id).toBe("age");

  act(() => {
    result.current.answer("age", "45-59");
  });

  expect(result.current.answers.age).toBe("45-59");
  expect(result.current.index).toBeGreaterThan(1);
});

it("renderTitle() substitutes placeholders", () => {
  const answers = { name: "Alex", nights: 3, spend: 50 };
  const stats = lossStats(answers);

  const ctx = {
    displayName: "Alex",
    stats,
  };

  const titleStep = FUNNEL_STEPS.find((s) => s.title.includes("{name}"));
  const statStep = FUNNEL_STEPS.find((s) => s.title.includes("{nightsPerYear}"));

  if (titleStep) {
    const rendered = renderTitle(titleStep, ctx);
    expect(rendered).toContain("Alex");
  }

  if (statStep) {
    const rendered = renderTitle(statStep, ctx);
    expect(rendered).toContain("156");
    expect(rendered).toContain("600");
  }
});

it("displayName falls back to 'friend' when name is empty", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });
  expect(result.current.displayName).toBe("friend");

  act(() => {
    result.current.answer("name", "Jordan");
  });
  expect(result.current.displayName).toBe("Jordan");
});

it("hydrates from saved state on mount", () => {
  vi.mocked(persistence.load).mockReturnValueOnce({
    stepIndex: 2,
    answers: { age: "30-44" },
  });

  const { result } = renderHook(() => useFunnel(), { wrapper });
  expect(result.current.index).toBe(2);
  expect(result.current.answers.age).toBe("30-44");
});
