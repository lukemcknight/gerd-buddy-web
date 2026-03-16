import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

const REVIEW_LAST_ASKED_KEY = "acidtrack_review_last_asked";
const REVIEW_ASK_COUNT_KEY = "acidtrack_review_ask_count";

// Thresholds — lower bar so new users get prompted earlier
const REVIEW_MIN_DAYS = 3;
const REVIEW_MEAL_THRESHOLD = 5;

// Max lifetime prompts (Apple may throttle further, but we cap on our side)
const MAX_PROMPTS = 2;

// Cooldown: 14 days between first and second prompt, then stop
const REVIEW_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Core prompt logic — checks eligibility, fires native review dialog.
 * Returns true if the dialog was shown.
 */
const requestIfEligible = async () => {
  if (Platform.OS !== "ios") return false;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;

  // Check lifetime cap
  const askCountRaw = await AsyncStorage.getItem(REVIEW_ASK_COUNT_KEY);
  const askCount = askCountRaw ? Number(askCountRaw) : 0;
  if (askCount >= MAX_PROMPTS) return false;

  // Check cooldown
  const lastAskedRaw = await AsyncStorage.getItem(REVIEW_LAST_ASKED_KEY);
  const lastAsked = lastAskedRaw ? Number(lastAskedRaw) : 0;
  if (lastAsked && Date.now() - lastAsked < REVIEW_COOLDOWN_MS) return false;

  await StoreReview.requestReview();
  await AsyncStorage.setItem(REVIEW_LAST_ASKED_KEY, String(Date.now()));
  await AsyncStorage.setItem(REVIEW_ASK_COUNT_KEY, String(askCount + 1));
  return true;
};

/**
 * Original entry point — called on app launch and after saving a meal.
 * Fires when user has logged enough meals OR enough days have passed.
 */
export const maybePromptForReview = async ({ daysSinceStart, mealCount } = {}) => {
  const meetsDays = typeof daysSinceStart === "number" && daysSinceStart >= REVIEW_MIN_DAYS;
  const meetsMeals = typeof mealCount === "number" && mealCount >= REVIEW_MEAL_THRESHOLD;
  if (!meetsDays && !meetsMeals) return false;

  return requestIfEligible();
};

/**
 * Event-based trigger — call after positive moments:
 *   - Streak milestone (3, 7, 14 days)
 *   - Completing the 7-day onboarding plan
 *   - First scan result viewed
 */
export const promptForReviewOnEvent = async (_eventName) => {
  return requestIfEligible();
};
