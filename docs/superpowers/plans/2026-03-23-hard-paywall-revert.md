# Hard Paywall Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revert from freemium to a hard paywall where users must subscribe (or start a 3-day trial) after onboarding + signup before accessing the app.

**Architecture:** Single enforcement point at the navigation layer (RootNavigator). SignUp/Login screens already route to Paywall post-auth — keep that. Add subscription check on cold start and foreground resume. Remove all freemium gating code (scan limits, trigger visibility, ProTeaser). PaywallScreen becomes non-dismissable.

**Tech Stack:** React Native (Expo), React Navigation (native stack), RevenueCat, AsyncStorage, PostHog

**Spec:** `docs/superpowers/specs/2026-03-23-hard-paywall-revert-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `navigation/RootNavigator.js` | Modify | Add subscription check on cold start + foreground resume |
| `screens/PaywallScreen.tsx` | Modify | Remove dismiss affordances, fix imports, rewrite unlockApp |
| `screens/FoodScanScreen.js` | Modify | Remove all gate logic and blocked states |
| `screens/InsightsScreen.js` | Modify | Remove freemium visibility limits and ProTeaser |
| `screens/ReportScreen.js` | Modify | Remove isPro conditional, always show stats + share |
| `screens/SettingsScreen.js` | Modify | Remove Pro banner, fix broken import, always show Manage Subscription |
| `services/storage.js` | Modify | Remove local trial system (TRIAL_LENGTH_MS, getTrialInfo, etc.) |
| `services/scannerGate.ts` | Delete | No longer needed |
| `services/paywallTrigger.ts` | Delete | No longer needed |
| `components/ProTeaser.js` | Delete | No longer needed |
| `components/__tests__/ProTeaser.test.js` | Delete | Test for deleted component |
| `hooks/usePremiumStatus.js` | Delete | No consumers after freemium removal |
| `services/__tests__/scannerGate.test.js` | Delete | Tests for deleted module |
| `services/__tests__/paywallTrigger.test.js` | Delete | Tests for deleted module |
| `screens/__tests__/FoodScanScreen.test.js` | Delete | Tests freemium gating that no longer exists |
| `screens/__tests__/InsightsScreen.test.js` | Delete | Tests freemium gating that no longer exists |
| `screens/__tests__/ReportScreen.test.js` | Delete | Tests freemium gating that no longer exists |
| `screens/__tests__/SettingsScreen.test.js` | Modify | Remove tests for deleted Pro banner/isPro/getEntitlementState |
| `screens/__tests__/PaywallScreen.test.js` | Modify | Remove tests for scanner_limit, trigger_source, isScannerLimit |

---

### Task 1: Delete freemium gating services

Remove the two service files that power the freemium model. This is done first so that downstream changes in later tasks will correctly fail to compile if any stale imports remain.

**Files:**
- Delete: `trigger-tracker-mobile/services/scannerGate.ts`
- Delete: `trigger-tracker-mobile/services/paywallTrigger.ts`

- [ ] **Step 1: Delete scannerGate.ts**

```bash
rm trigger-tracker-mobile/services/scannerGate.ts
```

- [ ] **Step 2: Delete paywallTrigger.ts**

```bash
rm trigger-tracker-mobile/services/paywallTrigger.ts
```

- [ ] **Step 3: Commit**

```bash
git add -u trigger-tracker-mobile/services/scannerGate.ts trigger-tracker-mobile/services/paywallTrigger.ts
git commit -m "refactor: delete freemium gating services (scannerGate, paywallTrigger)"
```

---

### Task 2: Delete ProTeaser component and test

**Files:**
- Delete: `trigger-tracker-mobile/components/ProTeaser.js`
- Delete: `trigger-tracker-mobile/components/__tests__/ProTeaser.test.js`

- [ ] **Step 1: Delete ProTeaser.js and its test**

```bash
rm trigger-tracker-mobile/components/ProTeaser.js
rm trigger-tracker-mobile/components/__tests__/ProTeaser.test.js
```

- [ ] **Step 2: Commit**

```bash
git add -u trigger-tracker-mobile/components/ProTeaser.js trigger-tracker-mobile/components/__tests__/ProTeaser.test.js
git commit -m "refactor: delete ProTeaser component and test"
```

---

### Task 3: Clean up storage.js — remove local trial system

Remove `TRIAL_LENGTH_MS`, `ensureTrialFields`, `getTrialInfo`, `acknowledgePaywall`, `activateSubscription`, and the `trialEndsAt` field from `createUser`. RevenueCat is now the sole source of truth.

**Files:**
- Modify: `trigger-tracker-mobile/services/storage.js`

- [ ] **Step 1: Remove TRIAL_LENGTH_MS constant**

Delete line 13:
```js
const TRIAL_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
```

- [ ] **Step 2: Remove trialEndsAt and trialAcknowledged from createUser**

In `createUser` (line 115-141), remove these three fields from the user object:
```js
    trialEndsAt: Date.now() + TRIAL_LENGTH_MS,
    subscriptionActive: false,
    trialAcknowledged: false,
