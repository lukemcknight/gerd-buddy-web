# Paywall Demo Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `__DEV__`-gated "Load demo data" button in Settings that fills the app with 14 days of realistic mock meals + symptoms (with deliberate trigger patterns) so Luke can take in-app screenshots to embed in the paywall.

**Architecture:** One new module (`services/demoData.js`) that builds a hand-shaped dataset of meals + symptoms anchored to "now", and writes it through the existing `saveMeal` / `saveSymptom` functions. A new `SettingsCard` in the Data section of `SettingsScreen.js`, rendered only when `__DEV__` is true, calls the loader.

**Tech Stack:** React Native, Jest, AsyncStorage (mocked in tests), lucide-react-native icons.

**Spec:** `docs/superpowers/specs/2026-05-14-paywall-demo-data-design.md`

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `services/demoData.js` | Create | Build the dataset and expose `loadDemoData()` |
| `services/__tests__/demoData.test.js` | Create | Verify counts and the coffee→heartburn invariant |
| `screens/SettingsScreen.js` | Modify | Add `__DEV__`-gated card + handler in Data section |

---

## Task 1: `loadDemoData` module — empty shell + first failing test

**Files:**
- Create: `services/demoData.js`
- Create: `services/__tests__/demoData.test.js`

- [ ] **Step 1: Write the failing test**

Create `services/__tests__/demoData.test.js`:

```js
// Mock AsyncStorage with the same in-memory pattern other storage tests use.
jest.mock("@react-native-async-storage/async-storage", () => {
  let store = {};
  return {
    __reset: () => {
      store = {};
    },
    getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    multiRemove: jest.fn(() => Promise.resolve()),
  };
});

// Storage's saveMeal triggers a review prompt — silence it.
jest.mock("../reviewPrompt", () => ({
  maybePromptForReview: jest.fn(() => Promise.resolve()),
}));

// Storage imports analytics on load — silence it.
jest.mock("../analytics", () => ({
  identifyUser: jest.fn(() => Promise.resolve()),
  trackEvent: jest.fn(() => Promise.resolve()),
}));

// Storage imports revenuecat on load — silence it.
jest.mock("../revenuecat", () => ({
  configureRevenueCat: jest.fn(() => Promise.resolve()),
  getSubscriptionStatus: jest.fn(() =>
    Promise.resolve({ active: false, isTrial: false, expiresAt: null })
  ),
}));

const AsyncStorage = require("@react-native-async-storage/async-storage");
const { loadDemoData } = require("../demoData");
const { getMeals, getSymptoms } = require("../storage");

beforeEach(() => {
  AsyncStorage.__reset();
});

describe("loadDemoData", () => {
  test("returns a summary with mealCount and symptomCount", async () => {
    const summary = await loadDemoData();
    expect(summary).toEqual({
      mealCount: expect.any(Number),
      symptomCount: expect.any(Number),
    });
    expect(summary.mealCount).toBeGreaterThan(0);
    expect(summary.symptomCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest services/__tests__/demoData.test.js -t "returns a summary"`
Expected: FAIL — `Cannot find module '../demoData'`.

- [ ] **Step 3: Create the empty module**

Create `services/demoData.js`:

```js
import { saveMeal, saveSymptom } from "./storage";

export const loadDemoData = async () => {
  // Filled in by later tasks.
  return { mealCount: 0, symptomCount: 0 };
};
```

- [ ] **Step 4: Run test to verify it now fails on the assertion (not the import)**

Run: `npx jest services/__tests__/demoData.test.js -t "returns a summary"`
Expected: FAIL — `expect(received).toBeGreaterThan(0)`. (Module loads fine; counts are still zero.)

- [ ] **Step 5: Commit**

```bash
git add services/demoData.js services/__tests__/demoData.test.js
git commit -m "feat(demo-data): scaffold loadDemoData module + failing test"
```

---

## Task 2: Build the dataset and persist it

**Files:**
- Modify: `services/demoData.js`

