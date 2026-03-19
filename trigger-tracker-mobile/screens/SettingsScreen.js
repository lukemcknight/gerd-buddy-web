import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Linking, Platform, Pressable, Text, TextInput, View, Switch } from "react-native";
import {
  Bell, Trash2, Info, ChevronRight, LogOut, Moon, CreditCard, FileText, Shield,
  User, Mail, Heart, MessageSquare, Send, X,
} from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import Screen from "../components/Screen";
import Button from "../components/Button";
import Mascot from "../components/Mascot";
import { clearAllData, getUser, saveUser } from "../services/storage";
import { showToast } from "../utils/feedback";
import {
  getPermissionStatus,
  openNotificationSettings,
  registerForPushNotifications,
  syncReminderNotifications,
  syncSmartNotifications,
} from "../services/notifications";
import { getEntitlementState } from "../services/paywallTrigger";

const APP_VERSION = "2.0.0";

const SettingsCard = ({ icon: Icon, iconColor = "#3aa27f", label, subtitle, onPress, right, destructive, children }) => {
  const content = (
    <View className="bg-card rounded-2xl px-4 py-4 flex-row items-center">
      <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-muted/50">
        <Icon size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`text-base font-semibold ${destructive ? "text-destructive" : "text-foreground"}`}>
          {label}
        </Text>
        {subtitle && (
          <Text className="text-sm text-muted-foreground mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right || (onPress && <ChevronRight size={20} color="#c4c4c0" />)}
    </View>
  );
  if (children) {
    return <View className="bg-card rounded-2xl px-4 py-4">{children}</View>;
  }
  if (onPress) return <Pressable onPress={onPress}>{content}</Pressable>;
  return content;
};

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
  const [isPro, setIsPro] = useState(false);

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
      getEntitlementState()
        .then((state) => setIsPro(state === "pro" || state === "trial"))
        .catch(() => {});
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
    <Screen contentClassName="gap-4 pb-8">
      {/* Profile header */}
      <View className="items-center py-4 gap-3">
        <Mascot size="small" />
        <View className="items-center">
          <Text className="text-xl font-bold text-foreground">
            {isAuthenticated ? authUser?.email?.split("@")[0] : "Buddy"}
          </Text>
          {isAuthenticated && (
            <Text className="text-sm text-muted-foreground">{authUser?.email}</Text>
          )}
        </View>
      </View>

      {/* Upgrade to Pro banner */}
      {!isPro && (
        <Pressable onPress={() => navigation.navigate("Paywall", { trigger_source: "settings" })}>
          <View className="bg-primary rounded-2xl px-5 py-4 flex-row items-center justify-between overflow-hidden">
            <View className="flex-1 z-10">
              <Text className="text-white text-lg font-bold">Upgrade to Pro</Text>
              <Text className="text-white/80 text-sm mt-0.5">
                Unlimited tracking, full trigger analysis, and more.
              </Text>
            </View>
            <View
              className="absolute right-0 top-0 bottom-0 opacity-10"
              style={{ width: 120 }}
            >
              <View className="absolute -right-4 -top-4 w-28 h-28 rounded-full bg-white" />
              <View className="absolute right-6 top-8 w-20 h-20 rounded-full bg-white" />
            </View>
            <ChevronRight size={22} color="#ffffff" className="z-10" />
          </View>
        </Pressable>
      )}

      {/* Notifications */}
      <View className="gap-3 mt-2">
        <Text className="text-lg font-bold text-foreground">Notifications</Text>
        <SettingsCard
          icon={Bell}
          label="Daily Reminders"
          subtitle="Remind me to log meals"
          right={
            <Switch
              value={remindersEnabled}
              onValueChange={handleRemindersToggle}
              trackColor={{ true: "#3aa27f" }}
            />
          }
        />
        <SettingsCard
          icon={Moon}
          iconColor="#5f6f74"
          label="Evening Reminder"
          subtitle="Avoid eating 2 hours before bed"
          right={
            <Switch
              value={eveningReminderEnabled}
              onValueChange={handleEveningReminderToggle}
              trackColor={{ true: "#3aa27f" }}
            />
          }
        />
        {!notificationPermission.granted && !notificationPermission.provisional && (
          <View className="bg-amber-50 rounded-2xl px-4 py-4 gap-3 border border-amber-200">
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
          </View>
        )}
      </View>

      {/* Account */}
      {isFirebaseConfigured && (
        <View className="gap-3 mt-2">
          <Text className="text-lg font-bold text-foreground">Account</Text>
          {isAuthenticated ? (
            <>
              <SettingsCard
                icon={Mail}
                label="Email"
                subtitle={authUser?.email}
              />
              <SettingsCard
                icon={LogOut}
                iconColor="#5f6f74"
                label="Sign Out"
                onPress={() =>
                  confirmAction("Sign out?", "You can sign back in anytime.", handleSignOut)
                }
              />
            </>
          ) : (
            <>
              <SettingsCard
                icon={User}
                label="Create Account"
                subtitle="Sync your data across devices"
                onPress={() => navigation.navigate("SignUp")}
              />
              <SettingsCard
                icon={Mail}
                iconColor="#5f6f74"
                label="Sign In"
                onPress={() => navigation.navigate("Login")}
              />
            </>
          )}
        </View>
      )}

      {/* Subscription */}
      {isPro && (
        <View className="gap-3 mt-2">
          <Text className="text-lg font-bold text-foreground">Subscription</Text>
          <SettingsCard
            icon={CreditCard}
            label="Manage Subscription"
            onPress={() => navigation.navigate("CustomerCenter")}
          />
        </View>
      )}

      {/* Help */}
      <View className="gap-3 mt-2">
        <Text className="text-lg font-bold text-foreground">Help</Text>
        <SettingsCard
          icon={Info}
          label="How It Works"
          onPress={() =>
            Alert.alert(
              "How GERDBuddy Works",
              "1. Log what you eat and any symptoms you experience\n\n2. Over time, GERDBuddy looks for patterns between your meals and symptoms\n\n3. After about a week of consistent logging, you'll start seeing which foods may be connected to your symptoms\n\n4. Use these patterns to have more informed conversations with your doctor\n\nThis is a tracking tool — not a replacement for medical advice."
            )
          }
        />
        <SettingsCard
          icon={Heart}
          label="About the Developer"
          onPress={() =>
            Alert.alert(
              "About",
              "My name is Luke, and I'm a 19 year old college student who struggles with GERD. I built GERDBuddy to help others like me track their triggers and take control of their symptoms. I'm constantly working to improve the app and make it genuinely useful. If you have any suggestions, I'd love to hear them!"
            )
          }
        />
        {showFeedbackForm ? (
          <View className="bg-card rounded-2xl px-4 py-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Send Feedback</Text>
              <Pressable
                onPress={() => { setShowFeedbackForm(false); setFeedbackText(""); }}
                className="w-8 h-8 items-center justify-center rounded-full bg-muted/40"
              >
                <X size={16} color="#5f6f74" />
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
              className="rounded-xl p-3 text-foreground min-h-[100px] bg-background"
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
          <SettingsCard
            icon={MessageSquare}
            label="Send Feedback"
            subtitle="Bug reports, ideas, or questions"
            onPress={() => setShowFeedbackForm(true)}
          />
        )}
      </View>

      {/* Legal */}
      <View className="gap-3 mt-2">
        <Text className="text-lg font-bold text-foreground">Legal</Text>
        <SettingsCard
          icon={Shield}
          label="Privacy Policy"
          onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/privacy")}
        />
        <SettingsCard
          icon={FileText}
          label="Terms of Service"
          onPress={() => Linking.openURL("https://gerd-buddy-web.vercel.app/terms")}
        />
      </View>

      {/* Disclaimer */}
      <View className="bg-amber-50/70 rounded-2xl px-4 py-4 mt-2">
        <Text className="text-sm text-foreground font-semibold">
          This app is not medical advice
        </Text>
        <Text className="text-xs text-muted-foreground leading-relaxed mt-1">
          GERDBuddy is a personal tracking tool. It helps you spot patterns in your own data — it does not diagnose, treat, or cure any condition. Always talk to your doctor before making changes to your diet or treatment plan.
        </Text>
      </View>

      {/* Data */}
      <View className="gap-3 mt-2">
        <Text className="text-lg font-bold text-foreground">Data</Text>
        <SettingsCard
          icon={Trash2}
          iconColor="#c53030"
          label="Clear All Data"
          destructive
          onPress={() =>
            confirmAction(
              "Clear all data?",
              "This will delete all your logged meals, symptoms, and insights.",
              handleClearData
            )
          }
        />
        <SettingsCard
          icon={LogOut}
          iconColor="#5f6f74"
          label="Start Over"
          onPress={() =>
            confirmAction(
              "Start over?",
              "This will reset the app and take you back to onboarding. All data will be deleted.",
              handleStartOver
            )
          }
        />
      </View>

      {/* Version */}
      <View className="items-center gap-1 pt-4 pb-2">
        <Text className="text-xs text-muted-foreground/50">GERDBuddy v{APP_VERSION}</Text>
        <Text className="text-xs text-muted-foreground/50">Built by someone who gets it</Text>
      </View>
    </Screen>
  );
}