```

Replace with:
```js
    subscriptionActive: false,
```

- [ ] **Step 3: Delete ensureTrialFields function**

Delete lines 153-163 (the entire `ensureTrialFields` function).

- [ ] **Step 4: Delete getTrialInfo function**

Delete lines 165-219 (the entire `getTrialInfo` export). Also remove the `configureRevenueCat` and `getSubscriptionStatus` imports from line 2, and the `identifyUser` import from line 4, since `getTrialInfo` was the only consumer.

Check if `configureRevenueCat`/`getSubscriptionStatus` are used elsewhere in this file — they are NOT (only `getTrialInfo` used them). Remove the import:
```js
import { configureRevenueCat, getSubscriptionStatus } from "./revenuecat";
```

Also check `identifyUser` — it's only used inside `getTrialInfo`. Remove:
```js
import { identifyUser } from "./analytics";
```

- [ ] **Step 5: Delete acknowledgePaywall function**

Delete lines 221-227.

- [ ] **Step 6: Delete activateSubscription function**

Delete lines 229-240.

- [ ] **Step 7: Verify the file compiles**

Remaining exports should be: `STREAK_MILESTONES`, `generateId`, `getMeals`, `saveMeal`, `deleteMeal`, `getSymptoms`, `saveSymptom`, `deleteSymptom`, `getUser`, `saveUser`, `createUser`, `getDaysSinceStart`, `incrementScanCount`, `getScanCount7d`, `clearAllData`, `getSeenAccessories`, `markAccessorySeen`, `getPersonalTriggers`, `getStreakInfo`, `updateBestStreak`.

- [ ] **Step 8: Commit**

```bash
git add trigger-tracker-mobile/services/storage.js
git commit -m "refactor: remove local trial system from storage.js, RevenueCat is sole source of truth"
```

---

### Task 4: Make PaywallScreen non-dismissable

Remove close button, fix broken imports, rewrite `unlockApp` to use stack reset, remove trigger_source conditionals.

**Files:**
- Modify: `trigger-tracker-mobile/screens/PaywallScreen.tsx`

- [ ] **Step 1: Fix imports — remove deleted modules**

Replace line 28-29:
```ts
import { getTrialInfo } from "../services/storage";
import { recordPaywallShown, getEntitlementState } from "../services/paywallTrigger";
```

With:
```ts
import { getUser } from "../services/storage";
```

- [ ] **Step 2: Remove Expo Go bypass, isExpoGo constant, and Constants import**

Delete the `isExpoGo` constant (line 38) and `Constants` import (line 22):
```ts
import Constants from "expo-constants";
```
```ts
const isExpoGo = Constants?.appOwnership === "expo";
```

Replace line 40:
```ts
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");
```

With:
```ts
const shouldBypassPaywall = __DEV__ && bypassFlag !== "false";
```

- [ ] **Step 3: Remove recordPaywallShown from useEffect**

Replace lines 166-175:
```ts
  useEffect(() => {
    posthog?.screen("Paywall");
    posthog?.capture(EVENTS.PAYWALL_VIEWED, {
      trigger_source: triggerSource,
    });
    posthog?.capture(EVENTS.PAYWALL_TRIGGERED, {
      trigger_source: triggerSource,
    });
    recordPaywallShown().catch(() => {});
  }, []);
```

With:
```ts
  useEffect(() => {
    posthog?.screen("Paywall");
    posthog?.capture(EVENTS.PAYWALL_VIEWED);
    posthog?.capture(EVENTS.PAYWALL_TRIGGERED);
  }, []);
```

- [ ] **Step 4: Replace getTrialInfo with getUser in loadOfferings**

Replace lines 197-199:
```ts
        const trialInfo = await getTrialInfo();
        if (!mounted) return;
        const currentUserId = trialInfo.user?.id ?? null;
```

With:
```ts
        const user = await getUser();
        if (!mounted) return;
        const currentUserId = user?.id ?? null;
```

- [ ] **Step 5: Rewrite unlockApp to use CommonActions.reset**

Add import at top of file (after the react-navigation imports or near navigation usage):
```ts
import { CommonActions } from "@react-navigation/native";
```

Replace lines 256-262:
```ts
  const unlockApp = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Main");
    }
  };
```

With:
```ts
  const unlockApp = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    );
  };
