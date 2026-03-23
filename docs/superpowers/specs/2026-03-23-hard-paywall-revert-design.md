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
- Paywall's `onSuccess` callback navigates to `"Main"` using `CommonActions.reset` to replace the entire stack (no back to Paywall).
- Add an `AppState` listener: on foreground resume, re-check subscription status. If lapsed, reset navigation stack to Paywall. Use cached RevenueCat `CustomerInfo` as fallback when offline to avoid locking out paid users.

### Post-auth routing ownership

SignUpScreen and LoginScreen already check subscription status and route to Paywall if inactive. This existing behavior is kept — these screens own the post-auth routing decision. RootNavigator owns the cold-start and foreground-resume checks. No double-gating: SignUp/Login handle their own exit routing, RootNavigator handles app launch and resume.

### PaywallScreen.tsx changes

- Remove all dismiss/skip/close/back affordances. The only exit is a successful purchase or restore.
- Change navigation `presentation` from `"modal"` to `"card"` (or add `gestureEnabled: false`) to prevent iOS swipe-to-dismiss.
- Rewrite `unlockApp` to always use `CommonActions.reset` to replace the stack with Main (remove `navigation.goBack()` fallback).
- Remove `trigger_source` conditional logic (no more scanner_limit vs post_insight variants). Always show the same hard paywall.
- Remove imports from deleted files: `recordPaywallShown` and `getEntitlementState` from `paywallTrigger.ts`. Remove `getTrialInfo` import from `storage.js` — replace with `getUser()` to get user ID for RevenueCat configuration.
- Keep existing UI: turtle mascot, benefit list, plan selector cards, restore purchases, terms/privacy links.
- Trial length text is already dynamically parsed from RevenueCat package metadata via `trialCtaText()` — will display "3 days" once configured in App Store Connect.
- Keep `__DEV__` bypass for development only. Remove Expo Go bypass.

### Freemium code removal

| File | Action |
|------|--------|
| `services/scannerGate.ts` | Delete |
| `services/paywallTrigger.ts` | Delete |
| `components/ProTeaser.js` | Delete |
| `components/__tests__/ProTeaser.test.js` | Delete |
| `screens/FoodScanScreen.js` | Remove all gate checks (`canUserScan`, `incrementFreeScanCount`, remaining scans UI, paywall navigation on block). Remove `shouldBypassPaywall` logic (moot since gate is removed). |
| `screens/InsightsScreen.js` | Remove `freeTriggerLimit`/`freeSafeFoodLimit` constants, `visibleTriggers`/`visibleSafeFoods` branching, and `hiddenTriggerCount`/`hiddenSafeFoodCount` variables. Replace with single `.slice(0, 5)` for all users. Remove ProTeaser imports and usage. Remove `isPro` conditional rendering. Change `TriggerBadge` `showDetails={isPro}` to `showDetails={true}` (or remove the prop). |
| `screens/ReportScreen.js` | Remove `isPro` conditional — always render full stats grid and share button |
| `screens/SettingsScreen.js` | Remove `getEntitlementState` import from `paywallTrigger.ts`. Remove `isPro` state and "Upgrade to Pro" banner. Always show "Manage Subscription" link. |
| `services/storage.js` | Remove `TRIAL_LENGTH_MS` constant, `trialEndsAt` from `createUser()`, `getTrialInfo()`, `ensureTrialFields()`, `acknowledgePaywall()`, and `activateSubscription()` — all part of the old local-trial system now replaced by RevenueCat as sole source of truth. |
| `hooks/usePremiumStatus.js` | Keep — used by RootNavigator for gate check |

### Subscription lapse handling

- `AppState` change listener in RootNavigator calls `getSubscriptionStatus()` on foreground resume.
- If subscription is no longer active, reset navigation stack to Paywall.
- **Offline behavior:** Use cached RevenueCat `CustomerInfo` when network is unavailable. Fail open (allow access) to avoid locking out paid users who are offline.
- Covers: trial expiry, cancelled subscription, billing failure.
- User data is preserved in AsyncStorage — they regain access upon resubscribing.

### Existing freemium users

Existing free users who update the app will hit the hard paywall immediately. Their data is preserved — they can subscribe to regain access. This is intentional.

## Pricing & trial configuration

- $3/month — configured in App Store Connect / RevenueCat dashboard (not in app code).
- 3-day free trial — configured in App Store Connect as introductory offer (not in app code).
- The existing RevenueCat integration (`services/revenuecat.js`) handles all billing. No changes needed to this file.

## What stays the same

- Onboarding flow (unchanged)
- Signup/login flow (existing post-auth paywall routing preserved)
- RevenueCat service (`services/revenuecat.js`) — no changes
- PaywallScreen visual design — kept as-is
- PostHog analytics events for paywall/purchase — kept
- CustomerCenterScreen — kept for subscription management
- All core app functionality (logging, scanning, insights, reports) — unchanged, just no longer gated by tier

## Out of scope

- Web paywall (web remains marketing-only)
- Pricing changes (handled in RevenueCat/App Store Connect)
- New paywall UI design (keeping current)
