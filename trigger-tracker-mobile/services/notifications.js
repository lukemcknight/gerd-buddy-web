import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

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

const DEFAULT_REMINDER_TIMES = {
  daily: { hour: 9, minute: 0 },
  evening: { hour: 20, minute: 0 },
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

const ensureReminderScheduled = async (type, ids, scheduled, config) => {
  const existingId = ids[type];
  if (existingId && scheduled.some((item) => item.identifier === existingId)) {
    return ids;
  }

  await removeScheduledByType(type, scheduled);
  const identifier = await scheduleReminder(type, config);
  const updated = { ...ids, [type]: identifier };
  await setReminderIds(updated);
  return updated;
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
  remindersEnabled,
  eveningReminderEnabled,
}) => {
  const permission = await getPermissionStatus();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  let ids = await getReminderIds();

  if (!permission.granted && !permission.provisional) {
    ids = await cancelReminder("daily", ids, scheduled);
    ids = await cancelReminder("evening", ids, scheduled);
    return { permission, ids };
  }

  await ensureAndroidChannel();

  if (remindersEnabled) {
    ids = await ensureReminderScheduled("daily", ids, scheduled, {
      title: "Time to log your meals",
      body: "A quick check-in helps spot your triggers.",
      trigger: { ...DEFAULT_REMINDER_TIMES.daily, repeats: true },
    });
  } else {
    ids = await cancelReminder("daily", ids, scheduled);
  }

  if (eveningReminderEnabled) {
    ids = await ensureReminderScheduled("evening", ids, scheduled, {
      title: "Evening reminder",
      body: "Try to avoid eating 2 hours before bed.",
      trigger: { ...DEFAULT_REMINDER_TIMES.evening, repeats: true },
    });
  } else {
    ids = await cancelReminder("evening", ids, scheduled);
  }

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

export default {
  getPermissionStatus,
  requestNotificationPermission,
  registerForPushNotifications,
  syncReminderNotifications,
  getStoredPushToken,
  openNotificationSettings,
};
