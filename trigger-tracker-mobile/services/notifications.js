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
  if (existing.status === "granted" || existing.status === "provisional") {
    return formatPermission(existing);
  }

  const requested = await Notifications.requestPermissionsAsync({
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
    allowProvisional: true,
  });

  return formatPermission(requested);
};

export const registerForPushNotifications = async () => {
  const permission = await requestNotificationPermission();
  if (!permission.granted && !permission.provisional) {
    return { permission, token: null };
  }

  const projectId = getProjectId();
  let token = null;

  if (projectId) {
    const response = await Notifications.getExpoPushTokenAsync({ projectId });
    token = response?.data ?? null;
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
    }
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3AA27F",
    });
  }

  return { permission, token };
};

export const getStoredPushToken = async () =>
  AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);

export const openNotificationSettings = async () => {
  try {
    if (Platform.OS === "android") {
      await Linking.openSettings();
      return;
    }
    await Linking.openURL("app-settings:");
  } catch (error) {
    console.warn("Could not open settings", error);
  }
};

export default {
  getPermissionStatus,
  requestNotificationPermission,
  registerForPushNotifications,
  getStoredPushToken,
  openNotificationSettings,
};