- [ ] **Step 1: Replace the module with the real implementation**

Overwrite `services/demoData.js`:

```js
import { saveMeal, saveSymptom } from "./storage";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

// Anchor everything to "today at the moment of call". Day offsets are negative
// integers — 0 = today, -1 = yesterday, etc.
const at = (now, dayOffset, hour, minute = 0) => {
  const ts = new Date(now);
  ts.setDate(ts.getDate() + dayOffset);
  ts.setHours(hour, minute, 0, 0);
  return ts.getTime();
};

// ---- Meal templates ---------------------------------------------------------
//
// Each entry is { dayOffset, hour, minute, text, extras? } where extras can
// override fields (used by the one scan-result entry).

const buildMealEntries = (now) => {
  const entries = [];

  // Trigger pattern (HIGH): coffee on 10 of the last 14 mornings (skip days -3 and -9
  // and -12 and -13 to leave gaps that look natural).
  const coffeeDays = [-13, -12, -11, -10, -8, -7, -6, -5, -4, -2, -1, 0].slice(0, 10);
  for (const day of coffeeDays) {
    entries.push({
      dayOffset: day,
      hour: 7,
      minute: 45,
      text: "Coffee with milk",
    });
  }

  // Trigger pattern (MEDIUM): tomato pasta / pizza on 3 evenings.
  entries.push({ dayOffset: -11, hour: 19, minute: 30, text: "Spaghetti with tomato sauce" });
  entries.push({ dayOffset: -7, hour: 20, minute: 0, text: "Pepperoni pizza" });
  entries.push({ dayOffset: -2, hour: 19, minute: 45, text: "Tomato basil pasta" });

  // Inconclusive: chocolate ×2, red wine ×2 (one of each followed by symptoms).
  entries.push({ dayOffset: -10, hour: 21, minute: 0, text: "Dark chocolate square" });
  entries.push({ dayOffset: -4, hour: 21, minute: 30, text: "Chocolate brownie" });
  entries.push({ dayOffset: -9, hour: 20, minute: 30, text: "Glass of red wine" });
  entries.push({ dayOffset: -3, hour: 20, minute: 0, text: "Glass of red wine" });

  // Safe foods.
  for (const day of [-13, -10, -7, -3, 0]) {
    entries.push({ dayOffset: day, hour: 8, minute: 30, text: "Oatmeal with banana" });
  }
  for (const day of [-12, -9, -5, -1]) {
    entries.push({ dayOffset: day, hour: 18, minute: 30, text: "Grilled chicken with rice" });
  }
  for (const day of [-11, -6, -2]) {
    entries.push({ dayOffset: day, hour: 8, minute: 0, text: "Scrambled eggs and toast" });
  }
  entries.push({ dayOffset: -8, hour: 15, minute: 0, text: "Banana" });
  entries.push({ dayOffset: -4, hour: 15, minute: 30, text: "Banana" });

  // Time-of-day signal: 2 late-night meals (>9pm) followed by symptoms.
  entries.push({ dayOffset: -6, hour: 22, minute: 15, text: "Cheeseburger and fries" });
  entries.push({ dayOffset: -1, hour: 22, minute: 30, text: "Late-night ramen" });

  // Today's scan result — drives the Scan Results screenshot.
  entries.push({
    dayOffset: 0,
    hour: 8,
    minute: 15,
    text: "Iced coffee, large",
    extras: {
      source: "scan",
      score: 35,
      label: "Caution",
      trafficLight: "amber",
      reasonTags: ["caffeine", "acidic"],
    },
  });

  return entries.map(({ dayOffset, hour, minute, text, extras }) => ({
    text,
    timestamp: at(now, dayOffset, hour, minute),
    ...(extras || {}),
  }));
};

// ---- Symptom templates ------------------------------------------------------

const buildSymptomEntries = (now) => {
  const entries = [];

  // Heartburn after coffee on ~7 of the coffee days, ~90min later.
  const coffeeFollowedByHeartburn = [-13, -11, -10, -8, -6, -4, -1];
  for (const day of coffeeFollowedByHeartburn) {
    entries.push({
      severity: 3,
      symptomTypes: ["heartburn"],
      timestamp: at(now, day, 9, 15),
    });
  }
  // One stronger heartburn after today's iced coffee scan.
  entries.push({
    severity: 4,
    symptomTypes: ["heartburn"],
    timestamp: at(now, 0, 9, 30),
    notes: "after lunch",
  });

  // Symptoms after each tomato meal (~90min later).
  entries.push({
    severity: 3,
    symptomTypes: ["heartburn", "regurgitation"],
    timestamp: at(now, -11, 21, 0),
  });
  entries.push({
    severity: 4,
    symptomTypes: ["heartburn"],
    timestamp: at(now, -7, 21, 30),
    notes: "woke me up",
  });
  entries.push({
    severity: 3,
    symptomTypes: ["regurgitation"],
    timestamp: at(now, -2, 21, 15),
  });

  // Symptom after one chocolate, one wine.
  entries.push({
    severity: 2,
    symptomTypes: ["bloating"],
    timestamp: at(now, -4, 22, 30),
  });
  entries.push({
    severity: 2,
    symptomTypes: ["throat"],
    timestamp: at(now, -9, 22, 0),
  });

  // Symptoms after the two late-night meals.
  entries.push({
    severity: 4,
    symptomTypes: ["heartburn"],
    timestamp: at(now, -6, 23, 45),
  });
  entries.push({
    severity: 3,
    symptomTypes: ["heartburn", "regurgitation"],
    timestamp: at(now, -1, 23, 30),
  });

  return entries;
};

// ---- Public API -------------------------------------------------------------

export const loadDemoData = async () => {
  const now = Date.now();

  const meals = buildMealEntries(now);
  const symptoms = buildSymptomEntries(now);

  for (const meal of meals) {
    await saveMeal(meal);
  }
  for (const symptom of symptoms) {
    await saveSymptom(symptom);
  }

  return { mealCount: meals.length, symptomCount: symptoms.length };
};
```

