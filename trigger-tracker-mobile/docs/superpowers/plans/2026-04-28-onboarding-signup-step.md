# Onboarding Signup Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert the existing Firebase `SignUpScreen` as a skippable step inside `OnboardingScreen`, so emails can be collected for trial-ending notifications work later.

**Architecture:** Render the existing `<SignUpScreen>` inline within `OnboardingScreen` at step index 14 (between Reminders and Loading). Add overridable `onSuccess` and `onSkip` callbacks to `SignUpScreen` so its standalone Paywall-modal usage stays unchanged. Auto-skip the step if the user is already authenticated. RevenueCat email is set in the onboarding success callback (not in the global signup path) to keep blast radius small.

**Tech Stack:** React Native, Expo, Firebase Auth (existing `AuthContext`), RevenueCat (`react-native-purchases`), PostHog (`posthog-react-native`), Jest (source-grep style tests matching the existing `OnboardingScreen.test.js` pattern).

**Spec:** `docs/superpowers/specs/2026-04-28-onboarding-signup-step-design.md`

---

## File Map

| File | Change |
|------|--------|
| `services/analytics.ts` | Add 3 new EVENTS constants |
| `screens/SignUpScreen.js` | Add `onSuccess` prop, fix `onSkip` to short-circuit fallback navigation |
| `screens/OnboardingScreen.js` | Add step 14 (SignUp); shift Loading to step 15; bump `TOTAL_STEPS` to 16; add auto-skip-when-authed; fire analytics |
| `screens/__tests__/OnboardingScreen.test.js` | Update step count to 16; add SignUp step entry; verify Loading shifted |

No new files. No new components.

---

## Task 1: Add analytics event constants

**Files:**
- Modify: `services/analytics.ts`

- [ ] **Step 1: Add events to the EVENTS object**

In `services/analytics.ts`, locate the `EVENTS` constant (currently around line 45). In the **Onboarding** group, add three new entries directly after `ONBOARDING_DAY7_SUMMARY_VIEWED`:

