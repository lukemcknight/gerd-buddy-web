import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Linking, Platform, Pressable, Text, TextInput, View, Switch } from "react-native";
import { Bell, Trash2, Info, ChevronRight, LogOut, Moon, CreditCard, FileText, Shield, User, Mail, Heart, MessageSquare, Send, X } from "lucide-react-native";
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
  syncSmartNotifications,
} from "../services/notifications";

const APP_VERSION = "1.0.5";

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
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

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
        syncSmartNotifications().catch(() => { });
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
      syncSmartNotifications().catch(() => { });
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
        syncSmartNotifications().catch(() => { });
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
      syncSmartNotifications().catch(() => { });
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

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      showToast("Please write something first");
      return;
    }
    setIsSendingFeedback(true);
    try {
      const subject = encodeURIComponent("GERDBuddy Feedback");
      const body = encodeURIComponent(feedbackText.trim());
      await Linking.openURL(`mailto:gerdbuddy2@gmail.com?subject=${subject}&body=${body}`);
      setFeedbackText("");
      setShowFeedbackForm(false);
      showToast("Thanks for your feedback!");
    } catch (err) {
      showToast("Could not open email", "Please try again.");
    } finally {
      setIsSendingFeedback(false);
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
          Subscription
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
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          About
        </Text>
        <Card className="divide-y divide-border">
          <View className="p-4 gap-3">
            <View className="flex-row items-center gap-3">
              <Heart size={20} color="#3aa27f" />
              <Text className="font-medium text-foreground">About the Developer</Text>
            </View>
            <Text className="text-sm text-muted-foreground leading-relaxed">
              My name is Luke, and I am a 19 year old college student that struggles with GERD and wanted to help others that also struggle. Over winter break, I grinded multiple hours a day working on GERDBuddy to bring users the best possible experience, and something that acutally helps. I didn't want people to waste time tracking meals and symptoms, so I try to constantly improve. If there is any suggestions you have on improvements for the app, please feel free to leave them down below. Thanks!
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                "How GERDBuddy Works",
                "1. Log what you eat and any symptoms you experience\n\n2. Over time, GERDBuddy looks for patterns between your meals and symptoms\n\n3. After about a week of consistent logging, you'll start seeing which foods may be connected to your symptoms\n\n4. Use these patterns to have more informed conversations with your doctor\n\nThis is a tracking tool — not a replacement for medical advice."
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
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Feedback
        </Text>
        <Card className="divide-y divide-border">
          {showFeedbackForm ? (
            <View className="p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-medium text-foreground">Send Feedback</Text>
                <Pressable onPress={() => { setShowFeedbackForm(false); setFeedbackText(""); }}>
                  <X size={18} color="#5f6f74" />
                </Pressable>
              </View>
              <Text className="text-sm text-muted-foreground">
                Bug reports, feature ideas, or just saying hi — I read every message.
              </Text>
              <TextInput
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder="What's on your mind?"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="border border-border rounded-xl p-3 text-foreground min-h-[100px] bg-muted/30"
              />
              <Button
                onPress={handleSendFeedback}
                disabled={!feedbackText.trim() || isSendingFeedback}
                className="w-full"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Send size={16} color="#ffffff" />
                  <Text className="text-primary-foreground font-semibold">
                    {isSendingFeedback ? "Opening email..." : "Send Feedback"}
                  </Text>
                </View>
              </Button>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowFeedbackForm(true)}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-3">
                <MessageSquare size={20} color="#3aa27f" />
                <View>
                  <Text className="font-medium text-foreground">Send Feedback</Text>
                  <Text className="text-sm text-muted-foreground">Bug reports, ideas, or questions</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#5f6f74" />
            </Pressable>
          )}
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Medical Disclaimer
        </Text>
        <Card className="p-4 gap-2 bg-amber-50/50 border-amber-200/50">
          <Text className="text-sm text-foreground font-medium">
            This app is not medical advice
          </Text>
          <Text className="text-xs text-muted-foreground leading-relaxed">
            GERDBuddy is a personal tracking tool. It helps you spot patterns in your own data — it does not diagnose, treat, or cure any condition. Always talk to your doctor before making changes to your diet or treatment plan.
          </Text>
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

      <View className="items-center gap-1 pt-4 pb-2">
        <Text className="text-sm text-muted-foreground">GERDBuddy v{APP_VERSION}</Text>
        <Text className="text-xs text-muted-foreground">Built by someone that struggles with GERD</Text>
      </View>
    </Screen>
  );
}
