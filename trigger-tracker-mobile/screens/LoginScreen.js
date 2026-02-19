import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Mail, Lock, ChevronLeft } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/TextField";
import { useAuth } from "../contexts/AuthContext";
import { restoreTransactions } from "../services/revenuecat";

export default function LoginScreen({ navigation, onSuccess }) {
  const { signIn, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const validateForm = () => {
    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return false;
    }
    if (!password) {
      setLocalError("Please enter your password.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setLocalError(null);
    clearError();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);

      if (onSuccess) {
        // Check/restore subscription before deciding navigation
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
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err) {
      // Error is already set in context
    } finally {
      setLoading(false);
    }
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
              Welcome Back
            </Text>
            <Text className="text-center text-muted-foreground">
              Sign in to access your account
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
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setLocalError(null);
                  }}
                  secureTextEntry
                  autoComplete="current-password"
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

            <Button onPress={handleLogin} disabled={loading} className="mt-2">
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-semibold text-primary-foreground">
                  Sign In
                </Text>
              )}
            </Button>
          </Card>

          <View className="items-center gap-4">
            <Pressable
              onPress={() => navigation.navigate("SignUp")}
              className="flex-row items-center gap-1"
            >
              <Text className="text-muted-foreground">
                Don't have an account?
              </Text>
              <Text className="font-semibold text-primary">Sign Up</Text>
            </Pressable>

            {navigation.canGoBack() && (
              <Pressable
                onPress={() => navigation.goBack()}
                className="flex-row items-center gap-1"
              >
                <ChevronLeft size={16} color="#5f6f74" />
                <Text className="text-muted-foreground">Go back</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
