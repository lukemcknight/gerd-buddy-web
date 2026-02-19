import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";

const REVIEW_LAST_ASKED_KEY = "acidtrack_review_last_asked";
const REVIEW_MIN_DAYS = 7;
const REVIEW_MEAL_THRESHOLD = 10;
const REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export const maybePromptForReview = async ({ daysSinceStart, mealCount } = {}) => {
  if (Platform.OS !== "ios") return false;

  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return false;

  const lastAskedRaw = await AsyncStorage.getItem(REVIEW_LAST_ASKED_KEY);
  const lastAsked = lastAskedRaw ? Number(lastAskedRaw) : 0;
  if (lastAsked && Date.now() - lastAsked < REVIEW_COOLDOWN_MS) return false;

  const meetsDays = typeof daysSinceStart === "number" && daysSinceStart >= REVIEW_MIN_DAYS;
  const meetsMeals = typeof mealCount === "number" && mealCount >= REVIEW_MEAL_THRESHOLD;
  if (!meetsDays && !meetsMeals) return false;

  await StoreReview.requestReview();
  await AsyncStorage.setItem(REVIEW_LAST_ASKED_KEY, String(Date.now()));
  return true;
};
