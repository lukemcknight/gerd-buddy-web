# Log Entry Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `LogMealScreen` and `LogSymptomScreen` to feel faster and more premium by introducing a shared `components/log/` primitives library, retiring the native iOS `DateTimePicker`, replacing the severity slider with tappable dots, and adding variant-aware submit feedback. Storage schema and existing analytics shape are preserved.

**Architecture:** Seven shared primitives (`LogScreenShell`, `TimeEntry`, `TimePickerSheet`, `ChipScroller`, `SeverityDots`, `SubmitFeedback`, `MealLibrarySheet`) live under `components/log/`. Each is independently testable. The two screens compose these primitives but own their own form state. No persisted-data changes.

**Tech Stack:** React Native 0.81, Expo SDK 54, React 19, NativeWind 4 (Tailwind classes via `cn` helper), `react-native-reanimated` v4, `react-native-svg`, `expo-haptics`, `@quidone/react-native-wheel-picker` (new), Jest (Node environment, source-string component testing — no testing-library).

**Spec:** `docs/superpowers/specs/2026-05-10-log-entry-redesign-design.md`

**Test conventions:** This codebase uses Jest with `testEnvironment: 'node'` and *no* `@testing-library/react-native`. Component tests assert on **source text** (`fs.readFileSync(...)` then `expect(source).toContain(...)`). Pure helpers use normal unit tests. Both patterns appear in this plan.

---

## Task 1: `getRecentMealSuggestions` helper

**Files:**
- Modify: `services/storage.js` (add new export, around the existing `getMeals` block near line 38)
- Create: `services/__tests__/storage.recent-meals.test.js`

- [ ] **Step 1: Write the failing test**

Create `services/__tests__/storage.recent-meals.test.js`:

```js
const { getRecentMealSuggestions } = require('../storage');

describe('getRecentMealSuggestions', () => {
  const meal = (text, ts) => ({ text, timestamp: ts });

  test('returns empty array for empty history', () => {
    expect(getRecentMealSuggestions([])).toEqual([]);
  });

  test('returns most-recent first', () => {
    const meals = [
      meal('coffee', 1000),
      meal('toast', 2000),
      meal('eggs', 3000),
    ];
    expect(getRecentMealSuggestions(meals)).toEqual(['eggs', 'toast', 'coffee']);
  });

  test('dedupes by normalized text, keeping most recent casing', () => {
    const meals = [
      meal('Coffee', 1000),
      meal('coffee', 2000),
      meal('  COFFEE ', 3000),
    ];
    expect(getRecentMealSuggestions(meals)).toEqual(['COFFEE']);
  });

  test('respects limit', () => {
    const meals = Array.from({ length: 15 }, (_, i) =>
      meal(`meal-${i}`, i * 1000)
    );
    expect(getRecentMealSuggestions(meals, 3)).toEqual(['meal-14', 'meal-13', 'meal-12']);
  });

  test('only scans the most recent 30 meals', () => {
    const meals = Array.from({ length: 50 }, (_, i) =>
      meal('old', i * 1000)
    );
    meals.push(meal('new', 100000));
    const result = getRecentMealSuggestions(meals, 10);
    expect(result).toEqual(['new', 'old']);
  });

  test('default limit is 10', () => {
    const meals = Array.from({ length: 20 }, (_, i) =>
      meal(`m-${i}`, i * 1000)
    );
    expect(getRecentMealSuggestions(meals)).toHaveLength(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest services/__tests__/storage.recent-meals.test.js`
Expected: FAIL — `getRecentMealSuggestions is not a function`.

- [ ] **Step 3: Implement the helper**

Edit `services/storage.js`. Find the `export const getMeals = async () => ...` line (around line 38) and add this export immediately below it:

```js
export const getRecentMealSuggestions = (meals, limit = 10) => {
  if (!Array.isArray(meals) || meals.length === 0) return [];
  const recent = [...meals]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 30);
  const seen = new Map();
  for (const m of recent) {
    const raw = (m.text || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) seen.set(key, raw);
    if (seen.size >= limit) break;
  }
  return Array.from(seen.values());
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest services/__tests__/storage.recent-meals.test.js`
Expected: PASS — all six cases green.

- [ ] **Step 5: Commit**

```bash
git add services/storage.js services/__tests__/storage.recent-meals.test.js
git commit -m "feat(storage): add getRecentMealSuggestions helper for log entry redesign"
```

---

## Task 2: `ChipScroller` component

**Files:**
- Create: `components/log/ChipScroller.js`
- Create: `components/__tests__/log/ChipScroller.test.js`

