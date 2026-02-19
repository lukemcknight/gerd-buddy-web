import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureRevenueCat, getSubscriptionStatus } from "./revenuecat";

const STORAGE_KEYS = {
  MEALS: "acidtrack_meals",
  SYMPTOMS: "acidtrack_symptoms",
  USER: "acidtrack_user",
};

const TRIAL_LENGTH_MS = 3 * 24 * 60 * 60 * 1000;

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
    topSymptoms = [],
    symptomTiming = [],
    symptomFrequency = null,
    symptomAfterEating = null,
    worseLyingDown = null,
    remindersEnabled = true,
    eveningReminderEnabled = false,
  } = payload;

  const user = {
    id: generateId(),
    onboardingComplete: true,
    symptoms: topSymptoms,
    topSymptoms,
    symptomTiming,
    symptomFrequency,
    symptomAfterEating,
    worseLyingDown,
    remindersEnabled,
    eveningReminderEnabled,
    createdAt: Date.now(),
    startDate: Date.now(),
    trialEndsAt: Date.now() + TRIAL_LENGTH_MS,
    subscriptionActive: false,
    trialAcknowledged: false,
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

const ensureTrialFields = (user) => {
  if (!user) return null;
  const startDate = user.startDate || Date.now();
  return {
    ...user,
    startDate,
    trialEndsAt: user.trialEndsAt || startDate + TRIAL_LENGTH_MS,
    subscriptionActive: Boolean(user.subscriptionActive),
    trialAcknowledged: Boolean(user.trialAcknowledged),
  };
};

export const getTrialInfo = async () => {
  const storedUser = await getUser();
  const user = ensureTrialFields(storedUser);
  if (!user) {
    return { user: null, trialEndsAt: null, isTrialActive: false, daysRemaining: 0 };
  }

  let subscriptionActive = Boolean(user.subscriptionActive);
  let isTrialActive = false;
  let subscriptionExpiresAt = null;

  try {
    await configureRevenueCat(user.id);
    const status = await getSubscriptionStatus(user.id);
    subscriptionActive = status.active;
    isTrialActive = status.isTrial;
    subscriptionExpiresAt = status.expiresAt;
  } catch (error) {
    console.warn("RevenueCat status lookup failed", error);
  }

  const trialEndsAt = subscriptionExpiresAt || user.trialEndsAt;
  const now = Date.now();
  const msLeft = trialEndsAt ? trialEndsAt - now : 0;
  const daysRemaining = trialEndsAt ? Math.max(Math.ceil(msLeft / (1000 * 60 * 60 * 24)), 0) : 0;

  const normalizedUser = {
    ...user,
    subscriptionActive,
    trialEndsAt,
  };

  if (
    storedUser?.trialEndsAt !== normalizedUser.trialEndsAt ||
    storedUser?.subscriptionActive !== normalizedUser.subscriptionActive ||
    storedUser?.trialAcknowledged !== normalizedUser.trialAcknowledged
  ) {
    await saveUser(normalizedUser);
  }

  return {
    user: normalizedUser,
    trialEndsAt,
    isTrialActive,
    subscriptionActive,
    daysRemaining,
    requiresPayment: !subscriptionActive,
  };
};

export const acknowledgePaywall = async () => {
  const user = ensureTrialFields(await getUser());
  if (!user) return null;
  const updated = { ...user, trialAcknowledged: true };
  await saveUser(updated);
  return updated;
};

export const activateSubscription = async () => {
  const user = ensureTrialFields(await getUser());
  if (!user) return null;
  const updated = {
    ...user,
    subscriptionActive: true,
    subscriptionStartedAt: Date.now(),
    trialAcknowledged: true,
  };
  await saveUser(updated);
  return updated;
};

export const clearAllData = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.MEALS,
    STORAGE_KEYS.SYMPTOMS,
    STORAGE_KEYS.USER,
  ]);
};