```

- [ ] **Step 6: Remove close button from hero section**

Delete lines 499-522 (the entire `{/* Close button */}` Pressable block inside the LinearGradient):
```tsx
          {/* Close button */}
          <Pressable
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.replace("Main")
            }
            style={{
              position: "absolute",
              top: 56,
              right: 20,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.2)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={18} color="#ffffff" />
          </Pressable>
```

Also remove the `X` import from lucide-react-native (line 24) since it's no longer used:
```ts
import { X, Check } from "lucide-react-native";
```
→
```ts
import { Check } from "lucide-react-native";
```

- [ ] **Step 7: Remove trigger_source conditionals from headline**

Replace the entire headline section (lines 596-648) — remove the `isScannerLimit` branch and the `triggerSource`/`isScannerLimit` variables at the top of the component:

Remove lines 156-157:
```ts
  const triggerSource = route?.params?.trigger_source || "manual";
  const isScannerLimit = triggerSource === "scanner_limit";
```

Replace the headline block (lines 596-648) with just the default headline:
```tsx
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: "800",
              textAlign: "center",
              lineHeight: 38,
            }}
          >
            Find your top triggers in 14 days.
          </Text>
          <Text
            style={{
              color: "#999999",
              fontSize: 15,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Unlimited scanning, trigger analysis, and detailed reports
          </Text>
        </View>
```

- [ ] **Step 8: Simplify primaryCtaText**

Replace lines 362-366:
```ts
  const primaryCtaText = isScannerLimit
    ? "Start 7-Day Free Trial"
    : hasFreeTrial(selectedPackage)
    ? trialCtaText(selectedPackage)
    : "Unlock Pro";
```

With:
```ts
  const primaryCtaText = hasFreeTrial(selectedPackage)
    ? trialCtaText(selectedPackage)
    : "Unlock Pro";
```

- [ ] **Step 9: Remove trigger_source from analytics events**

Throughout the file, remove `trigger_source: triggerSource` from all posthog capture calls. These are in `handlePurchase` (lines 281-285, 293-295) and `handleRestore` (line 339). Simply remove the `trigger_source` property from each event's properties object.

- [ ] **Step 10: Commit**

```bash
git add trigger-tracker-mobile/screens/PaywallScreen.tsx
git commit -m "refactor: make PaywallScreen non-dismissable hard paywall"
```

---

### Task 5: Update RootNavigator — add subscription gate

Add subscription check on cold start (when user has completed onboarding) and on foreground resume. Change Paywall screen options from modal to card with gesture disabled.

**Files:**
- Modify: `trigger-tracker-mobile/navigation/RootNavigator.js`

- [ ] **Step 1: Add imports**

Add to existing imports at top of file:
```js
import { AppState } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { getSubscriptionStatus, configureRevenueCat } from "../services/revenuecat";
```

Note: `useNavigation` won't work here since RootNavigator owns the NavigationContainer. Instead, use a `navigationRef`. Add a ref:
```js
import { createNavigationContainerRef } from "@react-navigation/native";
```

Actually, since RootNavigator renders the Stack.Navigator directly and is inside a NavigationContainer (presumably in App.js), we need to use a `useRef` for the navigation. The simplest approach: add the subscription check inside `determineFlow` for cold start, and use `AppState` + the existing `setFlow` for foreground resume.

Replace the entire `determineFlow` logic (lines 88-116) to include subscription check:

```js
  useEffect(() => {
    const determineFlow = async () => {
      try {
        const user = await getUser();

        if (user?.onboardingComplete) {
          syncReminderNotifications({
            remindersEnabled: user.remindersEnabled ?? true,
            eveningReminderEnabled: user.eveningReminderEnabled ?? false,
          }).catch((err) => console.warn("Failed to sync reminders:", err));
          syncSmartNotifications().catch((err) =>
            console.warn("Failed to sync smart notifications:", err)
          );

          // Check subscription status before allowing access
          let hasActiveSubscription = false;
          try {
            await configureRevenueCat(user.id);
            const status = await getSubscriptionStatus(user.id);
            hasActiveSubscription = status.active;
          } catch (err) {
            // Offline: fall back to cached local flag
            hasActiveSubscription = Boolean(user.subscriptionActive);
          }

          if (hasActiveSubscription) {
            setFlow("main");
          } else {
            setFlow("paywall");
          }
        } else {
          setFlow("onboarding");
        }
      } catch (error) {
        console.warn("Failed to load user state", error);
        setFlow("onboarding");
      } finally {
        setIsReady(true);
      }
    };
    determineFlow();
  }, []);
```

- [ ] **Step 2: Update getInitialRoute to handle paywall flow**

Replace lines 140-149:
```js
  const getInitialRoute = () => {
    switch (flow) {
      case "main":
        return "Main";
      case "signup":
        return "SignUp";
      default:
        return "Onboarding";
    }
  };
```

With:
```js
  const getInitialRoute = () => {
    switch (flow) {
      case "main":
        return "Main";
      case "paywall":
        return "Paywall";
      case "signup":
        return "SignUp";
      default:
        return "Onboarding";
    }
  };
```

- [ ] **Step 3: Change Paywall screen options — prevent swipe dismiss**

Replace lines 171-176:
```jsx
      <Stack.Screen
        name="Paywall"
        options={{ presentation: "modal" }}
      >
        {(props) => <PaywallScreen {...props} />}
      </Stack.Screen>
```

With:
```jsx
      <Stack.Screen
        name="Paywall"
        options={{ gestureEnabled: false }}
      >
        {(props) => <PaywallScreen {...props} />}
      </Stack.Screen>
```

- [ ] **Step 4: Add AppState listener for foreground resume subscription check**

The `TabNavigator` component has access to `useNavigation` since it renders inside the Stack. Add the AppState listener here to re-check subscription when the app comes to foreground.

Replace the TabNavigator (lines 28-81) to add a subscription check:

```js
const TabNavigator = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState !== "active") return;
      try {
        const user = await getUser();
        if (!user?.id) return;
        await configureRevenueCat(user.id);
        const status = await getSubscriptionStatus(user.id);
        if (!status.active) {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Paywall" }],
            })
          );
        }
      } catch {
        // Offline — fail open
      }
    });
    return () => subscription.remove();
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#3aa27f",
        tabBarInactiveTintColor: "#5f6f74",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e1e8e3",
          backgroundColor: "#ffffff",
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home size={20} color={color} />, title: "Home" }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} />, title: "Insights" }} />
      <Tab.Screen name="Report" component={ReportScreen} options={{ tabBarIcon: ({ color }) => <FileText size={20} color={color} />, title: "Report" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: ({ color }) => <Settings size={20} color={color} />, title: "Settings" }} />
    </Tab.Navigator>
  );
};
```

Add the required imports at the top:
```js
import { AppState } from "react-native";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { getSubscriptionStatus, configureRevenueCat } from "../services/revenuecat";
```

- [ ] **Step 5: Commit**

```bash
git add trigger-tracker-mobile/navigation/RootNavigator.js
git commit -m "feat: add hard paywall gate on cold start and foreground resume"
```

---

### Task 6: Remove freemium gating from FoodScanScreen

Remove all scanner gate imports, gate checks, blocked states, and remaining scans UI. The scanner is now always available to subscribed users.

**Files:**
- Modify: `trigger-tracker-mobile/screens/FoodScanScreen.js`

- [ ] **Step 1: Remove scannerGate imports**

Delete lines 24-26:
```js
import {
  canUserScan, incrementFreeScanCount, FREE_SCAN_LIMIT, FEATURE_FLAGS,
} from "../services/scannerGate";
```

- [ ] **Step 2: Remove shouldBypassPaywall and related constants**

Delete lines 28-30:
```js
const isExpoGo = Constants?.appOwnership === "expo";
const bypassFlag = process.env.EXPO_PUBLIC_BYPASS_PAYWALL;
const shouldBypassPaywall = isExpoGo || (__DEV__ && bypassFlag !== "false");
```

Also remove the `Constants` import from line 5 (if not used elsewhere):
```js
import Constants from "expo-constants";
```

- [ ] **Step 3: Remove gate state variables**

Delete lines 87-90:
```js
  // Gate state
  const [gateResult, setGateResult] = useState(null);
  const [isCheckingGate, setIsCheckingGate] = useState(true);
  const scanIdRef = useRef(null);
