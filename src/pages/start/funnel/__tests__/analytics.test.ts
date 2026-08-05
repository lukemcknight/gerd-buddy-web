import { vi, it, expect, afterEach } from "vitest";
import { trackStep, trackEvent, pixel, gtagEvent, identifyUser } from "../analytics";
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

it("trackEvent stamps variant web_v1 and platform web on every event", () => {
  (window as any).posthog = { capture: vi.fn() };
  trackEvent("trial_started", { source: "web_funnel" });
  expect((window as any).posthog.capture).toHaveBeenCalledWith(
    "trial_started",
    expect.objectContaining({
      source: "web_funnel",
      variant: "web_v1",
      platform: "web",
    })
  );
});

it("trackEvent lets a caller-supplied variant win over the web_v1 default", () => {
  (window as any).posthog = { capture: vi.fn() };
  trackEvent("trial_started", { variant: "web_v2_experiment" });
  expect((window as any).posthog.capture).toHaveBeenCalledWith(
    "trial_started",
    expect.objectContaining({ variant: "web_v2_experiment", platform: "web" })
  );
});

it("identifyUser calls posthog.identify with the given uid", () => {
  (window as any).posthog = { capture: vi.fn(), identify: vi.fn() };
  identifyUser("uid-123");
  expect((window as any).posthog.identify).toHaveBeenCalledWith("uid-123");
});

it("never throws without globals", () => {
  expect(() => {
    trackStep(FUNNEL_STEPS[0], 0);
    trackEvent("x");
    pixel("Lead");
    gtagEvent("test");
    identifyUser("uid-123");
  }).not.toThrow();
});
