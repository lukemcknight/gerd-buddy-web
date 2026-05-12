import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

export const LogScreenShell = ({
  title,
  subtitle,
  icon,
  onBack,
  submitSlot,
  children,
}) => {
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-row items-center gap-3 px-5 pt-3 pb-2">
          <Pressable onPress={onBack} className="p-2 rounded-xl bg-muted/60" hitSlop={8}>
            <ArrowLeft size={18} color="#1f2a30" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{title}</Text>
            {subtitle ? (
              <Text className="text-sm text-muted-foreground">{subtitle}</Text>
            ) : null}
          </View>
          {icon ? <View>{icon}</View> : null}
        </View>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {submitSlot ? (
          <View className="px-5 pt-3 pb-10 border-t border-border bg-background">
            {submitSlot}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LogScreenShell;
