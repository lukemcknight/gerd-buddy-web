import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getMeals, getSymptoms, getUser, getStreakInfo } from "./storage";
import { calculateTriggers } from "../utils/triggerEngine";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STORAGE_KEYS = {
  PUSH_TOKEN: "push_token_v1",
  REMINDER_IDS: "reminder_notification_ids_v1",
  SMART_IDS: "smart_notification_ids_v1",
  KNOWN_TRIGGERS: "known_triggers_v1",
};

const formatPermission = (settings) => ({
  status: settings?.status ?? "undetermined",
  granted: Boolean(settings?.granted),
  provisional: settings?.status === "provisional",
  canAskAgain: Boolean(settings?.canAskAgain),
});

const getProjectId = () =>
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.easConfig?.projectId ??
  Constants?.expoConfig?.projectId ??
  null;

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#3AA27F",
  });
};

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

const getReminderIds = async () => readJson(STORAGE_KEYS.REMINDER_IDS, {});

const setReminderIds = async (ids) => writeJson(STORAGE_KEYS.REMINDER_IDS, ids);

const scheduleReminder = async (type, { title, body, trigger }) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { reminderType: type },
    },
    trigger,
  });

const removeScheduledByType = async (type, scheduled) => {
  const toCancel = scheduled.filter(
    (item) => item.content?.data?.reminderType === type
  );
  await Promise.all(
    toCancel.map((item) =>
      Notifications.cancelScheduledNotificationAsync(item.identifier)
    )
  );
};

const cancelReminder = async (type, ids, scheduled) => {
  if (ids[type]) {
    try {
      await Notifications.cancelScheduledNotificationAsync(ids[type]);
    } catch (error) {
      console.warn("Failed to cancel reminder", error);
    }
  }
  await removeScheduledByType(type, scheduled);
  const updated = { ...ids };
  delete updated[type];
  await setReminderIds(updated);
  return updated;
};

export const getPermissionStatus = async () => {
  const status = await Notifications.getPermissionsAsync();
  return formatPermission(status);
};

export const requestNotificationPermission = async () => {
  if (!Device.isDevice) {
    return {
      status: "denied",
      granted: false,
      provisional: false,
      canAskAgain: false,
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") {
    return formatPermission(existing);
  }

  // If already denied and can't ask again, return early
  if (existing.status === "denied" && !existing.canAskAgain) {
    return formatPermission(existing);
  }

  // Request permission - this will show the native iOS popup
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return formatPermission(requested);
};

export const registerForPushNotifications = async () => {
  const permission = await requestNotificationPermission();
  if (!permission.granted) {
    return { permission, token: null };
  }

  const projectId = getProjectId();
  let token = null;

  if (projectId) {
    try {
      // Add timeout to prevent hanging
      const tokenPromise = Notifications.getExpoPushTokenAsync({ projectId });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Push token timeout")), 10000)
      );
      const response = await Promise.race([tokenPromise, timeoutPromise]);
      token = response?.data ?? null;
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
      }
    } catch (error) {
      console.warn("Failed to get push token:", error);
      // Continue without push token - local notifications will still work
    }
  }

  if (Platform.OS === "android") {
    await ensureAndroidChannel();
  }

  return { permission, token };
};

export const syncReminderNotifications = async ({
  remindersEnabled: _remindersEnabled,
  eveningReminderEnabled: _eveningReminderEnabled,
}) => {
  const permission = await getPermissionStatus();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  let ids = await getReminderIds();

  // Static daily/evening reminders are deprecated in favor of smart, personalized reminders.
  // Keep this sync as a cleanup path for already scheduled legacy notifications.
  ids = await cancelReminder("daily", ids, scheduled);
  ids = await cancelReminder("evening", ids, scheduled);

  return { permission, ids };
};

export const getStoredPushToken = async () =>
  AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);

export const openNotificationSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn("Could not open settings", error);
  }
};

// --- Smart / behavioral notifications ---

const getSmartIds = async () => readJson(STORAGE_KEYS.SMART_IDS, []);
const setSmartIds = async (ids) => writeJson(STORAGE_KEYS.SMART_IDS, ids);

const cancelAllSmartNotifications = async () => {
  const ids = await getSmartIds();
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
  await setSmartIds([]);
};

const dateKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const isQuietHours = (date) => {
  const h = date.getHours();
  return h >= 21 || h < 8;
};

const buildStreakAtRiskNotification = (meals, user) => {
  const { currentStreak, loggedToday } = getStreakInfo(meals, user);
  if (currentStreak <= 0 || loggedToday) return null;

  const tomorrow = new Date(Date.now());
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  return {
    type: "smart_streak",
    title: "Don't lose your streak!",
    body: `A quick log keeps your ${currentStreak}-day streak alive.`,
    trigger: { date: tomorrow },
  };
};

