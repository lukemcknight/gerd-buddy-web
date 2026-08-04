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
 * Adds platform: "web" to all events.
 * No-op if PostHog is unavailable; never throws.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined" || !window.posthog) return;
    window.posthog.capture(name, {
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
