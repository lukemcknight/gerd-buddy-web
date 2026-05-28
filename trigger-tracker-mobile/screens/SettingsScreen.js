import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View, Switch } from "react-native";
import {
  Bell, Trash2, Info, ChevronRight, LogOut, Moon, CreditCard, FileText, Shield,
  User, Mail, Heart, MessageSquare, Send, X, Sparkles,
} from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import Screen from "../components/Screen";
import Button from "../components/Button";
import BrandMark from "../components/BrandMark";
import { clearAllData, getUser, saveUser } from "../services/storage";
import { loadDemoData } from "../services/demoData";
import { getSubscriptionStatus } from "../services/revenuecat";
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

const COLORS = {
  primary: "#154212",
  primaryDark: "#0d3a2b",
  primaryLight: "#ecf5e9",
  accent: "#9e4132",
  accentLight: "#fff3ef",
  background: "#fcf9f8",
  card: "#ffffff",
  text: "#1b1c1c",
  textSecondary: "#72796e",
  border: "#e5e2d9",
  muted: "#f0eded",
  outline: "#c2c9bb",
  warning: "#774400",
  warningBorder: "#f4ddbd",
  warningLight: "#fff5e8",
  destructive: "#9e4132",
  destructiveLight: "#fff3ef",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
  },
  settingsCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  iconWell: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  profilePanel: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16,
  },
  logoPlate: {
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    marginRight: 14,
    width: 58,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upgradeBanner: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDark,
    borderRadius: 18,
    flexDirection: "row",
    padding: 18,
  },
  upgradeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    marginRight: 14,
    width: 44,
  },
});