const buildPostMealCheckNotification = (meals, symptoms) => {
  if (meals.length === 0) return null;

  // Find most recent meal
  const sorted = [...meals].sort((a, b) => b.timestamp - a.timestamp);
  const latest = sorted[0];
  const mealTime = latest.timestamp;
  const now = Date.now();
  const hoursSinceMeal = (now - mealTime) / (1000 * 60 * 60);

  // Only if meal was < 4h ago
  if (hoursSinceMeal >= 4) return null;

  // Check if a symptom was already logged after this meal
  const hasSymptomAfter = symptoms.some((s) => s.timestamp > mealTime);
  if (hasSymptomAfter) return null;

  // Schedule for 2h after the meal
  const triggerTime = new Date(mealTime + 2 * 60 * 60 * 1000);

  // Skip if trigger time is already past or in quiet hours
  if (triggerTime.getTime() <= now) return null;
  if (isQuietHours(triggerTime)) return null;

  return {
    type: "smart_postmeal",
    title: "How are you feeling?",
    body: "It's been 2 hours since your last meal. Log any symptoms to help spot patterns.",
    trigger: { date: triggerTime },
  };
};

const buildSymptomFreeDayNotification = (symptoms) => {
  const now = new Date(Date.now());
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const hasSymptomToday = symptoms.some(
    (s) => s.timestamp >= todayStart.getTime()
  );
  if (hasSymptomToday) return null;

  // Count symptom-free days in the past week
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const daysWithSymptoms = new Set();
  for (const s of symptoms) {
    if (s.timestamp >= weekAgo.getTime()) {
      daysWithSymptoms.add(dateKey(new Date(s.timestamp)));
    }
  }
  const symptomFreeDays = 7 - daysWithSymptoms.size;

  const triggerTime = new Date(now);
  triggerTime.setHours(20, 30, 0, 0);

  // Skip if 8:30 PM already passed
  if (triggerTime.getTime() <= now.getTime()) return null;

  return {
    type: "smart_symptomfree",
    title: "Great day so far!",
    body: `No symptoms logged today. That's ${symptomFreeDays} symptom-free days this week!`,
    trigger: { date: triggerTime },
  };
};

const buildNewTriggerNotification = async (meals, symptoms) => {
  const triggers = calculateTriggers(meals, symptoms);
  const stored = await readJson(STORAGE_KEYS.KNOWN_TRIGGERS, null);

  // First run — seed known triggers without notifying
  if (stored === null) {
    const knownSet = triggers
      .filter((t) => t.confidence >= 0.5)
      .map((t) => t.ingredient);
    await writeJson(STORAGE_KEYS.KNOWN_TRIGGERS, knownSet);
    return null;
  }

  const knownSet = new Set(stored);
  const highConfidence = triggers.filter((t) => t.confidence >= 0.5);
  const newTrigger = highConfidence.find((t) => !knownSet.has(t.ingredient));

  // Persist current set regardless
  const currentSet = highConfidence.map((t) => t.ingredient);
  await writeJson(STORAGE_KEYS.KNOWN_TRIGGERS, currentSet);

  if (!newTrigger) return null;

  // Schedule near-immediate (1 minute from now)
  const triggerTime = new Date(Date.now() + 60 * 1000);
  if (isQuietHours(triggerTime)) return null;

  return {
    type: "smart_trigger",
    title: "New pattern found",
    body: `${newTrigger.ingredient} may be triggering your symptoms (${newTrigger.symptomRate}% of the time).`,
    trigger: { date: triggerTime },
  };
};

export const syncSmartNotifications = async () => {
  try {
    const permission = await getPermissionStatus();
    if (!permission.granted && !permission.provisional) {
      await cancelAllSmartNotifications();
      return;
    }

    const user = await getUser();
    if (!user || !(user.remindersEnabled ?? true)) {
      await cancelAllSmartNotifications();
      return;
    }

    const [meals, symptoms] = await Promise.all([getMeals(), getSymptoms()]);

    // Cancel all previous smart notifications before rescheduling
    await cancelAllSmartNotifications();
    await ensureAndroidChannel();

    // Build candidate notifications
    const candidates = [
      buildStreakAtRiskNotification(meals, user),
      buildPostMealCheckNotification(meals, symptoms),
      buildSymptomFreeDayNotification(symptoms),
    ].filter(Boolean);

    // New trigger notification (async, bypasses anti-spam limit)
    const triggerNotif = await buildNewTriggerNotification(meals, symptoms);

    // Anti-spam: max 2 behavioral notifications per sync
    const scheduled = candidates.slice(0, 2);
    if (triggerNotif) scheduled.push(triggerNotif);

    const ids = [];
    for (const notif of scheduled) {
      const id = await scheduleReminder(notif.type, {
        title: notif.title,
        body: notif.body,
        trigger: notif.trigger,
      });
      ids.push(id);
    }

    await setSmartIds(ids);
  } catch (error) {
    console.warn("Failed to sync smart notifications:", error);
  }
};

export default {
  getPermissionStatus,
  requestNotificationPermission,
  registerForPushNotifications,
  syncReminderNotifications,
  syncSmartNotifications,
  getStoredPushToken,
  openNotificationSettings,
};
