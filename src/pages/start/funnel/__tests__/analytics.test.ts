import { vi, it, expect, afterEach } from "vitest";
import { trackStep, trackEvent, pixel } from "../analytics";
import { FUNNEL_STEPS } from "../steps";

afterEach(() => {
  delete (window as any).posthog;
  delete (window as any).fbq;
  delete (window as any).gtag;
});

it("captures funnel_step_viewed with platform web", () => {
  (window as any).posthog = { capture: vi.fn() };
  trackStep(FUNNEL_STEPS[1], 1);
  expect((window as any).posthog.capture).toHaveBeenCalledWith(
    "funnel_step_viewed",
    expect.objectContaining({
      step_name: "age",
      step_index: 1,
      platform: "web",
      variant: "web_v1",
    })
  );
});

it("never throws without globals", () => {
  expect(() => {
    trackStep(FUNNEL_STEPS[0], 0);
    trackEvent("x");
    pixel("Lead");
  }).not.toThrow();
});
