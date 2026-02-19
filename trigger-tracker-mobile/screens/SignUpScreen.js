import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Mail, Lock, ChevronRight } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/TextField";
import { useAuth } from "../contexts/AuthContext";
import { restoreTransactions } from "../services/revenuecat";

export default function SignUpScreen({ navigation, onSkip }) {
  const { signUp, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return false;
    }
    if (!password) {
      setLocalError("Please enter a password.");
      return false;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    setLocalError(null);
    clearError();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password);

      // Check if user already has an active subscription (e.g., started trial before creating account)
      setStatusMessage("Checking subscription status...");
      try {
        const result = await restoreTransactions();
        if (result.active) {
          // User has active subscription - go directly to main app
          navigation.replace("Main");
          return;
        }
      } catch (error) {
        console.warn("Subscription restore failed:", error);
        // Fall through to paywall - user can retry restore there
      }
      navigation.replace("Paywall");
    } catch (err) {
      // Error is already set in context
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    // Navigate to Paywall after skipping signup
    navigation.replace("Paywall");
  };

  const displayError = localError || error;

  return (
    <Screen scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center gap-6">
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Create Account
            </Text>
            <Text className="text-center text-muted-foreground">
              Sign up to sync your data across devices
            </Text>
          </View>

          <Card className="gap-4 p-4">
            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Email</Text>
              <View className="flex-row items-center gap-3">
                <Mail size={20} color="#5f6f74" />
                <Input
                  className="flex-1"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setLocalError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                Password
              </Text>
              <View className="flex-row items-center gap-3">
                <Lock size={20} color="#5f6f74" />
                <Input
                  className="flex-1"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setLocalError(null);
                  }}
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                Confirm Password
              </Text>
              <View className="flex-row items-center gap-3">
                <Lock size={20} color="#5f6f74" />
                <Input
                  className="flex-1"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setLocalError(null);
                  }}
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
            </View>

            {displayError && (
              <View className="rounded-lg bg-red-50 p-3">
                <Text className="text-sm text-red-700">{displayError}</Text>
              </View>
            )}

            {statusMessage && !displayError && (
              <View className="flex-row items-center justify-center gap-2 p-3">
                <ActivityIndicator size="small" color="#3aa27f" />
                <Text className="text-sm text-muted-foreground">{statusMessage}</Text>
              </View>
            )}

            <Button
              onPress={handleSignUp}
              disabled={loading}
              className="mt-2"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-semibold text-primary-foreground">
                  Create Account
                </Text>
              )}
            </Button>
          </Card>

          <View className="items-center gap-4">
            <Pressable
              onPress={() => navigation.navigate("Login")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-muted-foreground">
                Already have an account?
              </Text>
              <Text className="font-semibold text-primary">Sign In</Text>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              className="flex-row items-center gap-1"
            >
              <Text className="text-muted-foreground">Skip for now</Text>
              <ChevronRight size={16} color="#5f6f74" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
