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

it("renderTitle() substitutes all three tokens in one call", () => {
  const testString = "Hello {name}, you have {nightsPerYear} nights and spend ${dollarsPerYear}/year";
  const rendered = renderTitle(testString, {
    name: "Alex",
    nightsPerYear: 156,
    dollarsPerYear: 600,
  });
  expect(rendered).toBe("Hello Alex, you have 156 nights and spend $600/year");
});

it("renderTitle() handles missing name", () => {
  const testString = "Hello {name}";
  const rendered = renderTitle(testString, {
    nightsPerYear: 0,
    dollarsPerYear: 0,
  });
  expect(rendered).toBe("Hello ");
});

it("displayName falls back to 'friend' when name is empty", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });
  expect(result.current.displayName).toBe("friend");

  act(() => {
    result.current.answer("name", "Jordan");
  });
  expect(result.current.displayName).toBe("Jordan");
});

it("displayName returns trimmed value when name has leading/trailing whitespace", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });

  act(() => {
    result.current.answer("name", "  Jordan  ");
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

it("trackStep called exactly once for initial step", () => {
  vi.mocked(analytics.trackStep).mockClear();
  renderHook(() => useFunnel(), { wrapper });
  expect(vi.mocked(analytics.trackStep)).toHaveBeenCalledTimes(1);
  expect(vi.mocked(analytics.trackStep)).toHaveBeenCalledWith(
    FUNNEL_STEPS[0],
    0
  );
});

it("slider-type answer records but does not advance", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });

  // Navigate to nights step (index 8, slider type)
  for (let i = 0; i < 8; i++) {
    act(() => {
      result.current.next();
    });
  }
  const nightsStepIndex = result.current.index;

  // Record answer on slider
  act(() => {
    result.current.answer("nights", 3);
  });

  expect(result.current.answers.nights).toBe(3);
  expect(result.current.index).toBe(nightsStepIndex);
});

it("back() clamps at 0 and next() clamps at last index", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });

  // Test back() clamp at start
  expect(result.current.index).toBe(0);
  act(() => {
    result.current.back();
  });
  expect(result.current.index).toBe(0);

  // Test next() clamp at end
  while (result.current.index < FUNNEL_STEPS.length - 1) {
    act(() => {
      result.current.next();
    });
  }
  const lastIndex = result.current.index;
  act(() => {
    result.current.next();
  });
  expect(result.current.index).toBe(lastIndex);
});

it("useFunnel() outside FunnelProvider throws", () => {
  expect(() => renderHook(() => useFunnel())).toThrow(
    "useFunnel must be used within FunnelProvider"
  );
});

it("save() called with expected shape when advancing", () => {
  const { result } = renderHook(() => useFunnel(), { wrapper });

  // Clear the mock after hydration
  vi.mocked(persistence.save).mockClear();

  // Navigate to age step and answer (select step auto-advances)
  act(() => {
    result.current.next(); // Go from landing to age
  });

  vi.mocked(persistence.save).mockClear();

  act(() => {
    result.current.answer("age", "30-44"); // Answers on age step (select type, auto-advances)
  });

  expect(vi.mocked(persistence.save)).toHaveBeenCalled();
  const lastCall = vi.mocked(persistence.save).mock.calls[
    vi.mocked(persistence.save).mock.calls.length - 1
  ][0];
  expect(lastCall).toEqual(
    expect.objectContaining({
      stepIndex: expect.any(Number),
      answers: expect.objectContaining({ age: "30-44" }),
    })
  );
});
