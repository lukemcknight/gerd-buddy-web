import { Alert, Platform, ToastAndroid } from "react-native";

export const showToast = (message, description) => {
  const text = description ? `${message} — ${description}` : message;
  if (Platform.OS === "android") {
    ToastAndroid.show(text, ToastAndroid.SHORT);
  } else {
    Alert.alert(message, description);
  }
};
