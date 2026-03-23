import AsyncStorage from "@react-native-async-storage/async-storage";
import { maybePromptForReview } from "./reviewPrompt";
import { calculateTriggers } from "../utils/triggerEngine";

const STORAGE_KEYS = {
  MEALS: "acidtrack_meals",
  SYMPTOMS: "acidtrack_symptoms",
  USER: "acidtrack_user",
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

const readJson = async (key, fallback) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
};

const writeJson = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}`, error);
  }
};

export const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const getMeals = async () => readJson(STORAGE_KEYS.MEALS, []);

export const saveMeal = async (meal) => {
  const meals = await getMeals();
  const newMeal = {
    ...meal,
    id: generateId(),
    createdAt: Date.now(),
  };
  const updated = [...meals, newMeal];
  await writeJson(STORAGE_KEYS.MEALS, updated);
  getDaysSinceStart()
    .then((daysSinceStart) =>
      maybePromptForReview({ daysSinceStart, mealCount: updated.length })
    )
    .catch(() => {});
  return newMeal;
};

export const deleteMeal = async (id) => {
  const meals = await getMeals();
  const updated = meals.filter((meal) => meal.id !== id);
  await writeJson(STORAGE_KEYS.MEALS, updated);
};

export const getSymptoms = async () => readJson(STORAGE_KEYS.SYMPTOMS, []);

export const saveSymptom = async (symptom) => {
  const symptoms = await getSymptoms();
  const newSymptom = {
    ...symptom,
    id: generateId(),
    createdAt: Date.now(),
  };
  const updated = [...symptoms, newSymptom];
  await writeJson(STORAGE_KEYS.SYMPTOMS, updated);
  return newSymptom;
};

export const deleteSymptom = async (id) => {
  const symptoms = await getSymptoms();
  const updated = symptoms.filter((symptom) => symptom.id !== id);
  await writeJson(STORAGE_KEYS.SYMPTOMS, updated);
};

export const getUser = async () => readJson(STORAGE_KEYS.USER, null);

export const saveUser = async (user) => writeJson(STORAGE_KEYS.USER, user);

export const createUser = async (...args) => {
  // Support both the new object payload and legacy positional args.
  const payload =
    args.length === 1 && typeof args[0] === "object" && args[0] !== null
      ? args[0]
      : {
          topSymptoms: args[0] || [],
          remindersEnabled: args[1],
          eveningReminderEnabled: args[2],
        };

  const {
    conditions = ["gerd"],
    topSymptoms = [],
    symptomTiming = [],
    symptomFrequency = null,
    symptomAfterEating = null,
    worseLyingDown = null,
    remindersEnabled = true,
    eveningReminderEnabled = false,
    // Triage fields
    severity = "moderate",
    fearFoods = [],
    customFearFoods = [],
    mealTimes = [],
    medsStatus = "none",
  } = payload;

  const user = {
    id: generateId(),
    onboardingComplete: true,
    conditions,
    symptoms: topSymptoms,
    topSymptoms,
    symptomTiming,
    symptomFrequency,
    symptomAfterEating,
    worseLyingDown,
    remindersEnabled,
    eveningReminderEnabled,
    // Triage fields
    severity,
    fearFoods,
    customFearFoods,
    mealTimes,
    medsStatus,
    // Tracking counters
    scanCount: 0,
    lastScanDate: null,
    createdAt: Date.now(),
    startDate: Date.now(),
    subscriptionActive: false,
  };
  await saveUser(user);
  return user;
};

export const getDaysSinceStart = async () => {
  const user = await getUser();
  if (!user) return 0;
  const diff = Date.now() - user.startDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const incrementScanCount = async () => {
  const user = await getUser();
  if (!user) return 0;
  const count = (user.scanCount || 0) + 1;
  await saveUser({ ...user, scanCount: count, lastScanDate: Date.now() });
  return count;
};

export const getScanCount7d = async () => {
  const meals = await getMeals();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return meals.filter(
    (m) => m.source === "scan" && m.createdAt >= sevenDaysAgo
  ).length;
};

export const clearAllData = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.MEALS,
    STORAGE_KEYS.SYMPTOMS,
    STORAGE_KEYS.USER,
    "known_triggers_v1",
    "smart_notification_ids_v1",
    "gerdbuddy_onboarding_plan",
    "gerdbuddy_seen_accessories",
  ]);
};

// ── Buddy accessory tracking ──────────────────────────────────────────
const SEEN_ACCESSORIES_KEY = "gerdbuddy_seen_accessories";

export const getSeenAccessories = async () => readJson(SEEN_ACCESSORIES_KEY, []);

export const markAccessorySeen = async (accessoryId) => {
  const seen = await getSeenAccessories();
  if (!seen.includes(accessoryId)) {
    await writeJson(SEEN_ACCESSORIES_KEY, [...seen, accessoryId]);
  }
};


export const getPersonalTriggers = async (limit = 10) => {
  const [meals, symptoms] = await Promise.all([getMeals(), getSymptoms()]);
  const triggers = calculateTriggers(meals, symptoms);
  return triggers.slice(0, limit);
};

const dateKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const getStreakInfo = (meals, user) => {
  const previousBest = user?.bestStreak || 0;

  if (!meals || meals.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: previousBest,
      loggedToday: false,
      shouldUpdateBest: false,
    };
  }

  const loggedDays = new Set();
  for (const meal of meals) {
    loggedDays.add(dateKey(new Date(meal.timestamp)));
  }

  const now = new Date();
  const today = dateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  const loggedToday = loggedDays.has(today);

  let startDate;
  if (loggedToday) {
    startDate = new Date(now);
  } else if (loggedDays.has(yesterdayKey)) {
    startDate = new Date(yesterday);
  } else {
    return {
      currentStreak: 0,
      bestStreak: previousBest,
      loggedToday: false,
      shouldUpdateBest: false,
    };
  }

  let streak = 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  while (loggedDays.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const bestStreak = Math.max(previousBest, streak);

  return {
    currentStreak: streak,
    bestStreak,
    loggedToday,
    shouldUpdateBest: bestStreak > previousBest,
  };
};

export const updateBestStreak = async (bestStreak) => {
  const user = await getUser();
  if (!user) return;
  await saveUser({ ...user, bestStreak });
};