- [ ] **Step 2: Run the existing test to confirm it now passes**

Run: `npx jest services/__tests__/demoData.test.js -t "returns a summary"`
Expected: PASS.

- [ ] **Step 3: Add the dataset-shape test**

Append to `services/__tests__/demoData.test.js` (inside the existing `describe` block):

```js
test("writes meals and symptoms to storage matching the returned counts", async () => {
  const summary = await loadDemoData();
  const meals = await getMeals();
  const symptoms = await getSymptoms();
  expect(meals).toHaveLength(summary.mealCount);
  expect(symptoms).toHaveLength(summary.symptomCount);
});

test("includes the today scan-result meal with trafficLight + reasonTags", async () => {
  await loadDemoData();
  const meals = await getMeals();
  const scan = meals.find((m) => m.source === "scan");
  expect(scan).toBeDefined();
  expect(scan.trafficLight).toBe("amber");
  expect(scan.label).toBe("Caution");
  expect(scan.reasonTags).toEqual(["caffeine", "acidic"]);
});
```

- [ ] **Step 4: Add the trigger-pattern invariant test**

Append to the same `describe` block:

```js
test("contains the coffee→heartburn pattern (≥7 coffee meals followed by heartburn within 90min)", async () => {
  await loadDemoData();
  const meals = await getMeals();
  const symptoms = await getSymptoms();

  const NINETY_MIN = 90 * 60 * 1000;
  const coffeeMeals = meals.filter((m) => /coffee/i.test(m.text));
  const heartburnSymptoms = symptoms.filter((s) =>
    (s.symptomTypes || []).includes("heartburn")
  );

  const coffeeFollowedByHeartburn = coffeeMeals.filter((meal) =>
    heartburnSymptoms.some((sym) => {
      const delta = sym.timestamp - meal.timestamp;
      return delta > 0 && delta <= NINETY_MIN;
    })
  );

  expect(coffeeFollowedByHeartburn.length).toBeGreaterThanOrEqual(7);
});
```