const SettingsCard = ({ icon: Icon, iconColor = COLORS.primary, iconBackgroundColor, label, subtitle, onPress, right, destructive, children }) => {
  const tone = destructive ? COLORS.destructive : iconColor;
  const wellColor = destructive
    ? COLORS.destructiveLight
    : iconBackgroundColor || COLORS.primaryLight;

  const content = (
    <View style={styles.settingsCard}>
      <View style={[styles.iconWell, { backgroundColor: wellColor }]}>
        <Icon size={20} color={tone} />
      </View>
      <View className="flex-1">
        <Text
          className="text-base font-semibold"
          style={{ color: destructive ? COLORS.destructive : COLORS.text }}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            className="text-sm mt-0.5"
            numberOfLines={1}
            style={{ color: COLORS.textSecondary }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right || (onPress && <ChevronRight size={20} color={COLORS.textSecondary} />)}
    </View>
  );
  if (children) {
    return <View style={[styles.card, { padding: 16 }]}>{children}</View>;
  }
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }
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
  const [isPro, setIsPro] = useState(false);
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
      try {
        const status = await getSubscriptionStatus(profile?.id);
        setIsPro(Boolean(status?.active));
      } catch {
        setIsPro(false);
      }
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

  const handleLoadDemoData = async () => {
    try {
      const { mealCount, symptomCount } = await loadDemoData();
      showToast("Demo data loaded", `${mealCount} meals · ${symptomCount} symptoms`);
    } catch (err) {
      console.warn("Failed to load demo data", err);
      showToast("Failed to load demo data");
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

  const profileName = isAuthenticated
    ? authUser?.email?.split("@")[0]
    : "Local profile";
  const profileSubtitle = isAuthenticated
    ? authUser?.email
    : "Evidence and reminders stay on this device";

  return (
    <Screen contentClassName="gap-5 pb-8">
      {/* Profile header */}
      <View style={styles.profilePanel}>
        <View style={styles.logoPlate}>
          <BrandMark variant="dark" size={42} />
        </View>
        <View className="flex-1">
          <Text
            className="text-xl font-bold"
            style={{ color: COLORS.primaryDark }}
          >
            GERDBuddy
          </Text>
          <Text className="text-sm font-semibold mt-0.5" style={{ color: COLORS.text }}>
            {profileName}
          </Text>
          <Text className="text-xs mt-0.5" numberOfLines={1} style={{ color: COLORS.textSecondary }}>
            {profileSubtitle}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: isPro ? COLORS.primaryLight : COLORS.muted },
          ]}
        >
          <Text
            className="text-xs font-bold uppercase"
            style={{ color: isPro ? COLORS.primary : COLORS.textSecondary }}
          >
            {isPro ? "Pro" : "Free"}
          </Text>
        </View>
      </View>

      {/* Upgrade to Pro banner */}
      {!isPro && (
        <Pressable
          onPress={() => navigation.navigate("Paywall", { trigger_source: "settings" })}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeBadge}>
              <CreditCard size={22} color={COLORS.white} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">Upgrade to Pro</Text>
              <Text className="text-white/80 text-sm mt-0.5">
                Unlimited scans, trigger confidence, and doctor-ready reports.
              </Text>
            </View>
            <ChevronRight size={22} color={COLORS.white} />
          </View>
        </Pressable>
      )}

      {/* Notifications */}
      <View className="gap-3">
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Notifications</Text>
        <SettingsCard
          icon={Bell}
          label="Daily Reminders"
          subtitle="Remind me to log meals"
          right={
            <Switch
              value={remindersEnabled}
              onValueChange={handleRemindersToggle}
              trackColor={{ false: COLORS.outline, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <SettingsCard
          icon={Moon}
          iconColor={COLORS.textSecondary}
          iconBackgroundColor={COLORS.muted}
          label="Evening Reminder"
          subtitle="Avoid eating 2 hours before bed"
          right={
            <Switch
              value={eveningReminderEnabled}
              onValueChange={handleEveningReminderToggle}
              trackColor={{ false: COLORS.outline, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        {!notificationPermission.granted && !notificationPermission.provisional && (
          <View
            className="rounded-xl px-4 py-4 gap-3 border"
            style={{
              backgroundColor: COLORS.warningLight,
              borderColor: COLORS.warningBorder,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Info size={18} color={COLORS.warning} />
              <Text className="font-semibold" style={{ color: COLORS.warning }}>
                Notifications are off
              </Text>
            </View>
            <Text className="text-sm" style={{ color: COLORS.warning }}>
              {Platform.OS === "ios"
                ? "Tap below, then tap Notifications and turn on Allow Notifications."
                : "Tap below to enable notifications in system settings."}
            </Text>
            <Button
              variant="outline"
              className="w-full"
              style={{ borderColor: COLORS.warningBorder }}
              onPress={openNotificationSettings}
            >
              <Text className="font-semibold" style={{ color: COLORS.text }}>
                Open Settings
              </Text>
            </Button>
          </View>
        )}
      </View>

      {/* Account */}
      {isFirebaseConfigured && (
        <View className="gap-3">
          <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Account</Text>
          {isAuthenticated ? (
            <>
              <SettingsCard
                icon={Mail}
                label="Email"
                subtitle={authUser?.email}
              />
              <SettingsCard
                icon={LogOut}
                iconColor={COLORS.textSecondary}
                iconBackgroundColor={COLORS.muted}
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
                iconColor={COLORS.textSecondary}
                iconBackgroundColor={COLORS.muted}
                label="Sign In"
                onPress={() => navigation.navigate("Login")}
              />
            </>
          )}
        </View>
      )}

      {/* Subscription */}
      {isPro && (
        <View className="gap-3">
          <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Subscription</Text>
          <SettingsCard
            icon={CreditCard}
            label="Manage Subscription"
            onPress={() => navigation.navigate("CustomerCenter")}
          />
          <SettingsCard
            icon={X}
            label="Cancel Subscription"
            destructive
            onPress={() => navigation.navigate("CancelSubscription")}
          />
        </View>
      )}

      {/* Help */}
      <View className="gap-3">
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Help</Text>
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
          <View style={[styles.card, { padding: 16 }]} className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: COLORS.text }}>
                Send Feedback
              </Text>
              <Pressable
                onPress={() => { setShowFeedbackForm(false); setFeedbackText(""); }}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={({ pressed }) => [
                  { backgroundColor: COLORS.muted },
                  pressed && styles.pressed,
                ]}
              >
                <X size={16} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
              Bug reports, feature ideas, or just saying hi — I read every message.
            </Text>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="What's on your mind?"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="rounded-xl p-3 min-h-[100px]"
              style={{
                backgroundColor: COLORS.background,
                borderColor: COLORS.border,
                borderWidth: 1,
                color: COLORS.text,
              }}
            />
            <Button
              onPress={handleSendFeedback}
              disabled={!feedbackText.trim() || isSendingFeedback}
              className="w-full"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Send size={16} color={COLORS.white} />
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
      <View className="gap-3">
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Legal</Text>
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
      <View
        className="rounded-xl px-4 py-4 border"
        style={{ backgroundColor: COLORS.warningLight, borderColor: COLORS.warningBorder }}
      >
        <Text className="text-sm font-semibold" style={{ color: COLORS.text }}>
          This app is not medical advice
        </Text>
        <Text className="text-xs leading-relaxed mt-1" style={{ color: COLORS.textSecondary }}>
          GERDBuddy is a personal tracking tool. It helps you spot patterns in your own data — it does not diagnose, treat, or cure any condition. Always talk to your doctor before making changes to your diet or treatment plan.
        </Text>
      </View>

      {/* Data */}
      <View className="gap-3">
        <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Data</Text>
        {__DEV__ && (
          <SettingsCard
            icon={Sparkles}
            label="Load demo data"
            subtitle="Populates app with sample data for screenshots"
            onPress={() =>
              confirmAction(
                "Load demo data?",
                "This replaces your logged meals and symptoms with 14 days of sample data.",
                handleLoadDemoData
              )
            }
          />
        )}
        <SettingsCard
          icon={Trash2}
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
          iconColor={COLORS.textSecondary}
          iconBackgroundColor={COLORS.muted}
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
        <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
          GERDBuddy v{APP_VERSION}
        </Text>
        <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
          Built by someone who gets it
        </Text>
      </View>
    </Screen>
  );
}
