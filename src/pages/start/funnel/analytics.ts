import type { FunnelStep } from "./types";

/**
 * Track a funnel step with PostHog.
 * Captures "funnel_step_viewed" event with step_name, step_index, variant, and platform.
 * No-op if PostHog is unavailable; never throws.
 */
export function trackStep(step: FunnelStep, index: number): void {
  try {
    if (typeof window === "undefined" || !window.posthog) return;
    window.posthog.capture("funnel_step_viewed", {
      step_name: step.id,
      step_index: index,
      variant: "web_v1",
      platform: "web",
    });
  } catch {
    // no-op on error
  }
}

/**
 * Track a custom event with PostHog.
 * Adds variant: "web_v1" and platform: "web" to all events (per CLAUDE.md:
 * variant rides every funnel step AND trial_started -- this is what stamps
 * it on trial_started, web_account_created, web_funnel_completed, etc.).
 * A caller-supplied `variant` in `props` wins over the "web_v1" default.
 * No-op if PostHog is unavailable; never throws.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !window.posthog) return;
    window.posthog.capture(name, {
      variant: "web_v1",
      ...props,
      platform: "web",
    });
  } catch {
    // no-op on error
  }
}

/**
 * Track a Facebook Pixel event.
 * Calls window.fbq("track", event, props) only if fbq is available.
 * No-op if Pixel is unavailable; never throws.
 */
export function pixel(event: string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !window.fbq) return;
    window.fbq("track", event, props || {});
  } catch {
    // no-op on error
  }
}

/**
 * Track a Google Analytics event.
 * Calls window.gtag("event", name, params) only if gtag is available.
 * No-op if gtag is unavailable; never throws.
 */
export function gtagEvent(name: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", name, params);
  } catch {
    // no-op on error
  }
}

/**
 * Identify the current PostHog person by their Firebase uid.
 * This stitches web-funnel persons to the same person the mobile app
 * identifies with (mobile identifies by Firebase UID -- see
 * trigger-tracker-mobile), so the web-to-app handoff is measurable at the
 * person level. Calls window.posthog.identify(uid) only if PostHog is
 * available. No-op if PostHog is unavailable; never throws.
 */
export function identifyUser(uid: string): void {
  try {
    if (typeof window === "undefined" || !window.posthog) return;
    window.posthog.identify(uid);
  } catch {
    // no-op on error
  }
}
