# Hard Paywall Revert Design

## Summary

Revert GERDBuddy from the current freemium model to a hard paywall with a 3-day free trial at $3/month. The paywall becomes a mandatory gate — users cannot access the app without an active subscription or trial. All freemium gating code (scan limits, trigger visibility limits, ProTeaser components) is removed.

## Motivation

Revenue dropped significantly after switching to freemium. The previous hard paywall model generated 20 subscriptions. With app improvements, better marketing, and lessons learned from freemium analytics, a hard paywall is expected to perform better.

## Architecture

### Single enforcement point: RootNavigator

The navigation layer gates access. After onboarding + signup, the user's RevenueCat subscription status is checked. If not active, they see the Paywall screen with no way to dismiss it. On successful purchase/trial start, they proceed to Main.

```
Onboarding -> SignUp -> [Subscription Check] -> Paywall (if inactive) -> Main
                                              -> Main (if active)
```

On app relaunch or foreground resume, the same check runs. If subscription has lapsed, navigation resets to Paywall.

### RootNavigator.js changes

- After signup/login completes, call `getSubscriptionStatus(userId)`.
- If `active === false`, navigate to `"Paywall"` instead of `"Main"`.
- On app relaunch (when `onboardingComplete` is true and user exists), same check before routing to Main.
- Paywall's `onSuccess` callback navigates to `"Main"` with a navigation reset (no back to Paywall).
- Add an `AppState` listener: on foreground resume, re-check subscription status. If lapsed, reset navigation stack to Paywall.

### PaywallScreen.tsx changes

- Remove all dismiss/skip/close/back affordances. The only exit is a successful purchase or restore.
- Remove `trigger_source` conditional logic (no more scanner_limit vs post_insight variants). Always show the same hard paywall.
- Keep existing UI: turtle mascot, benefit list, plan selector cards, restore purchases, terms/privacy links.
- Trial length text is already dynamically parsed from RevenueCat package metadata via `trialCtaText()` — will display "3 days" once configured in App Store Connect.
- Keep `__DEV__` bypass for development only. Remove Expo Go bypass.

### Freemium code removal

| File | Action |
|------|--------|
| `services/scannerGate.ts` | Delete |
| `services/paywallTrigger.ts` | Delete |
| `components/ProTeaser.js` | Delete |
| `screens/FoodScanScreen.js` | Remove all gate checks (`canUserScan`, `incrementFreeScanCount`, remaining scans UI, paywall navigation on block) |
| `screens/InsightsScreen.js` | Remove `freeTriggerLimit`/`freeSafeFoodLimit` constants, always show up to 5 triggers/safe foods, remove ProTeaser imports and usage, remove `isPro` conditional rendering for visibility |
| `screens/ReportScreen.js` | Remove `isPro` conditional — always render full stats grid and share button |
| `services/storage.js` | Remove `TRIAL_LENGTH_MS` constant, remove `trialEndsAt` from `createUser()`, remove `getTrialInfo()` function |
| `hooks/usePremiumStatus.js` | Keep — used by RootNavigator for gate check |

### Subscription lapse handling

- `AppState` change listener in RootNavigator calls `getSubscriptionStatus()` on foreground resume.
- If subscription is no longer active, reset navigation stack to Paywall.
- Covers: trial expiry, cancelled subscription, billing failure.
- User data is preserved in AsyncStorage — they regain access upon resubscribing.

## Pricing & trial configuration

- $3/month — configured in App Store Connect / RevenueCat dashboard (not in app code).
- 3-day free trial — configured in App Store Connect as introductory offer (not in app code).
- The existing RevenueCat integration (`services/revenuecat.js`) handles all billing. No changes needed to this file.

## What stays the same

- Onboarding flow (unchanged)
- Signup/login flow (unchanged)
- RevenueCat service (`services/revenuecat.js`) — no changes
- PaywallScreen visual design — kept as-is
- PostHog analytics events for paywall/purchase — kept
- CustomerCenterScreen — kept for subscription management
- All core app functionality (logging, scanning, insights, reports) — unchanged, just no longer gated by tier

## Out of scope

- Web paywall (web remains marketing-only)
- Pricing changes (handled in RevenueCat/App Store Connect)
- New paywall UI design (keeping current)