The `ChipScroller` supports three modes: `single`, `multi`, `action`. Single/multi use `selectedIds` + `onToggle`. Action mode uses `onPress`. Layout is horizontal-scroll by default; `wrap` prop switches to flex-wrap rows.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/ChipScroller.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('ChipScroller', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'ChipScroller.js'),
      'utf-8'
    );
  });

  test('exports ChipScroller as default', () => {
    expect(source).toMatch(/export default ChipScroller/);
  });

  test('accepts chips array, mode, onToggle, onPress, selectedIds', () => {
    expect(source).toContain('chips');
    expect(source).toContain('mode');
    expect(source).toContain('onToggle');
    expect(source).toContain('onPress');
    expect(source).toContain('selectedIds');
  });

  test('handles all three modes', () => {
    expect(source).toContain('"single"');
    expect(source).toContain('"multi"');
    expect(source).toContain('"action"');
  });

  test('supports wrap layout', () => {
    expect(source).toContain('wrap');
    expect(source).toContain('flex-wrap');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/ChipScroller.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/ChipScroller.js`:

```js
import { ScrollView, View, Pressable, Text } from "react-native";
import { cn } from "../../utils/style";

export const ChipScroller = ({
  chips = [],
  mode = "single",
  selectedIds = [],
  onToggle,
  onPress,
  wrap = false,
  chipClassName = "",
  selectedChipClassName = "bg-accent",
  textClassName = "text-foreground",
  selectedTextClassName = "text-white",
}) => {
  const renderChip = (chip) => {
    const isSelected =
      (mode === "single" || mode === "multi") && selectedIds.includes(chip.id);
    const handlePress = () => {
      if (mode === "action") {
        onPress?.(chip.id, chip);
        return;
      }
      onToggle?.(chip.id, chip);
    };
    return (
      <Pressable
        key={chip.id}
        onPress={handlePress}
        className={cn(
          "px-4 py-2.5 rounded-full",
          isSelected
            ? selectedChipClassName
            : "bg-card border border-border",
          chipClassName
        )}
      >
        <Text
          className={cn(
            "text-sm font-semibold",
            isSelected ? selectedTextClassName : textClassName
          )}
        >
          {chip.label}
        </Text>
      </Pressable>
    );
  };

  if (wrap) {
    return (
      <View className="flex-row flex-wrap gap-2">{chips.map(renderChip)}</View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      {chips.map(renderChip)}
    </ScrollView>
  );
};

export default ChipScroller;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/ChipScroller.test.js`
Expected: PASS — four assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/ChipScroller.js components/__tests__/log/ChipScroller.test.js
git commit -m "feat(log): add ChipScroller primitive with single/multi/action modes"
```

---

## Task 3: `SeverityDots` component

**Files:**
- Create: `components/log/SeverityDots.js`
- Create: `components/__tests__/log/SeverityDots.test.js`

Five tappable dots. Active dot uses accent color, others outlined. Haptic light-impact on tap. "Mild" label under dot 1, "Severe" under dot 5.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/SeverityDots.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('SeverityDots', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'SeverityDots.js'),
      'utf-8'
    );
  });

  test('exports SeverityDots as default', () => {
    expect(source).toMatch(/export default SeverityDots/);
  });

  test('renders 5 dots via array of 1..5', () => {
    expect(source).toContain('[1, 2, 3, 4, 5]');
  });

  test('fires onChange when a dot is tapped', () => {
    expect(source).toContain('onChange?.(');
  });

  test('uses expo-haptics on tap', () => {
    expect(source).toContain("from 'expo-haptics'");
    expect(source).toContain('impactAsync');
  });

  test('renders Mild and Severe labels', () => {
    expect(source).toContain('Mild');
    expect(source).toContain('Severe');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/SeverityDots.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/SeverityDots.js`:

```js
import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { cn } from "../../utils/style";

export const SeverityDots = ({ value = 0, onChange, className = "" }) => {
  const handleTap = (next) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange?.(next);
  };

  return (
    <View className={cn("gap-2", className)}>
      <View className="flex-row items-center justify-between">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              onPress={() => handleTap(n)}
              hitSlop={12}
              className={cn(
                "w-12 h-12 rounded-full items-center justify-center",
                active
                  ? "bg-accent"
                  : "bg-card border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-base font-bold",
                  active ? "text-white" : "text-muted-foreground"
                )}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between px-2">
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
          Mild
        </Text>
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
          Severe
        </Text>
      </View>
    </View>
  );
};

export default SeverityDots;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/SeverityDots.test.js`
Expected: PASS — five assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/SeverityDots.js components/__tests__/log/SeverityDots.test.js
git commit -m "feat(log): add SeverityDots component (replaces slider on LogSymptom)"
```

---

## Task 4: Install wheel picker dependency

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Verify the library is healthy**

Run: `npm view @quidone/react-native-wheel-picker time version`
Expected: A recent "modified" date (within last 12 months) and a `^2.x` or `^3.x` semver.

If the library appears stale or unmaintained, **stop** and switch to the fallback path: a custom `FlatList`-based wheel inside `TimePickerSheet`. Document that decision at the top of Task 5 and continue without installing this package.

- [ ] **Step 2: Install the package**

Run: `npm install @quidone/react-native-wheel-picker`
Expected: Adds `"@quidone/react-native-wheel-picker": "^X.Y.Z"` under `dependencies` in `package.json`.

- [ ] **Step 3: Sanity check — does the import resolve?**

Create a scratch file or run inline:

```bash
node -e "console.log(Object.keys(require('@quidone/react-native-wheel-picker')))"
```

Expected: prints an object containing `WheelPicker` (or similar default export). If the export shape differs, note the actual API for use in Task 5.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @quidone/react-native-wheel-picker for custom time picker"
```

---

## Task 5: `TimePickerSheet` component

**Files:**
- Create: `components/log/TimePickerSheet.js`
- Create: `components/__tests__/log/TimePickerSheet.test.js`

Bottom-sheet with three wheel columns (day / hour / minute). 5-minute increments. Last 7 days. No future times. "Cancel" / "Set time" footer.

**Note:** This task assumes Task 4 confirmed `@quidone/react-native-wheel-picker` exposes a default `WheelPicker` taking `data`, `value`, `onValueChanged`. Adjust the import and prop names if the verification step revealed a different API. If the fallback path was chosen, replace `WheelPicker` usage with a `FlatList` whose `snapToInterval` equals the item height and whose center-most visible item is the selected value.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/TimePickerSheet.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('TimePickerSheet', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'TimePickerSheet.js'),
      'utf-8'
    );
  });

  test('exports TimePickerSheet as default', () => {
    expect(source).toMatch(/export default TimePickerSheet/);
  });

  test('builds last 7 days only (no future)', () => {
    expect(source).toContain('7');
    expect(source).toMatch(/Today|Yesterday/);
  });

  test('minute options are 5-minute steps', () => {
    expect(source).toMatch(/i \* 5|step.*5/);
  });

  test('exposes visible, initialDate, onCancel, onConfirm', () => {
    expect(source).toContain('visible');
    expect(source).toContain('initialDate');
    expect(source).toContain('onCancel');
    expect(source).toContain('onConfirm');
  });

  test('haptic on wheel detent', () => {
    expect(source).toContain("from 'expo-haptics'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/TimePickerSheet.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/TimePickerSheet.js`:

```js
import { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import * as Haptics from "expo-haptics";
import Button from "../Button";

const PAD = (n) => String(n).padStart(2, "0");

const buildDayOptions = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Yesterday"
        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return { value: i, label };
  });
};

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: PAD(h),
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  value: i * 5,
  label: PAD(i * 5),
}));

const toComposed = (daysAgo, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const previewLabel = (d) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const TimePickerSheet = ({
  visible,
  initialDate,
  onCancel,
  onConfirm,
}) => {
  const days = useMemo(buildDayOptions, [visible]);

  const initial = useMemo(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAgo = Math.max(
      0,
      Math.min(6, Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000))
    );
    const minute = Math.round(d.getMinutes() / 5) * 5;
    return { daysAgo, hour: d.getHours(), minute: minute === 60 ? 55 : minute };
  }, [initialDate, visible]);

  const [daysAgo, setDaysAgo] = useState(initial.daysAgo);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  useEffect(() => {
    if (visible) {
      setDaysAgo(initial.daysAgo);
      setHour(initial.hour);
      setMinute(initial.minute);
    }
  }, [visible]);

  const tick = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const composed = toComposed(daysAgo, hour, minute);
  const now = new Date();
  const isFuture = composed > now;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCancel} />
      <View className="bg-background rounded-t-3xl px-5 pt-4 pb-8">
        <View className="self-center w-10 h-1.5 rounded-full bg-muted mb-4" />
        <Text className="text-center text-sm text-muted-foreground mb-2">
          {previewLabel(composed)}
          {isFuture ? "  ·  using current time" : ""}
        </Text>
        <View className="flex-row justify-between gap-2 mb-6">
          <View className="flex-1">
            <WheelPicker
              data={days}
              value={daysAgo}
              onValueChanged={({ item }) => {
                tick();
                setDaysAgo(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
          <View className="w-16">
            <WheelPicker
              data={HOURS}
              value={hour}
              onValueChanged={({ item }) => {
                tick();
                setHour(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
          <View className="w-16">
            <WheelPicker
              data={MINUTES}
              value={minute}
              onValueChanged={({ item }) => {
                tick();
                setMinute(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onPress={() => onConfirm?.(isFuture ? now : composed)}
            className="flex-1"
          >
            Set time
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default TimePickerSheet;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/TimePickerSheet.test.js`
Expected: PASS — five assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/TimePickerSheet.js components/__tests__/log/TimePickerSheet.test.js
git commit -m "feat(log): add TimePickerSheet — wheel-based bottom-sheet time picker"
```

---

## Task 6: `TimeEntry` component

**Files:**
- Create: `components/log/TimeEntry.js`
- Create: `components/__tests__/log/TimeEntry.test.js`

Default state shows "Just now ✏️". Tapping reveals preset pills (15m / 30m / 1h / 2h / Earlier today) and a "Custom time" row that opens `TimePickerSheet`. Tracks `value` (a `Date`) and `presetId` (string), notifies parent via `onChange(date, presetId)`.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/TimeEntry.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('TimeEntry', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'TimeEntry.js'),
      'utf-8'
    );
  });

  test('exports TimeEntry as default', () => {
    expect(source).toMatch(/export default TimeEntry/);
  });

  test('default presetId is "now"', () => {
    expect(source).toMatch(/presetId\s*=\s*['"]now['"]/);
  });

  test('lists the five time presets', () => {
    expect(source).toContain('"15m"');
    expect(source).toContain('"30m"');
    expect(source).toContain('"1h"');
    expect(source).toContain('"2h"');
    expect(source).toContain('"earlier"');
  });

  test('opens TimePickerSheet on custom press', () => {
    expect(source).toContain('TimePickerSheet');
    expect(source).toContain('setSheetOpen');
  });

  test('fires onChange with date and presetId', () => {
    expect(source).toContain('onChange?.(');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/TimeEntry.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/TimeEntry.js`:

```js
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Clock, ChevronRight, Pencil } from "lucide-react-native";
import { cn } from "../../utils/style";
import TimePickerSheet from "./TimePickerSheet";

const PRESETS = [
  { id: "15m", label: "15m ago", minutes: 15 },
  { id: "30m", label: "30m ago", minutes: 30 },
  { id: "1h", label: "1h ago", minutes: 60 },
  { id: "2h", label: "2h ago", minutes: 120 },
  { id: "earlier", label: "Earlier today", minutes: null },
];

const previewLabel = (d) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const TimeEntry = ({
  value,
  presetId = "now",
  onChange,
  label = "When?",
}) => {
  const [editing, setEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const setNow = () => {
    onChange?.(new Date(), "now");
  };

  const applyPreset = (preset) => {
    if (preset.id === "earlier") {
      setSheetOpen(true);
      return;
    }
    const next = new Date();
    next.setMinutes(next.getMinutes() - preset.minutes);
    onChange?.(next, preset.id);
  };

  if (!editing) {
    return (
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Pressable
          onPress={() => setEditing(true)}
          className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-card border border-border"
        >
          <Text className="text-foreground font-medium">
            {presetId === "now" ? "Just now" : previewLabel(value || new Date())}
          </Text>
          <View className="flex-row items-center gap-1">
            <Pencil size={14} color="#5f6f74" />
            <Text className="text-xs text-muted-foreground">edit</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Pressable onPress={() => setEditing(false)} hitSlop={8}>
          <Text className="text-xs text-muted-foreground">Done</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => {
            setNow();
          }}
          className={cn(
            "px-4 py-2 rounded-full",
            presetId === "now" ? "bg-primary" : "bg-card border border-border"
          )}
        >
          <Text
            className={cn(
              "text-sm font-semibold",
              presetId === "now" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Just now
          </Text>
        </Pressable>
        {PRESETS.map((preset) => {
          const active = presetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => applyPreset(preset)}
              className={cn(
                "px-4 py-2 rounded-full",
                active ? "bg-primary" : "bg-card border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  active ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setSheetOpen(true)}
          className={cn(
            "px-4 py-2 rounded-full flex-row items-center gap-1",
            presetId === "custom" ? "bg-primary" : "bg-card border border-border"
          )}
        >
          <Text
            className={cn(
              "text-sm font-semibold",
              presetId === "custom" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Custom
          </Text>
          <ChevronRight
            size={14}
            color={presetId === "custom" ? "white" : "#5f6f74"}
          />
        </Pressable>
      </View>
      <TimePickerSheet
        visible={sheetOpen}
        initialDate={value || new Date()}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(d) => {
          setSheetOpen(false);
          onChange?.(d, "custom");
        }}
      />
    </View>
  );
};

export default TimeEntry;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/TimeEntry.test.js`
Expected: PASS — five assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/TimeEntry.js components/__tests__/log/TimeEntry.test.js
git commit -m "feat(log): add TimeEntry — default-to-now with preset pills and custom sheet"
```

---

## Task 7: `MealLibrarySheet` component

**Files:**
- Create: `components/log/MealLibrarySheet.js`
- Create: `components/__tests__/log/MealLibrarySheet.test.js`

Bottom-sheet with five categories, a search field, multi-select chips, and a sticky "Done (N)" button. Returns selected labels.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/MealLibrarySheet.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('MealLibrarySheet', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'MealLibrarySheet.js'),
      'utf-8'
    );
  });

  test('exports MealLibrarySheet as default', () => {
    expect(source).toMatch(/export default MealLibrarySheet/);
  });

  test('has all five categories', () => {
    ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Snacks'].forEach((cat) => {
      expect(source).toContain(cat);
    });
  });

  test('has search input', () => {
    expect(source).toContain('search');
  });

  test('Done button reflects count', () => {
    expect(source).toContain('Done');
    expect(source).toMatch(/selected\.length|selected\.size/);
  });

  test('exposes visible, onCancel, onConfirm', () => {
    expect(source).toContain('visible');
    expect(source).toContain('onCancel');
    expect(source).toContain('onConfirm');
  });

  test('includes Coffee, Pizza, Water as sample items', () => {
    expect(source).toContain('Coffee');
    expect(source).toContain('Pizza');
    expect(source).toContain('Water');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/MealLibrarySheet.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/MealLibrarySheet.js`:

```js
import { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { cn } from "../../utils/style";
import Button from "../Button";
import ChipScroller from "./ChipScroller";

const LIBRARY = {
  Breakfast: ["Coffee", "Tea", "Oatmeal", "Eggs", "Toast", "Bagel", "Cereal", "Yogurt", "Pancakes", "Bacon"],
  Lunch: ["Sandwich", "Salad", "Soup", "Burrito", "Wrap", "Sushi", "Pizza slice", "Burger", "Pasta salad", "Leftovers"],
  Dinner: ["Pasta with tomato sauce", "Pizza", "Grilled chicken", "Steak", "Fish", "Rice and beans", "Stir fry", "Curry", "Roast vegetables", "Tacos", "Mac and cheese", "Spicy food"],
  Drinks: ["Water", "Coffee", "Tea", "Soda", "Beer", "Wine", "Orange juice", "Milk", "Smoothie", "Sparkling water"],
  Snacks: ["Chocolate", "Chips", "Crackers", "Cheese", "Nuts", "Fruit", "Citrus fruit", "Ice cream", "Popcorn", "Cookies"],
};

const CATEGORIES = Object.keys(LIBRARY);

const toChips = (labels) =>
  labels.map((label) => ({ id: label, label }));

export const MealLibrarySheet = ({ visible, onCancel, onConfirm }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) {
      setCategory(CATEGORIES[0]);
      setSearch("");
      setSelected([]);
    }
  }, [visible]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LIBRARY[category];
    return Object.values(LIBRARY)
      .flat()
      .filter((label) => label.toLowerCase().includes(q))
      .filter((label, i, arr) => arr.indexOf(label) === i);
  }, [category, search]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCancel} />
      <View className="bg-background rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: "85%" }}>
        <View className="self-center w-10 h-1.5 rounded-full bg-muted mb-4" />
        <Text className="text-lg font-bold text-foreground mb-3">Browse foods</Text>

        <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border mb-3">
          <Search size={16} color="#5f6f74" />
          <TextInput
            placeholder="Search foods"
            placeholderTextColor="#5f6f74"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-foreground"
          />
        </View>

        {!search && (
          <View className="mb-3">
            <ChipScroller
              chips={CATEGORIES.map((c) => ({ id: c, label: c }))}
              mode="single"
              selectedIds={[category]}
              onToggle={(id) => setCategory(id)}
            />
          </View>
        )}

        <ScrollView className="mb-4" style={{ maxHeight: 320 }}>
          <View className="flex-row flex-wrap gap-2">
            {items.map((label) => {
              const active = selected.includes(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => toggle(label)}
                  className={cn(
                    "px-4 py-2.5 rounded-full",
                    active ? "bg-accent" : "bg-card border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      active ? "text-white" : "text-foreground"
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onPress={() => onConfirm?.(selected)}
            className="flex-1"
          >
            {selected.length === 0 ? "Done" : `Done (${selected.length})`}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default MealLibrarySheet;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/MealLibrarySheet.test.js`
Expected: PASS — six assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/MealLibrarySheet.js components/__tests__/log/MealLibrarySheet.test.js
git commit -m "feat(log): add MealLibrarySheet — categorized food picker with search"
```

---

## Task 8: `SubmitFeedback` — both variants

**Files:**
- Create: `components/log/SubmitFeedback.js`
- Create: `components/__tests__/log/SubmitFeedback.test.js`

The `SubmitFeedback` component wraps the submit button. It owns the animation and haptic. Two variants share the same Reanimated infrastructure, so they ship together: `checkmark` (LogSymptom) and `buddy` (LogMeal). Both respect `reducedMotion` from `AccessibilityInfo`.

- [ ] **Step 1: Write the failing test (both variants)**

Create `components/__tests__/log/SubmitFeedback.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('SubmitFeedback', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'SubmitFeedback.js'),
      'utf-8'
    );
  });

  test('exports SubmitFeedback as default', () => {
    expect(source).toMatch(/export default SubmitFeedback/);
  });

  test('accepts variant prop with checkmark and buddy', () => {
    expect(source).toContain('"checkmark"');
    expect(source).toContain('"buddy"');
  });

  test('checks reducedMotion via AccessibilityInfo', () => {
    expect(source).toContain('AccessibilityInfo');
    expect(source).toContain('isReduceMotionEnabled');
  });

  test('uses expo-haptics on submit', () => {
    expect(source).toContain("from 'expo-haptics'");
    expect(source).toContain('notificationAsync');
  });

  test('renders an animated checkmark via react-native-svg', () => {
    expect(source).toContain('react-native-svg');
    expect(source).toContain('strokeDashoffset');
  });

  test('renders buddy turtle and heart particle (variant="buddy")', () => {
    expect(source).toContain('turtle_happy');
    expect(source).toContain('heart');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/SubmitFeedback.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component with both variants**

Create `components/log/SubmitFeedback.js`:

```js
import { useEffect, useState } from "react";
import { AccessibilityInfo, Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "../../utils/style";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const turtleHappy = require("../../assets/mascot/turtle_happy.png");
const heart = "❤️"; // simple emoji particle for v1

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      (v) => setReduced(Boolean(v))
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
};

const CHECK_LENGTH = 36;

const CheckmarkOverlay = ({ play, onDone }) => {
  const dashOffset = useSharedValue(CHECK_LENGTH);
  useEffect(() => {
    if (play) {
      dashOffset.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
        withDelay(
          300,
          withTiming(0, { duration: 1 }, () => runOnJS(onDone)())
        )
      );
    }
  }, [play]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <AnimatedPath
        d="M4 12 L10 18 L20 6"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={props}
      />
    </Svg>
  );
};

const BuddyOverlay = ({ play, onDone }) => {
  const scale = useSharedValue(0);
  const heartY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  useEffect(() => {
    if (play) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(200, withTiming(0, { duration: 250 }))
      );
      heartY.value = withTiming(-40, { duration: 500, easing: Easing.out(Easing.quad) }, () =>
        runOnJS(onDone)()
      );
    }
  }, [play]);
  const turtleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heartY.value }],
    opacity: heartOpacity.value,
  }));
  return (
    <View pointerEvents="none" className="absolute -top-20 left-0 right-0 items-center">
      <Animated.View style={turtleStyle}>
        <Image source={turtleHappy} style={{ width: 80, height: 80 }} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[{ fontSize: 24, position: "absolute", top: 0 }, heartStyle]}>
        {heart}
      </Animated.Text>
    </View>
  );
};

export const SubmitFeedback = ({
  label,
  variant = "checkmark",
  onSubmit,
  onComplete,
  disabled = false,
  className = "",
}) => {
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  const finish = () => {
    setPlaying(false);
    onComplete?.();
  };

  const handlePress = async () => {
    if (disabled || playing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await onSubmit?.();
    } catch (e) {
      return;
    }
    if (reducedMotion) {
      onComplete?.();
      return;
    }
    setPlaying(true);
  };

  return (
    <View className="relative">
      {playing && variant === "buddy" && <BuddyOverlay play onDone={finish} />}
      <Pressable
        onPress={handlePress}
        disabled={disabled || playing}
        className={cn(
          "flex-row items-center justify-center rounded-xl px-4 py-4 bg-primary",
          disabled && "opacity-60",
          className
        )}
      >
        {playing && variant === "checkmark" ? (
          <CheckmarkOverlay play onDone={finish} />
        ) : (
          <Text className="text-primary-foreground font-semibold text-base">{label}</Text>
        )}
      </Pressable>
    </View>
  );
};

export default SubmitFeedback;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/SubmitFeedback.test.js`
Expected: PASS — six assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/SubmitFeedback.js components/__tests__/log/SubmitFeedback.test.js
git commit -m "feat(log): add SubmitFeedback with checkmark and buddy variants"
```

---

## Task 9: `LogScreenShell` component

**Files:**
- Create: `components/log/LogScreenShell.js`
- Create: `components/__tests__/log/LogScreenShell.test.js`

Header (back button, title, subtitle, icon), scrollable body, sticky submit slot, keyboard avoidance. Owns layout only — no form state.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/log/LogScreenShell.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('LogScreenShell', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'LogScreenShell.js'),
      'utf-8'
    );
  });

  test('exports LogScreenShell as default', () => {
    expect(source).toMatch(/export default LogScreenShell/);
  });

  test('accepts title, subtitle, icon, onBack, submitSlot, children', () => {
    expect(source).toContain('title');
    expect(source).toContain('subtitle');
    expect(source).toContain('icon');
    expect(source).toContain('onBack');
    expect(source).toContain('submitSlot');
    expect(source).toContain('children');
  });

  test('uses KeyboardAvoidingView', () => {
    expect(source).toContain('KeyboardAvoidingView');
  });

  test('uses SafeAreaView with top/left/right edges', () => {
    expect(source).toContain('SafeAreaView');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/LogScreenShell.test.js`
Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the component**

Create `components/log/LogScreenShell.js`:

```js
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

export const LogScreenShell = ({
  title,
  subtitle,
  icon,
  onBack,
  submitSlot,
  children,
}) => {
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-row items-center gap-3 px-5 pt-3 pb-2">
          <Pressable onPress={onBack} className="p-2 rounded-xl bg-muted/60" hitSlop={8}>
            <ArrowLeft size={18} color="#1f2a30" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{title}</Text>
            {subtitle ? (
              <Text className="text-sm text-muted-foreground">{subtitle}</Text>
            ) : null}
          </View>
          {icon ? <View>{icon}</View> : null}
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {submitSlot ? (
          <View className="px-5 pt-3 pb-5 border-t border-border bg-background">
            {submitSlot}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LogScreenShell;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/LogScreenShell.test.js`
Expected: PASS — four assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/LogScreenShell.js components/__tests__/log/LogScreenShell.test.js
git commit -m "feat(log): add LogScreenShell — shared layout primitive for log screens"
```

---

## Task 10: Rewrite `LogSymptomScreen`

**Files:**
- Modify: `screens/LogSymptomScreen.js` (full rewrite)
- Create: `screens/__tests__/LogSymptomScreen.test.js`

Compose the new primitives. Preserve `saveSymptom` payload shape and existing analytics. Add `severity_input: "dots"` field. Submit uses `SubmitFeedback` with `variant="checkmark"`.

- [ ] **Step 1: Write the failing test**

Create `screens/__tests__/LogSymptomScreen.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('LogSymptomScreen redesign', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'LogSymptomScreen.js'),
      'utf-8'
    );
  });

  test('uses the new shared log primitives', () => {
    expect(source).toContain("from '../components/log/LogScreenShell'");
    expect(source).toContain("from '../components/log/ChipScroller'");
    expect(source).toContain("from '../components/log/SeverityDots'");
    expect(source).toContain("from '../components/log/TimeEntry'");
    expect(source).toContain("from '../components/log/SubmitFeedback'");
  });

  test('no longer imports the old SeveritySlider or native DateTimePicker', () => {
    expect(source).not.toContain('SeveritySlider');
    expect(source).not.toContain('@react-native-community/datetimepicker');
  });

  test('uses checkmark variant on submit', () => {
    expect(source).toMatch(/variant\s*=\s*['"]checkmark['"]/);
  });

  test('calls saveSymptom with preserved payload shape', () => {
    expect(source).toContain('saveSymptom');
    expect(source).toContain('severity');
    expect(source).toContain('symptomTypes');
    expect(source).toContain('timestamp');
    expect(source).toContain('notes');
  });

  test('fires symptom_logged analytics with new severity_input field', () => {
    expect(source).toContain('symptom_logged');
    expect(source).toContain('severity_input');
    expect(source).toContain('time_preset');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest screens/__tests__/LogSymptomScreen.test.js`
Expected: FAIL — the new imports don't exist in the file yet.

- [ ] **Step 3: Rewrite the screen**

Replace the entire contents of `screens/LogSymptomScreen.js`:

```js
import { useState, useEffect } from "react";
import { Text, View } from "react-native";
import { Activity, FileText } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import LogScreenShell from "../components/log/LogScreenShell";
import ChipScroller from "../components/log/ChipScroller";
import SeverityDots from "../components/log/SeverityDots";
import TimeEntry from "../components/log/TimeEntry";
import SubmitFeedback from "../components/log/SubmitFeedback";
import { TextArea } from "../components/TextField";
import { saveSymptom } from "../services/storage";
import { showToast } from "../utils/feedback";
import { syncSmartNotifications } from "../services/notifications";

const symptomTypes = [
  { id: "heartburn", label: "Heartburn" },
  { id: "regurgitation", label: "Regurgitation" },
  { id: "bloating", label: "Bloating" },
  { id: "nausea", label: "Nausea" },
  { id: "chest_pain", label: "Chest Pain" },
  { id: "throat", label: "Sore Throat" },
  { id: "stomach_pain", label: "Stomach Pain" },
  { id: "gas", label: "Gas" },
  { id: "other", label: "Other" },
];

export default function LogSymptomScreen({ navigation }) {
  const [severity, setSeverity] = useState(2);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [symptomTime, setSymptomTime] = useState(new Date());
  const [timePreset, setTimePreset] = useState("now");
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("LogSymptom");
  }, []);

  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const typeLabels = selectedTypes
      .map((id) => symptomTypes.find((t) => t.id === id)?.label)
      .filter(Boolean);

    await saveSymptom({
      severity,
      symptomTypes: selectedTypes,
      timestamp: symptomTime.getTime(),
      notes: notes.trim() || undefined,
    });

    posthog?.capture("symptom_logged", {
      severity,
      severity_input: "dots",
      symptom_types: selectedTypes,
      has_notes: Boolean(notes.trim()),
      time_preset: timePreset,
    });

    const typeText =
      typeLabels.length > 0 ? typeLabels.join(", ") : `Severity ${severity}/5`;
    showToast("Symptom logged!", typeText);
    syncSmartNotifications().catch(() => {});
  };

  return (
    <LogScreenShell
      title="Log Symptom"
      onBack={() => navigation.goBack()}
      icon={
        <View className="w-10 h-10 rounded-full bg-accent-light items-center justify-center">
          <Activity size={18} color="#f07c52" />
        </View>
      }
      submitSlot={
        <SubmitFeedback
          variant="checkmark"
          label="Log Symptom"
          onSubmit={handleSubmit}
          onComplete={() => navigation.goBack()}
        />
      }
    >
      <View className="gap-3">
        <Text className="text-sm font-medium text-foreground">
          What are you feeling?
        </Text>
        <ChipScroller
          chips={symptomTypes}
          mode="multi"
          selectedIds={selectedTypes}
          onToggle={toggleType}
          wrap
        />
      </View>

      <View className="bg-card border border-border rounded-3xl p-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">
            Intensity
          </Text>
          <View className="px-3 py-1 rounded-full bg-primary-light">
            <Text className="text-primary text-lg font-bold">{severity}</Text>
          </View>
        </View>
        <SeverityDots value={severity} onChange={setSeverity} />
      </View>

      <TimeEntry
        value={symptomTime}
        presetId={timePreset}
        onChange={(date, preset) => {
          setSymptomTime(date);
          setTimePreset(preset);
        }}
        label="When did it start?"
      />

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <FileText size={16} color="#3aa27f" />
          <Text className="text-sm font-medium text-foreground">
            Notes (optional)
          </Text>
        </View>
        <TextArea
          placeholder="Anything else? (what you ate, stress, etc.)"
          value={notes}
          onChangeText={setNotes}
          className="min-h-[90px]"
        />
      </View>
    </LogScreenShell>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest screens/__tests__/LogSymptomScreen.test.js`
Expected: PASS — five assertions green.

- [ ] **Step 5: Run the full Jest suite to catch regressions**

Run: `npm test`
Expected: All existing tests still pass. If a test for the old screen exists and fails because of changed imports, update or delete it (search `LogSymptom` in `screens/__tests__/` — there's currently no test file for it, but double-check).

- [ ] **Step 6: Commit**

```bash
git add screens/LogSymptomScreen.js screens/__tests__/LogSymptomScreen.test.js
git commit -m "feat(log): rewrite LogSymptomScreen using shared primitives + dots"
```

---

## Task 11: Rewrite `LogMealScreen`

**Files:**
- Modify: `screens/LogMealScreen.js` (full rewrite)
- Create: `screens/__tests__/LogMealScreen.test.js`

Compose the new primitives. Preserve `saveMeal` payload, streak side-effects, and analytics. Add `source` field to `meal_logged`. Submit uses `variant="buddy"`.

- [ ] **Step 1: Write the failing test**

Create `screens/__tests__/LogMealScreen.test.js`:

```js
const fs = require('fs');
const path = require('path');

describe('LogMealScreen redesign', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'LogMealScreen.js'),
      'utf-8'
    );
  });

  test('uses the new shared log primitives', () => {
    expect(source).toContain("from '../components/log/LogScreenShell'");
    expect(source).toContain("from '../components/log/ChipScroller'");
    expect(source).toContain("from '../components/log/TimeEntry'");
    expect(source).toContain("from '../components/log/MealLibrarySheet'");
    expect(source).toContain("from '../components/log/SubmitFeedback'");
  });

  test('no longer imports native DateTimePicker', () => {
    expect(source).not.toContain('@react-native-community/datetimepicker');
  });

  test('uses buddy variant on submit', () => {
    expect(source).toMatch(/variant\s*=\s*['"]buddy['"]/);
  });

  test('pulls recent meal suggestions from storage', () => {
    expect(source).toContain('getRecentMealSuggestions');
  });

  test('fires meal_logged with source field', () => {
    expect(source).toContain('meal_logged');
    expect(source).toContain('source');
  });

  test('still preserves streak side-effects', () => {
    expect(source).toContain('getStreakInfo');
    expect(source).toContain('STREAK_MILESTONES');
    expect(source).toContain('updateBestStreak');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest screens/__tests__/LogMealScreen.test.js`
Expected: FAIL — new imports do not yet exist.

- [ ] **Step 3: Rewrite the screen**

Replace the entire contents of `screens/LogMealScreen.js`:

```js
import { useState, useEffect, useMemo } from "react";
import { Text, View, Pressable } from "react-native";
import { Utensils, Sparkles } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import LogScreenShell from "../components/log/LogScreenShell";
import ChipScroller from "../components/log/ChipScroller";
import TimeEntry from "../components/log/TimeEntry";
import SubmitFeedback from "../components/log/SubmitFeedback";
import MealLibrarySheet from "../components/log/MealLibrarySheet";
import { TextArea } from "../components/TextField";
import {
  saveMeal,
  getMeals,
  getUser,
  getStreakInfo,
  updateBestStreak,
  STREAK_MILESTONES,
  getRecentMealSuggestions,
} from "../services/storage";
import { showToast } from "../utils/feedback";
import { syncSmartNotifications } from "../services/notifications";

const append = (current, addition) =>
  current.trim() ? `${current.trim()}, ${addition}` : addition;

const computeSource = ({ usedRecent, usedLibrary, hadFreeText }) => {
  const sources = [];
  if (usedRecent) sources.push("recent");
  if (usedLibrary) sources.push("library");
  if (hadFreeText) sources.push("freetext");
  if (sources.length === 0) return "freetext";
  if (sources.length === 1) return sources[0];
  return "mixed";
};

export default function LogMealScreen({ navigation }) {
  const [mealText, setMealText] = useState("");
  const [mealTime, setMealTime] = useState(new Date());
  const [timePreset, setTimePreset] = useState("now");
  const [recentMeals, setRecentMeals] = useState([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [usedRecent, setUsedRecent] = useState(false);
  const [usedLibrary, setUsedLibrary] = useState(false);
  const [typedManually, setTypedManually] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("LogMeal");
    getMeals().then((meals) => {
      setRecentMeals(getRecentMealSuggestions(meals, 10));
    });
  }, []);

  const recentChips = useMemo(
    () => recentMeals.map((label) => ({ id: label, label })),
    [recentMeals]
  );

  const handleRecentPress = (label) => {
    setMealText((prev) => append(prev, label));
    setUsedRecent(true);
    posthog?.capture("quick_add_used", { meal: label, source: "recent" });
  };

  const handleLibraryConfirm = (labels) => {
    setLibraryOpen(false);
    setMealText((prev) =>
      labels.reduce((acc, label) => append(acc, label), prev)
    );
    setUsedLibrary(true);
    labels.forEach((meal) =>
      posthog?.capture("quick_add_used", { meal, source: "library" })
    );
  };

  const handleTextChange = (next) => {
    setMealText(next);
    setTypedManually(true);
  };

  const handleSubmit = async () => {
    if (!mealText.trim()) {
      showToast("Please describe what you ate");
      throw new Error("empty_meal");
    }
    await saveMeal({ text: mealText.trim(), timestamp: mealTime.getTime() });

    const [meals, user] = await Promise.all([getMeals(), getUser()]);
    const streakInfo = getStreakInfo(meals, user);

    if (streakInfo.shouldUpdateBest) {
      updateBestStreak(streakInfo.bestStreak);
    }

    if (STREAK_MILESTONES.includes(streakInfo.currentStreak)) {
      posthog?.capture("streak_milestone", {
        streak_length: streakInfo.currentStreak,
      });
    }

    const hadFreeText =
      typedManually &&
      // typing in addition to a chip is "mixed"; pure chip selection sets the
      // text via append but typedManually stays false.
      true;

    posthog?.capture("meal_logged", {
      has_quick_add: usedRecent || usedLibrary,
      text_length: mealText.trim().length,
      streak_length: streakInfo.currentStreak,
      source: computeSource({ usedRecent, usedLibrary, hadFreeText }),
      time_preset: timePreset,
    });

    const streakText =
      streakInfo.currentStreak > 1
        ? `${streakInfo.currentStreak}-day streak! `
        : streakInfo.currentStreak === 1
        ? "Streak started! "
        : "";

    showToast("Meal logged!", `${streakText}Keep tracking to discover your triggers.`);
    syncSmartNotifications().catch(() => {});
  };

  return (
    <LogScreenShell
      title="Log Meal"
      subtitle="What did you eat?"
      onBack={() => navigation.goBack()}
      icon={
        <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
          <Utensils size={22} color="#3aa27f" />
        </View>
      }
      submitSlot={
        <SubmitFeedback
          variant="buddy"
          label="Log Meal"
          disabled={!mealText.trim()}
          onSubmit={handleSubmit}
          onComplete={() => navigation.goBack()}
        />
      }
    >
      {recentChips.length > 0 && (
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Sparkles size={16} color="#5f6f74" />
            <Text className="text-sm text-muted-foreground font-medium">
              Recent meals
            </Text>
          </View>
          <ChipScroller
            chips={recentChips}
            mode="action"
            onPress={handleRecentPress}
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">
          Describe your meal
        </Text>
        <TextArea
          placeholder="Tap a recent meal or describe what you ate"
          value={mealText}
          onChangeText={handleTextChange}
          className="min-h-[48px]"
        />
        <Pressable
          onPress={() => setLibraryOpen(true)}
          className="self-start px-3 py-1.5 rounded-full bg-muted/60"
        >
          <Text className="text-sm font-semibold text-foreground">
            🥗 Browse foods
          </Text>
        </Pressable>
      </View>

      <TimeEntry
        value={mealTime}
        presetId={timePreset}
        onChange={(date, preset) => {
          setMealTime(date);
          setTimePreset(preset);
        }}
        label="When did you eat?"
      />

      <MealLibrarySheet
        visible={libraryOpen}
        onCancel={() => setLibraryOpen(false)}
        onConfirm={handleLibraryConfirm}
      />
    </LogScreenShell>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest screens/__tests__/LogMealScreen.test.js`
Expected: PASS — six assertions green.

- [ ] **Step 5: Run the full Jest suite**

Run: `npm test`
Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add screens/LogMealScreen.js screens/__tests__/LogMealScreen.test.js
git commit -m "feat(log): rewrite LogMealScreen using shared primitives + library sheet"
```

---

## Task 12: Add `time_picker_opened` analytics event

**Files:**
- Modify: `components/log/TimeEntry.js` (fire event when sheet opens)
- Modify: `components/__tests__/log/TimeEntry.test.js` (add assertion)

The spec calls for a `time_picker_opened` event to validate the "default to now" hypothesis. Fire it from `TimeEntry` when the user opens `TimePickerSheet`.

- [ ] **Step 1: Add test assertion**

Edit `components/__tests__/log/TimeEntry.test.js`. Add this test after the existing five:

```js
  test('captures time_picker_opened analytics event', () => {
    expect(source).toContain('time_picker_opened');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest components/__tests__/log/TimeEntry.test.js`
Expected: FAIL — the new assertion fails.

- [ ] **Step 3: Wire analytics into TimeEntry**

Edit `components/log/TimeEntry.js`. Add the PostHog import at the top:

```js
import { usePostHog } from "posthog-react-native";
```

Inside the `TimeEntry` function (just after `useState` hooks), add:

```js
  const posthog = usePostHog();
```

Replace the two `setSheetOpen(true)` calls (one in `applyPreset` for the "earlier" preset, one in the Custom pill `onPress`) with a small helper. Above the `return`, add:

```js
  const openSheet = () => {
    posthog?.capture("time_picker_opened");
    setSheetOpen(true);
  };
```

Then change both `setSheetOpen(true)` call sites to `openSheet()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest components/__tests__/log/TimeEntry.test.js`
Expected: PASS — six assertions green.

- [ ] **Step 5: Commit**

```bash
git add components/log/TimeEntry.js components/__tests__/log/TimeEntry.test.js
git commit -m "feat(log): emit time_picker_opened analytics from TimeEntry"
```

---

## Task 13: Manual device verification

**Files:** none — this is a device-walkthrough task with a written sign-off.

Per the spec, certain qualities are not unit-testable. Run through this checklist on a real device, then write a short note (e.g. in the PR description) confirming each.

- [ ] **Step 1: Launch the app on iOS device**

Run: `npx expo run:ios` (or use an EAS dev-client build).

- [ ] **Step 2: Walk the LogSymptom flow**

- Open Log Symptom from Home.
- Tap two symptom chips → both highlight, multi-select works.
- Tap severity dot 4 → feel the haptic, dot fills.
- Tap "edit" on time → presets appear, "Just now" is highlighted.
- Tap "Custom" → wheel sheet opens. Spin each wheel → haptic tick on each detent. Hit "Set time" → time updates, sheet closes.
- Type a note.
- Tap "Log Symptom" → haptic, checkmark draws in the button, screen dismisses within ~500ms, toast visible on Home.

- [ ] **Step 3: Walk the LogMeal flow**

- Open Log Meal.
- Recent meals row appears (if you have history); tap one → text fills.
- Tap "🥗 Browse foods" → sheet opens. Select "Pizza" and "Coffee" across two categories. "Done (2)" enables. Tap Done → sheet closes, text shows "Pizza, Coffee".
- Tap "Log Meal" → haptic, turtle pops up briefly with a heart, screen dismisses within ~800ms.

- [ ] **Step 4: Verify Reduced Motion accessibility**

- Settings → Accessibility → Motion → enable "Reduce Motion".
- Submit both forms again. Verify: haptic still fires, but the checkmark/buddy animations are skipped — screen dismisses immediately.

- [ ] **Step 5: Verify low-end Android (if available)**

Run on an older Android device or low-end emulator profile. Submit each form. Confirm the buddy animation does not exceed ~800ms and feels smooth.

- [ ] **Step 6: Smoke-test data integrity**

- Open Home → confirm severity chart still renders.
- Open Insights → confirm trigger calculations still work.
- Open Report → confirm history shows the new entries.

- [ ] **Step 7: Commit the sign-off**

Append a short note to the PR description (or to a `CHANGELOG.md` if you prefer) confirming all six manual checks passed. No code change to commit; this step exists to make the manual gate explicit and reviewable.

---

## Out-of-scope reminders

The following are *not* part of this plan (per the spec's explicit non-goals):

- Login flow redesign
- Onboarding redesign
- Richer log-entry data (portion size, meal type, meal→symptom linking)
- AI safer-swaps improvements
- HomeScreen / InsightsScreen / ReportScreen redesign
- Storage schema migration
- Backend changes