```ts
  // Onboarding
  ONBOARDING_TRIAGE_STARTED: "onboarding_triage_started",
  ONBOARDING_TRIAGE_COMPLETED: "onboarding_triage_completed",
  ONBOARDING_PLAN_GENERATED: "onboarding_plan_generated",
  ONBOARDING_DAY_COMPLETED: "onboarding_day_completed",
  ONBOARDING_DAY7_SUMMARY_VIEWED: "onboarding_day7_summary_viewed",
  ONBOARDING_SIGNUP_SHOWN: "onboarding_signup_shown",
  ONBOARDING_SIGNUP_COMPLETED: "onboarding_signup_completed",
  ONBOARDING_SIGNUP_SKIPPED: "onboarding_signup_skipped",
```

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "analytics\.ts"`
Expected: no new errors. (One pre-existing error on line 11 about `PostHog.initAsync` is unrelated and acceptable.)

- [ ] **Step 3: Commit**

```bash
git add services/analytics.ts
git commit -m "feat(analytics): add onboarding signup events"
```

---

## Task 2: Make SignUpScreen callbacks overridable

`SignUpScreen` already accepts `onSkip` but its handler still falls through to `navigation.replace("Paywall")` afterward. We also need an `onSuccess` prop. Both must be backward-compatible — existing Paywall-modal usage must keep working.

**Files:**
- Modify: `screens/SignUpScreen.js`

- [ ] **Step 1: Update component signature and `handleSignUp`**

In `screens/SignUpScreen.js`, find the component declaration on line 18:

```js
export default function SignUpScreen({ navigation, onSkip }) {
```

Replace with:

```js
export default function SignUpScreen({ navigation, onSkip, onSuccess }) {
```

Find `handleSignUp` (currently lines 47–76). Replace its body with the version below — it preserves the existing Firebase + RevenueCat-restore logic, but invokes `onSuccess` (when provided) instead of navigating:

```js
  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      await signUp(trimmedEmail, password);

      if (onSuccess) {
        onSuccess({ email: trimmedEmail });
        return;
      }

      setStatusMessage("Checking subscription status...");
      try {
        const result = await restoreTransactions();
        if (result.active) {
          navigation.replace("Main");
          return;
        }
      } catch (error) {
        console.warn("Subscription restore failed:", error);
      }
      navigation.replace("Paywall");
    } catch (err) {
      // Error already set in context
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 2: Update `handleSkip` to short-circuit when overridden**

Find `handleSkip` (currently lines 78–84):

```js
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    // Navigate to Paywall after skipping signup
    navigation.replace("Paywall");
  };
```

Replace with:

```js
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
      return;
    }
    navigation.replace("Paywall");
  };
```

This way, the inline onboarding usage owns the navigation decision; the standalone Paywall-modal usage keeps the existing fallback behavior.

- [ ] **Step 3: Quick sanity-check existing tests still pass**

Run: `npx jest screens/__tests__/PaywallScreen.test.js 2>&1 | tail -10`
Expected: PASS (paywall tests do not exercise SignUpScreen behavior — this is just a smoke check that nothing nearby broke).

- [ ] **Step 4: Commit**

```bash
git add screens/SignUpScreen.js
git commit -m "feat(signup): allow callers to override onSuccess and onSkip navigation"
```

---

## Task 3: Bump `TOTAL_STEPS` and shift Loading from step 14 to step 15

This is a small but load-bearing change: the OnboardingScreen state machine grows by one. Do this in isolation before adding the SignUp step itself.

**Files:**
- Modify: `screens/OnboardingScreen.js`

- [ ] **Step 1: Change `TOTAL_STEPS`**

In `screens/OnboardingScreen.js`, find the constant declaration:

```js
const TOTAL_STEPS = 15;
```

Replace with:

```js
const TOTAL_STEPS = 16;
```

- [ ] **Step 2: Shift the Loading step comment from 14 to 15**

Find the comment marking the Loading step. It will read something like:

```js
// Step 14: Loading
```

Replace with:

```js
// Step 15: Loading
```

- [ ] **Step 3: Update any `setStep(14)` calls that mean "go to Loading"**

In `OnboardingScreen.js`, search for `setStep(14)`. Each call that intends to advance to the **Loading** screen should become `setStep(15)`. Calls that advance to the **new SignUp step** stay as `setStep(14)` — but those calls don't exist yet (added in Task 4). For now, every `setStep(14)` in the file is a Loading transition and should become `setStep(15)`.

Run: `grep -n "setStep(14)" screens/OnboardingScreen.js`
Expected: a small number of matches (likely 1, in the Reminders step's "Continue" / "Skip" handlers).

For each match, change `setStep(14)` → `setStep(15)`.

- [ ] **Step 4: Verify the file still parses**

Run: `npx jest screens/__tests__/OnboardingScreen.test.js 2>&1 | tail -20`
Expected: tests fail (the test still asserts `TOTAL_STEPS = 15` and a `Step 14: Loading` comment). That's correct — we'll update the test in Task 6. The point of this step is to confirm there are no syntax errors.

- [ ] **Step 5: Do not commit yet**

We'll commit Tasks 3 + 4 + 5 + 6 together once the new step is wired up and tests are green. Continue to Task 4.

---

## Task 4: Insert the SignUp step into OnboardingScreen

**Files:**
- Modify: `screens/OnboardingScreen.js`

- [ ] **Step 1: Add imports**

At the top of `screens/OnboardingScreen.js`, add an import for the SignUpScreen component and the auth hook. These imports should sit near the other screen / context imports — match the file's existing import style:

```js
import SignUpScreen from "./SignUpScreen";
import { useAuth } from "../contexts/AuthContext";
import Purchases from "react-native-purchases";
```

If `Purchases` is already imported elsewhere in the file (search for `react-native-purchases`), do not duplicate the import — reuse the existing one.

- [ ] **Step 2: Read auth state inside the component**

Inside the `OnboardingScreen` function component, near where other hooks are called (just below `useState` initializations), add:

```js
  const { user, isAuthenticated } = useAuth();
```

- [ ] **Step 3: Add the new SignUp step render branch**

Find the render section that handles `step === 13` (Reminders). Directly **after** the `step === 13` branch and **before** the `step === 15` (Loading) branch, insert a new branch:

```jsx
  if (step === 14) {
    return (
      <SignUpScreen
        navigation={navigation}
        onSuccess={async ({ email }) => {
          posthog?.capture(EVENTS.ONBOARDING_SIGNUP_COMPLETED, { step_index: 14 });
          try {
            await Purchases.setEmail(email);
          } catch (err) {
            console.warn("Failed to set RevenueCat email:", err);
          }
          setStep(15);
        }}
        onSkip={() => {
          posthog?.capture(EVENTS.ONBOARDING_SIGNUP_SKIPPED, { step_index: 14 });
          setStep(15);
        }}
      />
    );
  }
```

The exact braces / arrow-function style should match the surrounding code in `OnboardingScreen.js` — adjust if the existing branches use a different render pattern (e.g., switch statement). Keep the `posthog?.capture` and `setStep` calls verbatim.

If the file uses `// Step N: ...` comment markers above each step branch, add one above the new branch:

```jsx
  // Step 14: SignUp (skippable)
```

- [ ] **Step 4: Add auto-skip-when-authed effect**

Near the other `useEffect` hooks in `OnboardingScreen.js`, add:

```js
  useEffect(() => {
    if (step !== 14) return;
    if (isAuthenticated && user?.email) {
      Purchases.setEmail(user.email).catch((err) => {
        console.warn("Failed to sync RevenueCat email:", err);
      });
      setStep(15);
    }
  }, [step, isAuthenticated, user]);
```

This silently advances past the SignUp step for users who are already signed in (e.g., they cleared `onboardingComplete` but Firebase Auth persisted them).

- [ ] **Step 5: Fire `ONBOARDING_SIGNUP_SHOWN` once, only for users who actually see the form**

Add another `useEffect` next to the auto-skip one:

```js
  useEffect(() => {
    if (step !== 14) return;
    if (isAuthenticated) return; // auto-skip will handle this case
    posthog?.capture(EVENTS.ONBOARDING_SIGNUP_SHOWN, { step_index: 14 });
  }, [step, isAuthenticated]);
```

Authenticated users who hit step 14 are auto-skipped (Step 4 of this task), and we don't want to fire `_SHOWN` for a step nobody visually saw.

- [ ] **Step 6: Verify the file compiles and renders**

Run: `npx jest screens/__tests__/OnboardingScreen.test.js 2>&1 | tail -25`
Expected: tests still fail on `TOTAL_STEPS = 15` and `Step 14: Loading` assertions — that's expected. Do not proceed if there are syntax or import errors.

- [ ] **Step 7: Do not commit yet**

Continue to Task 5.

---

## Task 5: Verify EVENTS import exists in OnboardingScreen

`OnboardingScreen.js` likely already imports `EVENTS` from `services/analytics`. Confirm before relying on it in Task 4's render branch.

**Files:**
- Modify (only if missing): `screens/OnboardingScreen.js`

- [ ] **Step 1: Check the import**

Run: `grep -n "from \"../services/analytics\"" screens/OnboardingScreen.js`
Expected: a line importing `EVENTS` (and possibly other helpers).

- [ ] **Step 2: Add the import if missing**

If `EVENTS` is not in the import, add it. Otherwise skip this step. Example:

```js
import { EVENTS } from "../services/analytics";
```

- [ ] **Step 3: Confirm `posthog` is initialized**

Run: `grep -n "usePostHog\\|posthog" screens/OnboardingScreen.js | head -5`
Expected: at least one `usePostHog()` call. If absent, the `posthog?.capture` calls in Task 4 are no-ops (safe), but the analytics events won't fire. In that case, add:

```js
import { usePostHog } from "posthog-react-native";
```

…and inside the component:

```js
  const posthog = usePostHog();
```

If `posthog` is already wired, do nothing.

- [ ] **Step 4: Do not commit yet**

Continue to Task 6.

---

## Task 6: Update `OnboardingScreen.test.js`

The existing test file uses source-grep style assertions. We update it to reflect the 16-step layout with SignUp at index 14.

**Files:**
- Modify: `screens/__tests__/OnboardingScreen.test.js`

- [ ] **Step 1: Update the `Total steps` assertion**

Find:

```js
  describe('Total steps', () => {
    it('defines TOTAL_STEPS = 15', () => {
      expect(source).toContain('TOTAL_STEPS = 15');
    });
  });
```

Replace with:

```js
  describe('Total steps', () => {
    it('defines TOTAL_STEPS = 16', () => {
      expect(source).toContain('TOTAL_STEPS = 16');
    });
  });
```

- [ ] **Step 2: Update the step ordering list**

Find the `steps` array (currently lines 27–43). Replace with:

```js
    const steps = [
      { step: 0, label: 'Welcome' },
      { step: 1, label: 'Conditions' },
      { step: 2, label: 'Severity' },
      { step: 3, label: 'Symptom Timing' },
      { step: 4, label: 'Health Stats Interstitial' },
      { step: 5, label: 'Symptom Frequency' },
      { step: 6, label: 'Top Symptoms' },
      { step: 7, label: 'After Eating' },
      { step: 8, label: 'Value Prop Interstitial' },
      { step: 9, label: 'Lying Down' },
      { step: 10, label: 'Fear Foods' },
      { step: 11, label: 'Meal Times + Meds' },
      { step: 12, label: 'Rate Us' },
      { step: 13, label: 'Reminders' },
      { step: 14, label: 'SignUp (skippable)' },
      { step: 15, label: 'Loading' },
    ];
```

- [ ] **Step 3: Add a new describe block asserting the SignUp step is wired**

Below the existing `Reminders step` describe block, append:

```js
  describe('SignUp step', () => {
    it('renders SignUpScreen at step 14', () => {
      expect(source).toContain('step === 14');
      expect(source).toContain('<SignUpScreen');
    });

    it('passes onSuccess that advances to step 15', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_COMPLETED');
      expect(source).toContain('setStep(15)');
    });

    it('passes onSkip that advances to step 15', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_SKIPPED');
    });

    it('fires ONBOARDING_SIGNUP_SHOWN', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_SHOWN');
    });

    it('auto-advances when already authenticated', () => {
      expect(source).toContain('isAuthenticated');
    });
  });
```

- [ ] **Step 4: Run the OnboardingScreen tests**

Run: `npx jest screens/__tests__/OnboardingScreen.test.js 2>&1 | tail -25`
Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `npx jest 2>&1 | tail -20`
Expected: full suite passes. (Pre-existing failures unrelated to onboarding/signup/analytics are acceptable but should be flagged in the commit message.)

- [ ] **Step 6: Commit Tasks 3–6 together**

```bash
git add screens/OnboardingScreen.js screens/SignUpScreen.js screens/__tests__/OnboardingScreen.test.js
git commit -m "feat(onboarding): add skippable Firebase signup step before paywall

- Insert SignUpScreen as step 14, shift Loading to step 15 (TOTAL_STEPS 15→16)
- Add onSuccess/onSkip callback props on SignUpScreen for inline use; standalone Paywall-modal entry unchanged
- Auto-skip the step when user is already authenticated (idempotent RC email sync)
- Fire ONBOARDING_SIGNUP_{SHOWN,COMPLETED,SKIPPED} for funnel analysis
- Update OnboardingScreen.test.js to 16-step layout"
```

---

## Task 7: Manual on-device verification

Source-grep tests confirm the wiring is present, but they don't exercise the screen. Verify on device before considering the feature done.

**Files:**
- None (verification only)

- [ ] **Step 1: Start the dev build**

Run: `npx expo start`
Then run on a physical iOS device (preferred) or simulator with a Firebase-configured build.

- [ ] **Step 2: Fresh-install path**

- Clear app storage / reinstall.
- Walk through onboarding from step 0 through step 13 (Reminders).
- After tapping Continue on Reminders, verify the SignUp screen appears with the same UI as the existing standalone version (email, password, confirm password, Skip link, Continue button).
- In PostHog Live Events, confirm `onboarding_signup_shown` fired exactly once with `step_index: 14`.

- [ ] **Step 3: Signup happy path**

- Enter a fresh test email + valid password.
- Tap Create Account.
- Confirm in PostHog: `onboarding_signup_completed` fires.
- Confirm in Firebase Console (Authentication tab): the new user appears.
- Confirm in RevenueCat dashboard (Customers): the customer record has the email attached.
- Confirm flow proceeds to the Loading screen, then `handleComplete` runs, then Paywall appears.

- [ ] **Step 4: Skip path**

- Repeat fresh install. Walk to step 14.
- Tap "Skip for now".
- Confirm in PostHog: `onboarding_signup_skipped` fires; `onboarding_signup_completed` does NOT fire.
- Confirm in Firebase Console: no new user is created.
- Confirm flow proceeds to Loading → Paywall.

- [ ] **Step 5: Already-authenticated path**

- Sign in via the Paywall's LoginScreen with a known account.
- Force onboarding to re-run: clear `onboardingComplete` in storage (use a debug toggle or AsyncStorage clear).
- Walk through onboarding to step 13.
- Tap Continue on Reminders.
- Confirm step 14 does NOT visually appear — flow advances directly to Loading.
- Confirm in PostHog: `onboarding_signup_shown` did NOT fire.

- [ ] **Step 6: Network-error path**

- Repeat fresh install. Walk to step 14.
- Toggle airplane mode ON.
- Enter email + password and tap Create Account.
- Expect inline Firebase error: "Network error. Please check your connection."
- Confirm Skip link is still tappable; tap it.
- Confirm flow proceeds to Loading → Paywall.

- [ ] **Step 7: Document any deviations**

If any verification step fails, do NOT mark this task complete. Capture the failure (screenshot + repro steps), fix the underlying issue, re-run the failing step, and only then mark done.

---

## Self-Review Notes

Spec coverage:

| Spec section | Implemented in |
|--------------|----------------|
| Insert step between 13 and 14 (becomes step 14, Loading→15) | Task 3, Task 4 |
| Render existing SignUpScreen inline with overridable callbacks | Task 2, Task 4 |
| Auto-skip when authenticated | Task 4 step 4 |
| `Purchases.setEmail` on success | Task 4 step 3 (and step 4 for authed-skip case) |
| 3 new analytics events | Task 1, Task 4, Task 6 |
| Standalone SignUpScreen (Paywall-modal) unchanged | Task 2 (backward-compat checks) |
| Update OnboardingScreen.test.js | Task 6 |
| Manual on-device verification | Task 7 |

Non-goals confirmed deferred:

- Trial-ending email backend — not in plan.
- Sign in with Apple / Google — not in plan.
- LoginScreen integration into onboarding — not in plan.
- Forgot-password flow changes — not in plan.
- Local AsyncStorage email persistence — explicitly avoided per spec; Firebase Auth is source of truth.
