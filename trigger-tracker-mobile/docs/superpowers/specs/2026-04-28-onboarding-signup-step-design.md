# Onboarding Signup Step — Design

**Date:** 2026-04-28
**Status:** Approved, ready for implementation plan

## Context

GERDBuddy currently runs a 15-step onboarding (`screens/OnboardingScreen.js`) that hands directly off to the Paywall (`navigation.replace("Paywall")` in `handleComplete`). The Firebase-based `SignUpScreen` and `LoginScreen` still exist and work, but they're only reachable as modal overlays from the Paywall — they sit outside the default onboarding path.

This was an intentional product change in commit `9c70361` (Apr 5, 2026: "redesign onboarding with motivational interstitials and hard paywall"). The result: very few users sign up, so we have no email address to message them on. With trial-ending notifications in mind (the immediate motivation), and other future engagement work, this is a problem.

This spec restores email collection by inserting a skippable SignUp step into onboarding. It deliberately does **not** add the email-send backend. That's a separate spec/ship.

## Goals

1. Surface the existing `SignUpScreen` to every onboarding user, after they've invested in the flow but before the value-reveal of the Paywall.
2. Capture a Firebase Auth user + RevenueCat email tag for users who don't skip.
3. Avoid measurably hurting the install→trial conversion rate. (We're already at ~0/14 today; nothing in this change should make it worse.)
4. Add analytics so we can measure skip rate and tune.

## Non-goals

- Trial-ending email send infrastructure (RC webhook → transactional email provider). Separate spec, separate ship.
- Sign in with Apple / Google. Entitlements/cert setup is deferred.
- LoginScreen integration into onboarding. Login stays reachable from the Paywall as today.
- Email-only-no-password collection. Rejected in favor of reusing the existing SignUpScreen as-is.
- Any change to forgot-password / reset flow.
- Refactor of SignUpScreen's existing standalone behavior. Existing entry from the Paywall must still work unchanged.

## Architecture

- **Step count grows from 15 to 16.** Insert the new SignUp step **between current step 13 (Reminders) and step 14 (Loading)**. The new step becomes step 14; Loading shifts to 15.
- **Render the existing `SignUpScreen` inline within `OnboardingScreen`**, passing custom `onSuccess` and `onSkip` callbacks. The standalone `SignUpScreen` route is unchanged for the Paywall-modal entry point.
- **`SignUpScreen` already accepts `onSkip` per recent investigation.** During implementation, verify how `SignUpScreen` consumes navigation/callbacks (props vs route params vs context). Choose the minimal change that lets both call sites coexist.
- **Auto-skip when already authenticated.** On entering the SignUp step, OnboardingScreen reads `useAuth()` (existing context). If `currentUser` is set, advance straight to step 15 without rendering the signup UI. Optionally call `Purchases.setEmail(currentUser.email)` to keep RC in sync.
- **No new screens, no new components.** All changes live in `screens/OnboardingScreen.js`, `screens/SignUpScreen.js`, and `services/analytics.ts`.

## Data flow

### Happy path (signup)
1. Step 13 "Next" → advances to step 14 (SignUp).
2. SignUpScreen renders with email, password, confirm password, Skip, Continue.
3. On submit: existing `createUserWithEmailAndPassword` runs.
4. On success: existing `Purchases.setEmail(email)` runs.
5. `onSuccess` callback advances OnboardingScreen to step 15 (Loading). Existing `handleComplete` runs at end of Loading. Navigates to Paywall as today.

**Note:** Firebase Auth is the source of truth for email. Read via `useAuth()` when needed elsewhere. Do not duplicate email into AsyncStorage / `storage.js` — that creates a sync problem we don't need.

### Skip path
1. User taps "Skip for now" on step 14.
2. `onSkip` callback advances OnboardingScreen to step 15 directly. No Firebase user created. RevenueCat customer remains anonymous (RC user ID only).

### Already-authenticated path
1. On entering step 14, OnboardingScreen reads `useAuth()`.
2. If `currentUser` exists, advance to step 15 immediately without rendering the form.
3. Optionally call `Purchases.setEmail(currentUser.email)` (idempotent, safe to fire-and-forget).

## Edge cases & error handling

- **Email already exists** → inline error from existing SignUpScreen logic: prompt user to skip and log in from the Paywall. No mid-onboarding redirect to LoginScreen.
- **Weak password / invalid email** → existing inline Firebase errors. User retries or skips.
- **Network error during signup** → inline error: "Couldn't sign up — check your connection or skip for now." Skip remains available.
- **`Purchases.setEmail` failure after Firebase succeeded** → catch, log, advance anyway. Don't block on RC.
- **Skip is always available**, including while a signup request is in flight. SignUp is never a hard gate.
- **Back navigation** (Android hardware back, iOS gesture) → returns to step 13 with state preserved, matching existing onboarding step behavior.
- **App backgrounded mid-signup** → acceptable to lose in-flight form state on relaunch; user re-enters onboarding at start. Out-of-scope to persist partial signup state.

## Analytics

Add three events to the `EVENTS` constant in `services/analytics.ts`:

```ts
ONBOARDING_SIGNUP_SHOWN: "onboarding_signup_shown",
ONBOARDING_SIGNUP_COMPLETED: "onboarding_signup_completed",
ONBOARDING_SIGNUP_SKIPPED: "onboarding_signup_skipped",
```

- `ONBOARDING_SIGNUP_SHOWN` fires once when the SignUp step renders (skip the auto-advance authenticated case — that doesn't count as "shown").
- `ONBOARDING_SIGNUP_COMPLETED` fires on successful Firebase user creation.
- `ONBOARDING_SIGNUP_SKIPPED` fires on Skip tap.

Properties: include `step_index: 14` for consistency with other onboarding events.

## Files modified

- `screens/OnboardingScreen.js` — insert the new step, plumb `onSuccess` / `onSkip`, add auto-skip-when-authed branch, fire analytics.
- `screens/SignUpScreen.js` — accept overridable `onSuccess` / `onSkip` from props or route params (whichever pattern fits cleanest with existing usage). Default behavior (Paywall modal entry) unchanged.
- `services/analytics.ts` — add three new events to the `EVENTS` constant.
- `screens/__tests__/OnboardingScreen.test.js` — assert step count is 16, SignUp step at index 14, skip path advances correctly. Existing test was recently updated for "16-step flow" per commit `26c320b` — confirm during implementation whether it already anticipates this exact change.

## Verification

### Unit tests
- Onboarding has 16 steps; SignUp at index 14.
- Skip callback advances to Loading without invoking Firebase.
- Authenticated user auto-advances without rendering form.

### Manual on-device verification
1. Fresh install → walk full onboarding → confirm SignUp step appears between Reminders and Loading.
2. Sign up with valid email → confirm Firebase Auth user exists (Firebase Console) and RC customer has email (RevenueCat dashboard).
3. Skip → confirm no Firebase user is created, flow lands on Paywall.
4. Pre-authed flow: log in via Paywall LoginScreen, clear onboardingComplete in storage, restart → confirm SignUp step auto-advances silently.
5. Network-off signup attempt → confirm inline error and Skip still works.

### Analytics verification
- PostHog Live Events shows `onboarding_signup_shown` on step entry.
- `onboarding_signup_completed` on success, `onboarding_signup_skipped` on skip.
- After ~24h of data, monitor skip rate. Target: under 60%. If higher, soften the screen copy in a follow-up.

## Open questions

None as of writing.
