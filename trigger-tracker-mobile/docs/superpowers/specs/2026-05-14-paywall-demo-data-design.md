# Demo Data for Paywall Screenshots

**Date:** 2026-05-14
**Status:** Approved design

## Goal

Give Luke a one-tap way to populate the app with realistic mock data so he can take in-app screenshots (Insights heatmap, Home, Scan Results, Doctor PDF) and embed them in the paywall as visual previews of what Pro unlocks.

The current paywall (`screens/PaywallScreen.tsx`) is text-only — benefit bullets, plan cards, and a mascot. There are no visual previews of the actual product. Adding screenshots requires the source app to look populated and convincing first.

## Non-goals

- App Store marketing screenshots (separate workflow).
- Committing fixture screenshot images to the repo.
- A "clear demo data" button (reuse existing Settings → Clear All Data).
- Fake user names, photos, or any PII-shaped content.
- Editing `PaywallScreen.tsx` itself in this spec — that is a follow-up once the screenshots exist.

## Architecture

One new file: **`services/demoData.js`**, exporting a single function:

```js
export const loadDemoData = async () => { ... }
```

It:
1. Generates 14 days of meals and symptoms in memory.
2. Persists each entry by calling the existing `saveMeal` / `saveSymptom` from `services/storage.js` (so entries get real IDs, `createdAt`, and flow through any side effects).
3. Resolves with a summary `{ mealCount, symptomCount }` for the toast.

No new storage keys, no new schema. Demo entries are indistinguishable from real entries — which is the point: every screen that reads meals/symptoms (Insights, Home, Report) lights up automatically.

A `__DEV__`-gated entry point is added to `screens/SettingsScreen.js` in the existing **Data** section (right above "Clear All Data"). Hidden entirely in production builds.

## Mock dataset design

The dataset is hand-shaped so screenshots tell a clear product story. It is not random.

### Meals (~28 entries across 14 days, 1–3 per day)

**Trigger pattern — high confidence (drives top "Likely trigger" card):**
- Coffee, ~10 of 14 mornings (timestamp 7:30–8:30 AM)
- Each followed within 90 minutes by a heartburn symptom on ~7 of those days
- Engine should classify as high-confidence trigger

**Trigger pattern — medium confidence:**
- Tomato pasta or pizza, 3 evenings spread across the 14 days
- Each followed within 2 hours by a moderate symptom
- Engine should classify as medium-confidence

**Inconclusive entries (visible but ambiguous):**
- Chocolate dessert ×2 — one followed by symptom, one not
- Glass of red wine ×2 — one followed by symptom, one not

**Safe foods (drives "Safe foods" view):**
- Oatmeal with banana, 5 mornings — no symptoms within 4h
- Grilled chicken + rice, 4 dinners — no symptoms
- Scrambled eggs + toast, 3 mornings — no symptoms
- Plain banana snack, 2 entries — no symptoms

**Time-of-day signal (heatmap):**
- 2 late-night meals after 9 PM, both followed by symptoms — heatmap should show evening hot zone

**One recent scan result (powers Scan Results screenshot):**
- A coffee scan from "this morning" with these fields populated:
  ```js
  {
    text: "Iced coffee, large",
    source: "scan",
    score: 35,
    label: "Caution",
    trafficLight: "amber",
    reasonTags: ["caffeine", "acidic"],
    timestamp: <today 8:15 AM>,
  }
  ```

### Symptoms (~12 entries across 14 days)

Distribution:
- Heartburn: ~8 entries (severity 3–4) — most common, matches typical GERD profile
- Regurgitation: 2 entries (severity 2–3)
- Bloating: 1 entry (severity 2)
- Sore throat: 1 entry (severity 2)

Notes are mostly empty; 2 entries have a short realistic note ("after lunch", "woke me up").

Severity sticks to 2–4 — no 1s (too mild to log) and no 5s (would dominate visualization).

### Time anchoring

All timestamps are computed relative to `Date.now()` at function-call time. The most recent meal is "this morning" so the Home "today" view is always populated regardless of when Luke loads the data.

## UX

In `SettingsScreen.js`, in the **Data** section, above "Clear All Data":

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

Handler:
```js
const handleLoadDemoData = async () => {
  const { mealCount, symptomCount } = await loadDemoData();
  showToast("Demo data loaded", `${mealCount} meals · ${symptomCount} symptoms`);
};
```

Production builds (`__DEV__ === false`) never see the button.

## Files touched

- **New:** `services/demoData.js` — the dataset and `loadDemoData()` function
- **Edit:** `screens/SettingsScreen.js` — add the dev-only card and handler
- **New:** `services/__tests__/demoData.test.js` — unit test that calls `loadDemoData()` against a mock AsyncStorage and asserts the meals/symptoms counts and one trigger-pattern invariant (e.g. ≥7 coffee meals followed by heartburn within 90min)

## Risks

- **Engine drift:** If `utils/triggerEngine.js` thresholds change, the "high confidence" coffee pattern might stop showing as top trigger. Mitigation: the test asserts the input shape (coffee + heartburn correlation), not the engine's output classification — so the dataset stays semantically correct even if engine behavior shifts.
- **Cumulative entries:** Tapping "Load demo data" twice doubles the dataset. Acceptable — the confirm dialog warns "on top of your existing data," and Clear All Data resets cleanly.
- **Production leakage:** Mitigated by `__DEV__` gate. Verified by the standard React Native bundler dropping the branch in production builds.