- [ ] **Step 5: Run all demoData tests**

Run: `npx jest services/__tests__/demoData.test.js`
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add services/demoData.js services/__tests__/demoData.test.js
git commit -m "feat(demo-data): build 14-day mock dataset with trigger patterns"
```

---

## Task 3: Wire the dev-only Settings card

**Files:**
- Modify: `screens/SettingsScreen.js`

This task has no automated test — Settings is a UI screen with auth + RevenueCat dependencies, and the change is a `__DEV__`-gated render. Manual verification at the end.

- [ ] **Step 1: Add the imports**

Edit `screens/SettingsScreen.js`. Update the lucide import block (currently lines 4–7) to include `Sparkles`:

```js
import {
  Bell, Trash2, Info, ChevronRight, LogOut, Moon, CreditCard, FileText, Shield,
  User, Mail, Heart, MessageSquare, Send, X, Sparkles,
} from "lucide-react-native";
```

Add the demoData import on a new line after the existing storage import (currently line 12):

```js
import { loadDemoData } from "../services/demoData";
```

- [ ] **Step 2: Add the handler**

Find `handleClearData` (around line 178). Add the demo-data handler immediately above it:

```js
const handleLoadDemoData = async () => {
  try {
    const { mealCount, symptomCount } = await loadDemoData();
    showToast("Demo data loaded", `${mealCount} meals · ${symptomCount} symptoms`);
  } catch (err) {
    console.warn("Failed to load demo data", err);
    showToast("Failed to load demo data");
  }
};
```

- [ ] **Step 3: Add the card to the Data section**

Find the Data section (around lines 466–493 — the `<Text>Data</Text>` followed by the "Clear All Data" SettingsCard). Insert the dev-only card immediately above the "Clear All Data" card, so the rendered order is: Load demo data → Clear All Data → Start Over.

The new block to insert:

```jsx
{__DEV__ && (
  <SettingsCard
    icon={Sparkles}
    iconColor="#3aa27f"
    label="Load demo data"
    subtitle="Populates app with sample data for screenshots"
    onPress={() =>
      confirmAction(
        "Load demo data?",
        "This adds 14 days of sample meals and symptoms on top of your existing data.",
        handleLoadDemoData
      )
    }
  />
)}
```

- [ ] **Step 4: Run the existing test suite to confirm no regressions**

Run: `npx jest`
Expected: All previously-passing suites still PASS, plus the 4 new demoData tests.

- [ ] **Step 5: Manual verification**

Start the app in dev mode (`npm start`, then open in Expo Go or a dev build). Then:

1. Open Settings → scroll to the Data section.
2. Confirm "Load demo data" card appears with the Sparkles icon and the subtitle.
3. Tap it → confirm dialog appears with the right copy → tap Confirm.
4. Toast appears: "Demo data loaded · N meals · M symptoms".
5. Navigate to Insights — heatmap and trigger list should be populated; Coffee should appear as a top trigger.
6. Navigate to Home — today's coffee scan and a heartburn symptom should be visible.
7. Open the most recent scan/meal — confirm the amber traffic light + "caffeine, acidic" reason tags surface.
8. Open the Doctor PDF / Report — confirm the report is no longer in its empty state.

If anything looks off, fix and re-verify before committing.

- [ ] **Step 6: Commit**

```bash
git add screens/SettingsScreen.js
git commit -m "feat(settings): add __DEV__-gated Load demo data button"
```

---

## Verification checklist (post-implementation)

- [ ] `npx jest` — all suites pass.
- [ ] In a release-style build (`__DEV__ === false`), the "Load demo data" card does not appear in Settings.
- [ ] After tapping Load demo data, Insights / Home / Scan Results / Report all look populated and screenshot-ready.
