import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Linking, Platform, Pressable, Text, View, Switch } from "react-native";
import { Bell, Trash2, Info, ChevronRight, LogOut, Moon, CreditCard, FileText, Shield, User, Mail } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import { clearAllData, getUser, saveUser } from "../services/storage";
import { showToast } from "../utils/feedback";
import {
  getPermissionStatus,
  openNotificationSettings,
  registerForPushNotifications,
  syncReminderNotifications,
} from "../services/notifications";

export default function SettingsScreen({ navigation }) {
  const {
    user: authUser,
    isAuthenticated,
    isFirebaseConfigured,
    signOut,
  } = useAuth();
  const [user, setUser] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [eveningReminderEnabled, setEveningReminderEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState({
    status: "undetermined",
    granted: false,
    provisional: false,
    canAskAgain: true,
  });

  const refreshNotificationStatus = useCallback(async () => {
    const status = await getPermissionStatus();
    setNotificationPermission(status);
  }, []);

  useEffect(() => {
    const load = async () => {
      const profile = await getUser();
      setUser(profile);
      setRemindersEnabled(profile?.remindersEnabled ?? true);
      const eveningSetting =
        profile?.eveningReminderEnabled ?? profile?.remindersEnabled ?? true;
      setEveningReminderEnabled(eveningSetting);
    };
    load();
    refreshNotificationStatus();
  }, [refreshNotificationStatus]);

  useFocusEffect(
    useCallback(() => {
      refreshNotificationStatus();
    }, [refreshNotificationStatus])
  );

  const ensureNotificationsAllowed = useCallback(async () => {
    if (notificationPermission.granted || notificationPermission.provisional) {
      return true;
    }
    const result = await registerForPushNotifications();
    setNotificationPermission(result.permission);
    if (!result.permission.granted && !result.permission.provisional) {
      showToast(
        "Notifications off",
        "Turn on notifications in system settings to receive reminders."
      );
      return false;
    }
    return true;
  }, [notificationPermission.granted, notificationPermission.provisional]);

  const handleRemindersToggle = async (enabled) => {
    if (enabled) {
      const allowed = await ensureNotificationsAllowed();
      if (!allowed) {
        setRemindersEnabled(false);
        await syncReminderNotifications({
          remindersEnabled: false,
          eveningReminderEnabled,
        });
        return;
      }
    }

    setRemindersEnabled(enabled);
    if (user) {
      const updatedUser = { ...user, remindersEnabled: enabled };
      await saveUser(updatedUser);
      setUser(updatedUser);
      await syncReminderNotifications({
        remindersEnabled: enabled,
        eveningReminderEnabled,
      });
      showToast(enabled ? "Reminders enabled" : "Reminders disabled");
    }
  };

  const handleEveningReminderToggle = async (enabled) => {
    if (enabled) {
      const allowed = await ensureNotificationsAllowed();
      if (!allowed) {
        setEveningReminderEnabled(false);
        await syncReminderNotifications({
          remindersEnabled,
          eveningReminderEnabled: false,
        });
        return;
      }
    }

    setEveningReminderEnabled(enabled);
    if (user) {
      const updatedUser = { ...user, eveningReminderEnabled: enabled };
      await saveUser(updatedUser);
      setUser(updatedUser);
      await syncReminderNotifications({
        remindersEnabled,
        eveningReminderEnabled: enabled,
      });
      showToast(enabled ? "Evening reminder enabled" : "Evening reminder disabled");
    }
  };

  const handleClearData = async () => {
    await clearAllData();
    showToast("All data cleared");
    navigation.replace("Onboarding");
  };

  const handleStartOver = async () => {
    await clearAllData();
    navigation.replace("Onboarding");
  };

  const confirmAction = (title, message, action) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: action },
    ]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast("Signed out successfully");
    } catch (err) {
      showToast("Failed to sign out");
    }
  };

  return (
    <Screen contentClassName="gap-6">
      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Notifications
        </Text>
        <Card className="divide-y divide-border">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <Bell size={20} color="#3aa27f" />
              <View>
                <Text className="font-medium text-foreground">Daily Reminders</Text>
                <Text className="text-sm text-muted-foreground">Remind me to log meals</Text>
              </View>
            </View>
            <Switch value={remindersEnabled} onValueChange={handleRemindersToggle} />
          </View>

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center gap-3">
              <Moon size={20} color="#5f6f74" />
              <View>
                <Text className="font-medium text-foreground">Evening Reminder</Text>
                <Text className="text-sm text-muted-foreground">
                  Avoid eating 2 hours before bed
                </Text>
              </View>
            </View>
            <Switch value={eveningReminderEnabled} onValueChange={handleEveningReminderToggle} />
          </View>
        </Card>
        {!notificationPermission.granted && !notificationPermission.provisional && (
          <Card className="p-4 gap-3 bg-amber-50 border border-amber-200">
            <View className="flex-row items-center gap-2">
              <Info size={18} color="#b45309" />
              <Text className="font-semibold text-amber-900">Notifications are off</Text>
            </View>
            <Text className="text-sm text-amber-900">
              {Platform.OS === "ios"
                ? "Tap below, then tap Notifications and turn on Allow Notifications."
                : "Tap below to enable notifications in system settings."}
            </Text>
            <Button
              variant="outline"
              className="w-full border-amber-300"
              onPress={openNotificationSettings}
            >
              <Text className="text-foreground font-semibold">Open Settings</Text>
            </Button>
          </Card>
        )}
      </View>

      {isFirebaseConfigured && (
        <View className="gap-3">
          <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Account
          </Text>
          <Card className="divide-y divide-border">
            {isAuthenticated ? (
              <>
                <View className="flex-row items-center justify-between p-4">
                  <View className="flex-row items-center gap-3">
                    <Mail size={20} color="#3aa27f" />
                    <View>
                      <Text className="font-medium text-foreground">Email</Text>
                      <Text className="text-sm text-muted-foreground">
                        {authUser?.email}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    confirmAction(
                      "Sign out?",
                      "You can sign back in anytime.",
                      handleSignOut
                    )
                  }
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <LogOut size={20} color="#5f6f74" />
                    <Text className="font-medium text-foreground">Sign Out</Text>
                  </View>
                  <ChevronRight size={20} color="#5f6f74" />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => navigation.navigate("SignUp")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <User size={20} color="#3aa27f" />
                    <View>
                      <Text className="font-medium text-foreground">Create Account</Text>
                      <Text className="text-sm text-muted-foreground">
                        Sync your data across devices
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#5f6f74" />
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate("Login")}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <Mail size={20} color="#5f6f74" />
                    <Text className="font-medium text-foreground">Sign In</Text>
                  </View>
                  <ChevronRight size={20} color="#5f6f74" />
                </Pressable>
              </>
            )}
          </Card>
        </View>
      )}

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          About
        </Text>
        <Card className="divide-y divide-border">
          <Pressable
            onPress={() => navigation.navigate("CustomerCenter")}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <CreditCard size={20} color="#3aa27f" />
              <Text className="font-medium text-foreground">Manage Subscription</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                "How GERDBuddy Works",
                "1. Log your meals and symptoms daily\n\n2. GERDBuddy analyzes patterns between what you eat and when symptoms occur\n\n3. After 7 days, receive a personalized report with your suspected triggers\n\n4. Use the AI food scanner to check meals before eating\n\nRemember: This is educational information only, not medical advice. Always consult your healthcare provider."
              )
            }
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <Info size={20} color="#3aa27f" />
              <Text className="font-medium text-foreground">How It Works</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>
          <View className="p-4">
            <Text className="text-sm text-muted-foreground leading-relaxed">
              GERDBuddy looks at your meals and symptoms to find gentle correlations. Log
              consistently for 7 days to get the clearest picture. This experience is educational
              and not medical advice.
            </Text>
            <View className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
              <Text className="text-xs text-muted-foreground leading-relaxed">
                GERDBuddy provides educational information only and does not provide medical advice,
                diagnosis, or treatment. Always consult a qualified healthcare provider with any
                medical concerns.
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Legal
        </Text>
        <Card className="divide-y divide-border">
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/privacy")}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <Shield size={20} color="#3aa27f" />
              <Text className="font-medium text-foreground">Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/terms")}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <FileText size={20} color="#3aa27f" />
              <Text className="font-medium text-foreground">Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Data
        </Text>
        <Card className="divide-y divide-border">
          <Pressable
            onPress={() =>
              confirmAction(
                "Clear all data?",
                "This will delete all your logged meals, symptoms, and insights.",
                handleClearData
              )
            }
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <Trash2 size={20} color="#c53030" />
              <Text className="font-medium text-destructive">Clear All Data</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>

          <Pressable
            onPress={() =>
              confirmAction(
                "Start over?",
                "This will reset the app and take you back to onboarding. All data will be deleted.",
                handleStartOver
              )
            }
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center gap-3">
              <LogOut size={20} color="#5f6f74" />
              <Text className="font-medium text-foreground">Start Over</Text>
            </View>
            <ChevronRight size={20} color="#5f6f74" />
          </Pressable>
        </Card>
      </View>

      <View className="items-center gap-1 pt-4">
        <Text className="text-sm text-muted-foreground">GERDBuddy v1.0.0</Text>
        <Text className="text-sm text-muted-foreground">Made with 💚 for GERD warriors</Text>
      </View>
    </Screen>
  );
}
