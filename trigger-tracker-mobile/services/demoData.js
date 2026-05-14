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

  // Trigger pattern (HIGH): coffee on 10 of the last 14 mornings.
  // The 4 skipped days (-9, -3, -1, 0) leave natural-looking gaps; today's
  // (-0) coffee slot is filled by the "Iced coffee" scan-result meal below.
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
