# Log Entry Redesign — LogMeal & LogSymptom

**Date:** 2026-05-10
**Status:** Design approved, pending implementation plan
**Motivation:** App Store review (May 7, 2026, user "Refin67") called the app "helpful but pretty primitive," specifically citing "basic in logging in and entering times etc." The reviewer's "entering times" complaint maps directly to the native iOS `DateTimePicker` and other utilitarian patterns in our log screens.

## Goal

Redesign `LogMealScreen` and `LogSymptomScreen` to be **faster** and **feel premium**, without changing what data is captured.

- **In scope:** UX, interaction, visual polish, component architecture.
- **Out of scope:** Richer data capture (portion sizes, meal types, meal→symptom linking), AI improvements, login flow, overall design-system overhaul.

## Success criteria

- Zero native iOS `DateTimePicker` instances remain in either screen.
- The fast path on LogMeal ("ate this thing, just now") is **≤3 taps**: open screen → tap recent meal or chip → submit.
- The fast path on LogSymptom is **≤3 taps**: open screen → tap severity dot → submit (symptom-type chips and notes optional).
- Analytics shape preserved — all existing dashboards and the 7-day severity chart keep working without migration.
- Both screens visibly share a design language: same header pattern, same time entry, same submit feedback shell.

## Architecture: shared component library

A new `components/log/` directory houses six reusable primitives plus one meal-specific bottom-sheet. Each component is owned by no screen, has a narrow API, and is independently testable.

| Component | Responsibility | Used by |
|---|---|---|
| `LogScreenShell` | Page chrome: header (back, title, icon), scrollable body, sticky submit slot, keyboard avoidance | LogMeal, LogSymptom |
| `TimeEntry` | Displays "Just now ✏️" by default; tap-to-edit reveals preset pills + a "Custom time" row that opens `TimePickerSheet` | LogMeal, LogSymptom |
| `TimePickerSheet` | Bottom-sheet replacement for native datetime picker. Three wheels: day (last 7), hour, minute (5-min increments) | LogMeal, LogSymptom |
| `ChipScroller` | Horizontal scrolling chip row. Three modes via `mode` prop: `single` (radio-style), `multi` (toggleable selected state), `action` (no selection state — each tap fires `onPress` with the chip ID). `selectedIds` and `onToggle` are used in `single`/`multi`; `onPress` is used in `action`. | LogMeal, LogSymptom |
| `SeverityDots` | Five tappable dots, "Mild" / "Severe" labels under positions 1 and 5, haptic on tap | LogSymptom |
| `SubmitFeedback` | Wraps the submit button. Runs `onSubmit`, plays feedback animation per variant, then `onComplete` | LogMeal, LogSymptom |
| `MealLibrarySheet` | Bottom-sheet with categorized meal chip library and search. Returns selected label(s) on dismiss | LogMeal only |

**Design principle.** The shell owns layout, never form state. Each screen owns its own state and passes handlers down. This keeps the primitives reusable across future log types (medication, exercise) without bleeding screen-specific logic into the components.

## LogMealScreen redesign

Top-to-bottom layout:

