import { Pressable, Text, View } from "react-native";
import * as Haptics from 'expo-haptics';
import { cn } from "../../utils/style";

export const SeverityDots = ({ value = 0, onChange, className = "" }) => {
  const handleTap = (next) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange?.(next);
  };

  return (
    <View className={cn("gap-2", className)}>
      <View className="flex-row items-center justify-between">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <Pressable
              key={n}
              onPress={() => handleTap(n)}
              hitSlop={12}
              className={cn(
                "w-12 h-12 rounded-full items-center justify-center",
                active
                  ? "bg-accent"
                  : "bg-card border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-base font-bold",
                  active ? "text-white" : "text-muted-foreground"
                )}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between px-2">
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
          Mild
        </Text>
        <Text className="text-[11px] font-semibold text-muted-foreground uppercase">
          Severe
        </Text>
      </View>
    </View>
  );
};

export default SeverityDots;