```

- [ ] **Step 4: Remove checkGate callback and useFocusEffect**

Delete lines 94-130 (the entire `checkGate` callback and `useFocusEffect` that calls it).

- [ ] **Step 5: Simplify handlePick — remove gate enforcement**

Replace lines 172-231 with a simplified version that removes all gate checks:

```js
  const handlePick = async (type) => {
    setError(null);
    setAnalysis(null);
    setHasLoggedMeal(false);
    setExpandedTags(new Set());

    posthog?.capture(EVENTS.SCANNER_ATTEMPTED);

    const allowed = await handlePermission(type);
    if (!allowed) return;

    const picker =
      type === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.4,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset) {
      showToast("No image selected");
      return;
    }

    setSelectedImage(asset);
    analyze(asset);
  };
```

- [ ] **Step 6: Simplify analyze — remove incrementFreeScanCount and gate refresh**

Replace the `analyze` function (lines 233-281) removing the scan count increment and gate refresh:

```js
  const analyze = async (asset) => {
    setIsAnalyzing(true);
    posthog?.capture("food_scan_started");
    try {
      const [personalTriggers, user] = await Promise.all([
        getPersonalTriggers(),
        getUser(),
      ]);
      setPersonalTriggerCount(personalTriggers?.length || 0);
      const rawResult = await analyzeFoodImage(asset, personalTriggers, user?.conditions);
      const enhanced = enhanceScanResult(rawResult);
      setAnalysis(enhanced);

      const scanCount7d = await getScanCount7d();
      const userTenureDays = await getDaysSinceStart();

      posthog?.capture(EVENTS.SCANNER_RESULT_VIEWED, {
        result_label: enhanced.trafficLight,
        score: enhanced.score,
        has_swaps: enhanced.saferSwaps.length > 0,
        reason_tags: enhanced.reasonTags,
        scan_count_7d: scanCount7d,
        user_tenure_days: userTenureDays,
        has_personal_triggers: (enhanced.personalTriggerMatch?.length || 0) > 0,
      });
    } catch (err) {
      console.warn("Food analysis failed", err);
      posthog?.capture("food_scan_failed");
      setError(userErrorMessage);
      showToast("Analysis failed", userErrorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };
```

- [ ] **Step 7: Remove isCheckingGate loading state**

Delete lines 362-370 (the `if (isCheckingGate)` early return).

- [ ] **Step 8: Remove isBlocked and isLegacyBlocked states and their UI**

Delete lines 372-522 (the `isBlocked` variable, `isLegacyBlocked` variable, and both blocked state return blocks).

- [ ] **Step 9: Remove remaining scans indicator from header**

Delete lines 527-530 (the `isFreeUser` and `remainingScans` variables):
```js
  const isFreeUser = gateResult?.entitlementState === "free";
  const remainingScans = isFreeUser
    ? Math.max(0, FREE_SCAN_LIMIT - (gateResult?.freeScanCount ?? 0))
    : null;
```

Delete lines 547-555 (the free scans remaining badge in the header):
```jsx
          {isFreeUser && remainingScans !== null && (
            <View className="flex-row items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              <Camera size={14} color="#d97706" />
              <Text className="text-amber-700 font-bold text-xs">
                {remainingScans}/{FREE_SCAN_LIMIT}
              </Text>
            </View>
          )}
```

- [ ] **Step 10: Clean up unused imports**

Remove `Lock` from lucide-react-native imports (line 8-9) — only used in blocked states. Remove `useRef` from React imports (line 1) if `scanIdRef` was the only ref. Remove `Constants` import. Keep `useFocusEffect` only if still needed (it's not after removing checkGate). Remove it.

Final import cleanup — the remaining imports should be:
```js
import { useState, useEffect } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft, Camera, Image as ImageIcon, Info, ShieldAlert,
  Utensils, Flame, Sparkles, ChevronDown, ChevronUp, ArrowRightLeft,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { analyzeFoodImage } from "../services/foodAnalysis";
import { enhanceScanResult } from "../services/scannerAdapter";
import { showToast } from "../utils/feedback";
import {
  saveMeal, getPersonalTriggers, getMeals, getUser,
  getStreakInfo, updateBestStreak, STREAK_MILESTONES,
  getScanCount7d, getDaysSinceStart, generateId,
} from "../services/storage";
import { EVENTS } from "../services/analytics";
```

Note: `generateId` may no longer be needed (was used for `scanIdRef`). Check — it's also used in `saveMeal` indirectly but not directly in this file after removing `scanIdRef`. Remove it from the import if unused. Actually `generateId` was used for `thisScanId` in `analyze` — now removed. Remove it.

Also `Mascot` is only used in blocked states — remove that import too. And `Sparkles` is only used in blocked states — remove. `Info` and `ShieldAlert` — check: `ShieldAlert` is used in the camera blocked card and in results. `Info` — only in blocked states? Check the file... `Info` appears in line 7 import but looking at usage: it's not used in the main scanner UI (only in blocked states). Remove `Info`.

Final cleaned imports:
```js
import { useState, useEffect } from "react";
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft, Camera, Image as ImageIcon, ShieldAlert,
  Utensils, Flame, ChevronDown, ChevronUp, ArrowRightLeft,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import { analyzeFoodImage } from "../services/foodAnalysis";
import { enhanceScanResult } from "../services/scannerAdapter";
import { showToast } from "../utils/feedback";
import {
  saveMeal, getPersonalTriggers, getMeals, getUser,
  getStreakInfo, updateBestStreak, STREAK_MILESTONES,
  getScanCount7d, getDaysSinceStart,
} from "../services/storage";
import { EVENTS } from "../services/analytics";
```

- [ ] **Step 11: Commit**

```bash
git add trigger-tracker-mobile/screens/FoodScanScreen.js
git commit -m "refactor: remove freemium gating from FoodScanScreen"
```

---

### Task 7: Remove freemium gating from InsightsScreen

Remove visibility limits, ProTeaser, isPro conditionals, and paywall trigger.

**Files:**
- Modify: `trigger-tracker-mobile/screens/InsightsScreen.js`

- [ ] **Step 1: Remove ProTeaser import**

Delete line 7:
```js
import ProTeaser from "../components/ProTeaser";
```

- [ ] **Step 2: Remove usePremiumStatus import and usage**

Delete line 11:
```js
import { usePremiumStatus } from "../hooks/usePremiumStatus";
```

Delete line 12:
```js
import { shouldShowPaywall } from "../services/paywallTrigger";
```

Remove from component (line 21):
```js
  const { isPro, refreshStatus } = usePremiumStatus(userId);
```

Remove `userId` state since it's only used for usePremiumStatus (line 20):
```js
  const [userId, setUserId] = useState(null);
```

In `loadData`, remove the `setUserId` call (line 29):
```js
      if (user?.id) setUserId(user.id);
```

- [ ] **Step 3: Remove paywall trigger from useFocusEffect**

Replace lines 39-50:
```js
  useFocusEffect(
    useCallback(() => {
      loadData().then(() => {
        shouldShowPaywall("post_insight").then((check) => {
          if (check.show && navigation) {
            navigation.navigate("Paywall", { trigger_source: "post_insight" });
          }
        }).catch(() => {});
      });
      refreshStatus();
    }, [loadData, refreshStatus, navigation])
  );
```

With:
```js
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
```

- [ ] **Step 4: Remove freemium visibility limits**

Replace lines 60-67:
```js
  const freeTriggerLimit = 2;
  const freeSafeFoodLimit = 1;

  const visibleTriggers = isPro ? triggers.slice(0, 5) : triggers.slice(0, freeTriggerLimit);
  const hiddenTriggerCount = isPro ? 0 : Math.max(0, Math.min(triggers.length, 5) - freeTriggerLimit);

  const visibleSafeFoods = isPro ? safeFoods.slice(0, 5) : safeFoods.slice(0, freeSafeFoodLimit);
  const hiddenSafeFoodCount = isPro ? 0 : Math.max(0, Math.min(safeFoods.length, 5) - freeSafeFoodLimit);
```

With:
```js
  const visibleTriggers = triggers.slice(0, 5);
  const visibleSafeFoods = safeFoods.slice(0, 5);
```

- [ ] **Step 5: Update TriggerBadge showDetails prop**

Replace line 94:
```jsx
                  showDetails={isPro}
```

With:
```jsx
                  showDetails={true}
```

- [ ] **Step 6: Remove ProTeaser usage for triggers**

Delete lines 97-102:
```jsx
              {hiddenTriggerCount > 0 && (
                <ProTeaser
                  title={`See ${hiddenTriggerCount} more`}
                  description="Unlock full trigger analysis."
                />
              )}
```

- [ ] **Step 7: Remove ProTeaser usage for safe foods**

Delete lines 124-129:
```jsx
              {hiddenSafeFoodCount > 0 && (
                <ProTeaser
                  title={`See ${hiddenSafeFoodCount} more`}
                  description="Unlock your complete safe foods list."
                />
              )}
```

- [ ] **Step 8: Remove `navigation` prop since no longer needed for paywall**

Remove `navigation` from the function signature (line 16):
```js
export default function InsightsScreen({ navigation }) {
```
→
```js
export default function InsightsScreen() {
```

- [ ] **Step 9: Commit**

```bash
git add trigger-tracker-mobile/screens/InsightsScreen.js
git commit -m "refactor: remove freemium gating from InsightsScreen"
```

---

### Task 8: Remove freemium gating from ReportScreen

Remove isPro conditionals — always show full stats grid and share button.

**Files:**
- Modify: `trigger-tracker-mobile/screens/ReportScreen.js`

- [ ] **Step 1: Remove ProTeaser and usePremiumStatus imports**

Delete line 7:
```js
import ProTeaser from "../components/ProTeaser";
```

Delete line 12:
```js
import { usePremiumStatus } from "../hooks/usePremiumStatus";
```

- [ ] **Step 2: Remove usePremiumStatus usage**

Delete lines 18-19:
```js
  const [userId, setUserId] = useState(null);
  const { isPro, refreshStatus } = usePremiumStatus(userId);
```

In `loadData`, remove `setUserId` call (line 26):
```js
      if (user?.id) setUserId(user.id);
```

- [ ] **Step 3: Remove refreshStatus from useFocusEffect**

Replace lines 33-38:
```js
  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshStatus();
    }, [loadData, refreshStatus])
  );
```

With:
```js
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
```

- [ ] **Step 4: Replace isPro conditional stats grid**

Replace lines 80-108:
```jsx
      {isPro ? (
        <View className="flex-row flex-wrap gap-3">
          ...stats cards...
        </View>
      ) : (
        <ProTeaser
          title="Unlock analytics"
          description="See severity trends, timing patterns, and symptom-free days."
        />
      )}
```

With just the stats grid (no conditional):
```jsx
      <View className="flex-row flex-wrap gap-3">
        <Card className="p-4 basis-[48%] items-center">
          <Clock size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-accent mt-2">{patternReport.lateEatingRisk}%</Text>
          <Text className="text-xs text-muted-foreground mt-1">Late eating</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <TrendingDown size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-foreground mt-2">{patternReport.avgSeverity}/5</Text>
          <Text className="text-xs text-muted-foreground mt-1">Avg severity</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <Calendar size={18} color="#5f6f74" />
          <Text className="text-2xl font-bold text-success mt-2">{patternReport.symptomFreeDays}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Symptom-free days</Text>
        </Card>
        <Card className="p-4 basis-[48%] items-center">
          <Clock size={18} color="#5f6f74" />
          <Text className="text-xl font-bold text-foreground mt-2">{patternReport.worstTimeOfDay}</Text>
          <Text className="text-xs text-muted-foreground mt-1">Peak symptom time</Text>
        </Card>
      </View>
```

- [ ] **Step 5: Remove isPro conditional from share button**

Replace lines 110-115:
```jsx
      {isPro && (
        <Button onPress={handleShare} variant="outline" className="w-full flex-row gap-2">
          <Share2 size={18} color="#1f2a30" />
          <Text className="text-foreground font-semibold">Share</Text>
        </Button>
      )}
```

With:
```jsx
      <Button onPress={handleShare} variant="outline" className="w-full flex-row gap-2">
        <Share2 size={18} color="#1f2a30" />
        <Text className="text-foreground font-semibold">Share</Text>
      </Button>
```

- [ ] **Step 6: Commit**

```bash
git add trigger-tracker-mobile/screens/ReportScreen.js
git commit -m "refactor: remove freemium gating from ReportScreen"
```

---

### Task 9: Fix SettingsScreen — remove broken import and Pro banner

**Files:**
- Modify: `trigger-tracker-mobile/screens/SettingsScreen.js`

- [ ] **Step 1: Remove getEntitlementState import**

Delete line 21:
```js
import { getEntitlementState } from "../services/paywallTrigger";
```

- [ ] **Step 2: Remove isPro state and its refresh in useFocusEffect**

Delete line 70:
```js
  const [isPro, setIsPro] = useState(false);
```

Replace lines 90-97:
```js
  useFocusEffect(
    useCallback(() => {
      refreshNotificationStatus();
      getEntitlementState()
        .then((state) => setIsPro(state === "pro" || state === "trial"))
        .catch(() => {});
    }, [refreshNotificationStatus])
  );
```

With:
```js
  useFocusEffect(
    useCallback(() => {
      refreshNotificationStatus();
    }, [refreshNotificationStatus])
  );
```

- [ ] **Step 3: Remove "Upgrade to Pro" banner**

Delete lines 233-253 (the entire `{!isPro && (...)}` Pressable block for the upgrade banner).

- [ ] **Step 4: Always show Manage Subscription section**

Replace lines 344-354:
```jsx
      {isPro && (
        <View className="gap-3 mt-2">
          <Text className="text-lg font-bold text-foreground">Subscription</Text>
          <SettingsCard
            icon={CreditCard}
            label="Manage Subscription"
            onPress={() => navigation.navigate("CustomerCenter")}
          />
        </View>
      )}
```

With (remove the `isPro` conditional):
```jsx
      <View className="gap-3 mt-2">
        <Text className="text-lg font-bold text-foreground">Subscription</Text>
        <SettingsCard
          icon={CreditCard}
          label="Manage Subscription"
          onPress={() => navigation.navigate("CustomerCenter")}
        />
      </View>
```

- [ ] **Step 5: Commit**

```bash
git add trigger-tracker-mobile/screens/SettingsScreen.js
git commit -m "refactor: remove Pro banner and broken import from SettingsScreen"
```

---

### Task 10: Delete usePremiumStatus hook (now dead code)

After Tasks 7-8 removed all consumers, this hook has zero imports.

**Files:**
- Delete: `trigger-tracker-mobile/hooks/usePremiumStatus.js`

- [ ] **Step 1: Delete the hook**

```bash
rm trigger-tracker-mobile/hooks/usePremiumStatus.js
```

- [ ] **Step 2: Commit**

```bash
git add -u trigger-tracker-mobile/hooks/usePremiumStatus.js
git commit -m "refactor: delete usePremiumStatus hook (no consumers after freemium removal)"
```

---

### Task 11: Delete and update broken test files

Multiple test files test freemium gating logic that no longer exists. Delete tests for deleted modules, and update tests for modified screens.

**Files:**
- Delete: `trigger-tracker-mobile/services/__tests__/scannerGate.test.js`
- Delete: `trigger-tracker-mobile/services/__tests__/paywallTrigger.test.js`
- Delete: `trigger-tracker-mobile/screens/__tests__/FoodScanScreen.test.js`
- Delete: `trigger-tracker-mobile/screens/__tests__/InsightsScreen.test.js`
- Delete: `trigger-tracker-mobile/screens/__tests__/ReportScreen.test.js`
- Modify: `trigger-tracker-mobile/screens/__tests__/SettingsScreen.test.js`
- Modify: `trigger-tracker-mobile/screens/__tests__/PaywallScreen.test.js`

- [ ] **Step 1: Delete test files for deleted modules**

```bash
rm trigger-tracker-mobile/services/__tests__/scannerGate.test.js
rm trigger-tracker-mobile/services/__tests__/paywallTrigger.test.js
```

- [ ] **Step 2: Delete test files that fully test removed freemium gating**

```bash
rm trigger-tracker-mobile/screens/__tests__/FoodScanScreen.test.js
rm trigger-tracker-mobile/screens/__tests__/InsightsScreen.test.js
rm trigger-tracker-mobile/screens/__tests__/ReportScreen.test.js
```

- [ ] **Step 3: Update SettingsScreen.test.js — remove freemium-specific tests**

Remove these test blocks that assert freemium code that no longer exists:
- `'imports getEntitlementState from paywallTrigger'` (lines 14-17) — `getEntitlementState` and `paywallTrigger` are removed
- `'contains "Upgrade to Pro" text'` (lines 31-32) — banner is removed
- `'contains upgrade description'` (lines 35-37) — banner is removed
- `'navigates to Paywall with trigger_source settings'` (lines 39-42) — paywall navigation from settings is removed
- `'contains isPro state'` (line 47) — `isPro` is removed
- `'checks getEntitlementState()'` (lines 50-52) — removed
- `'conditionally shows upgrade banner with !isPro'` (lines 54-56) — removed
- `'contains Manage Subscription shown when isPro'` (lines 132-135) — `isPro` conditional is removed; update to just check `Manage Subscription` exists without `isPro`

Replace the `Subscription section` test:
```js
  describe('Subscription section', () => {
    it('contains Manage Subscription', () => {
      expect(source).toContain('Manage Subscription');
    });
  });
```

- [ ] **Step 4: Update PaywallScreen.test.js — remove scanner_limit and trigger_source tests**

Remove these test blocks:
- `'Scanner limit contextual messaging'` describe block (lines 77-94) — `scanner_limit`, `isScannerLimit`, "Try Pro free for 7 days", "You've used your 3 free scans" are all removed
- `'passes trigger_source to events'` (lines 117-119) — `trigger_source` is removed from analytics

- [ ] **Step 5: Commit**

```bash
git add -u trigger-tracker-mobile/services/__tests__/scannerGate.test.js trigger-tracker-mobile/services/__tests__/paywallTrigger.test.js trigger-tracker-mobile/screens/__tests__/FoodScanScreen.test.js trigger-tracker-mobile/screens/__tests__/InsightsScreen.test.js trigger-tracker-mobile/screens/__tests__/ReportScreen.test.js
git add trigger-tracker-mobile/screens/__tests__/SettingsScreen.test.js trigger-tracker-mobile/screens/__tests__/PaywallScreen.test.js
git commit -m "test: delete and update tests for freemium code removal"
```

---

### Task 12: Verify the app compiles

**Files:** None (verification only)

- [ ] **Step 1: Run the Metro bundler to check for compilation errors**

```bash
cd trigger-tracker-mobile && npx expo start --clear 2>&1 | head -50
```

Or if there's an existing build script:
```bash
cd trigger-tracker-mobile && npx expo export --platform ios 2>&1 | tail -30
```

Look for any import errors, missing modules, or syntax issues.

- [ ] **Step 2: Fix any remaining broken imports or references**

If any files still reference deleted modules (`scannerGate`, `paywallTrigger`, `ProTeaser`), fix them.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A trigger-tracker-mobile/
git commit -m "fix: resolve remaining broken imports after hard paywall revert"
```