1. **Header** (via `LogScreenShell`). Back chevron, "Log Meal" title, utensils icon, "What did you eat?" subtitle preserved.
2. **Recent meals row.** Horizontal `ChipScroller` in `action` mode — tapping a chip appends its label to the meal description (comma-separated when the description is non-empty, matching today's quick-add behavior). Sourced from `getRecentMealSuggestions(meals, 10)` — see Data Flow below. Hidden entirely when the user has zero history.
3. **Meal description.** A `TextArea` with a small `minHeight` when empty (~48px, looking like one line) that grows as the user types or appends. Placeholder: "Tap a recent meal or describe what you ate". A pill button labelled "🥗 Browse foods" sits directly below — opens `MealLibrarySheet`.
4. **Time entry.** `TimeEntry` component. Defaults to "Just now". Edit affordance reveals presets (15m / 30m / 1h / 2h / Earlier today) and a "Custom time" row that opens `TimePickerSheet`.
5. **Submit.** Sticky bottom. `SubmitFeedback` with `variant="buddy"` — turtle pop animation, then `navigation.goBack()`.

**Removed vs. today:** the 8 always-visible trigger-food chips (they live in the library now); the always-visible TextArea; the raw `DateTimePicker`.

**Preserved:** free-text input as fallback for unusual meals; multi-meal entries (comma-append behavior when chips are tapped); all existing analytics events (`meal_logged`, `quick_add_used`, `streak_milestone`); the smart-notification sync on submit.

## LogSymptomScreen redesign

Top-to-bottom layout:

1. **Header** (via `LogScreenShell`). Activity icon. Same content as today.
2. **Symptom type chips.** `ChipScroller`, multi-select. Same 9 entries as today (Heartburn, Regurgitation, Bloating, Nausea, Chest Pain, Sore Throat, Stomach Pain, Gas, Other). No content change; new component.
3. **Severity.** `SeverityDots`. Five large tap targets in a row. "Mild" label under dot 1, "Severe" under dot 5. Active dot fills with accent color, others outlined. Light-impact haptic on tap. Replaces the slider + Mild/Moderate/Severe tri-label row.
4. **Time entry.** Same `TimeEntry` component as LogMeal. Behavior identical.
5. **Notes.** Compact `TextArea`, grows on focus. Optional. Unchanged.
6. **Submit.** Sticky bottom. `SubmitFeedback` with `variant="checkmark"` — animated check + haptic, ~500ms, then `goBack()`. *No buddy reaction* — a celebratory animation after a "I feel bad" log is tone-deaf.

**Removed:** severity slider, the "Intensity" card wrapper, the redundant Mild/Moderate/Severe row.

**Preserved:** the persisted `severity` integer (still 1–5, just sourced from dots instead of slider — no data migration needed); time preset behavior; the `time_preset` analytics field; multi-symptom selection; optional notes; the `saveSymptom` payload shape; smart-notification sync.

## TimePickerSheet — replacing the native picker

This component carries the most weight in addressing the reviewer's specific complaint.

**Behavior:**
- Bottom-sheet, ~75% screen height, slides up with a translucent backdrop. Tap backdrop or "Cancel" to dismiss without applying.
- Three vertically scrolling wheel columns: **Day** (Today, Yesterday, 2 days ago, 3 days ago, 4 days ago, 5 days ago, 6 days ago), **Hour** (12-hour with AM/PM context-aware), **Minute** (00, 05, 10, ... 55).
- A "Today, 2:15 PM" preview line above the wheels updates live as the user spins.
- Footer: secondary "Cancel" button + primary "Set time" button.
- Selection-impact haptic on each wheel detent.

**Implementation:**
- Library: `@quidone/react-native-wheel-picker`. Pure JS, no native module, actively maintained as of spec date. Verify health at implementation time.
- Fallback if library is unhealthy: build snap-scroll `FlatList` per column. Higher effort, full control.

**Rationale:**
- **Wheel over inline scrollers:** wheels are the iOS interaction users instinctively expect for time. We are replacing the native *component*, not the native *interaction*.
- **Bottom-sheet over inline wheels:** keeps the main screen short and focused on the primary action.
- **5-minute increments:** users do not remember meal times to the minute, and downstream analytics (severity correlation windows) do not benefit from minute precision.
- **No future times:** logging a meal you have not eaten yet is almost always a mistake. Easy to enable later if a real use case appears.
- **Last 7 days only:** GERD logging is near-real-time; backfilling beyond a week is rare and can be deferred to a "history editor" feature outside this redesign.

## SubmitFeedback — the polish moment

Single component, two variants, one contract: receive an `async onSubmit`, run it, play the appropriate animation, then call `onComplete`.

**`variant="checkmark"`** (LogSymptom)
- Tap → medium-impact haptic.
- Button content swaps to an animated SVG checkmark that draws over ~200ms.
- Hold ~300ms after the draw completes, then `onComplete()` fires.
- Total budget: ~500ms.

**`variant="buddy"`** (LogMeal)
- Tap → medium-impact haptic.
- A small turtle sprite (~80×80) pops up from behind the button with a quick scale-and-bounce animation and a 💚 particle that drifts up and fades.
- ~600ms total, then `onComplete()`.

**Implementation of the buddy animation, v1:** static turtle PNG + Reanimated scale/translate + opacity tween + a single SVG heart particle. Lottie is *not* required for v1; the upgrade path is clear if we want a richer animation later.

**Accessibility:** if the OS reports `reducedMotion`, both variants degrade to *haptic + instant dismiss*. No animation, no delay. The toast still fires.

**Toast handling:** both screens continue to fire their existing success toast via `showToast`. Toast appears as the screen dismisses and persists on Home. Unchanged from today.

## Meal library — the full chip set

`MealLibrarySheet` opens with five horizontal-scrolling category tabs and a search field at the top. Chips are **multi-select** — the user can tap multiple items across categories before dismissing. A sticky "Done (N)" button at the bottom of the sheet (disabled at N=0) closes the sheet and appends all selected labels to the description, comma-separated, matching current quick-add behavior. Cancel discards the selection.

**Breakfast** (10)
- Coffee, Tea, Oatmeal, Eggs, Toast, Bagel, Cereal, Yogurt, Pancakes, Bacon

**Lunch** (10)
- Sandwich, Salad, Soup, Burrito, Wrap, Sushi, Pizza slice, Burger, Pasta salad, Leftovers

**Dinner** (12)
- Pasta with tomato sauce, Pizza, Grilled chicken, Steak, Fish, Rice and beans, Stir fry, Curry, Roast vegetables, Tacos, Mac and cheese, Spicy food

**Drinks** (10)
- Water, Coffee, Tea, Soda, Beer, Wine, Orange juice, Milk, Smoothie, Sparkling water

**Snacks** (10)
- Chocolate, Chips, Crackers, Cheese, Nuts, Fruit, Citrus fruit, Ice cream, Popcorn, Cookies

**Triggers section visible as a separate tab? No.** Known triggers (citrus, chocolate, spicy, fried, onion/garlic, tomato sauce) are placed inside their natural category. Surfacing them as "triggers" risks biasing the user's self-reporting and overlaps with the existing AI insights feature.

## Data flow and storage

**Storage schema:** unchanged. `saveMeal` and `saveSymptom` receive identical payload shapes. The 7-day severity chart, symptom-free streak, meal history, and all derived reports continue to work without migration.

**New helper:** `getRecentMealSuggestions(meals, limit = 10)` in `services/storage.js`.

- Take last 30 meals (most recent first).
- Normalize each `text` (trim, lowercase, collapse internal whitespace).
- Dedupe by normalized form, keeping the most-recent occurrence's original casing.
- Return top `limit` original-cased strings.
- Pure function — easy to unit test.

**No network:** all logging remains local-only via `AsyncStorage`. No new backend coupling.

## Analytics

**Preserved unchanged:**
- `meal_logged` — with `has_quick_add`, `text_length`, `streak_length`
- `symptom_logged` — with `severity`, `symptom_types`, `has_notes`, `time_preset`
- `quick_add_used` — fires when a recent-meal chip or library chip is tapped
- `streak_milestone`

**New fields and events:**
- `meal_logged.source` — `recent` | `library` | `freetext` | `mixed`. Validates whether new components are getting used.
- `symptom_logged.severity_input` — `dots`. Useful if a future A/B reintroduces the slider.
- `time_picker_opened` (new event) — fires when `TimePickerSheet` is opened. Counts how often users override "Just now," validating the "default to now" design choice.

## Testing

**Component-level (Jest + React Native Testing Library):**
- `SeverityDots` — renders 5 dots, taps update value, calls `onChange`, haptic mocked.
- `TimeEntry` — defaults to "Just now"; edit reveals presets; preset tap updates value; "Custom time" opens sheet (sheet itself is dependency-injected for the test).
- `TimePickerSheet` — wheels render with correct day range; "Set time" returns a composed `Date`; cancel returns nothing; no future times are selectable.
- `ChipScroller` — renders chips; `single`, `multi`, and `action` modes all behave correctly; `onToggle` fires in single/multi modes, `onPress` fires in action mode.
- `MealLibrarySheet` — category filter works, search filter works, multi-select accumulates choices across categories, "Done (N)" reflects count, dismiss via Done returns all selected labels, dismiss via Cancel returns nothing.
- `SubmitFeedback` — both variants invoke `onSubmit` then `onComplete`; in `reducedMotion` mode, the animation phase is skipped.
- `getRecentMealSuggestions` — dedupes by normalized text, respects the limit, handles the empty-history case.

**Screen-level:**
- `LogMealScreen` — recent-meals row hidden when history is empty, shown when it exists; tapping a recent meal fills the description; library tap appends comma-separated (matches today's behavior); submit calls `saveMeal` with the correct payload and fires `meal_logged` with a `source` field; navigation.goBack on completion.
- `LogSymptomScreen` — chips multi-select correctly; dots set severity; the payload to `saveSymptom` is unchanged from today; all existing analytics fields still fire.

**Manual / device verification:**
- Reduced Motion accessibility setting kills the submit animations on both screens.
- Haptics fire on a physical device (Jest only mocks them).
- Buddy animation does not exceed 800ms on a low-end Android.
- Wheel picker on a real iPhone *feels* like the native one. This is the bar the project has to clear.

**Out of scope for automated tests:** the exact pixel position of the buddy sprite, the easing curve of the checkmark draw — these are visual judgment calls, not unit-testable.

## Open questions for implementation phase

- Confirm `@quidone/react-native-wheel-picker` is the right library at implementation time (or pick a replacement / fallback to FlatList wheels).
- Source the static turtle sprite for the buddy animation — likely reuse the existing accessory-system turtle asset.
- Decide whether the "Browse foods" pill on LogMeal should show an icon, a count, or stay text-only.

## Non-goals (explicit, to prevent scope creep)

- **No** richer data capture (portion, meal type, meal→symptom linking).
- **No** AI inference at log time.
- **No** redesign of `HomeScreen`, `InsightsScreen`, `ReportScreen`, login, or paywall.
- **No** changes to the persisted data schema.
- **No** new backend endpoints.
