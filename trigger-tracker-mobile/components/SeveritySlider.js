import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "../utils/style";

const severityLabels = ["None", "Mild", "Light", "Moderate", "Severe", "Intense"];
const severityEmojis = ["😊", "😐", "😕", "😣", "😖", "😫"];

const severityColor = (value) => {
  if (value <= 1) return "text-success";
  if (value <= 3) return "text-warning";
  return "text-accent";
};

export const SeveritySlider = ({ value, onChange, className }) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const percentage = useMemo(() => (value / 5) * 100, [value]);

  return (
    <View className={cn("space-y-4", className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground font-medium">Severity</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl">{severityEmojis[value]}</Text>
          <Text className={cn("font-semibold", severityColor(value))}>
            {severityLabels[value]}
          </Text>
        </View>
      </View>

      <View className="space-y-3">
        <Pressable
          onLayout={({ nativeEvent }) => setTrackWidth(nativeEvent.layout.width || 1)}
          onPress={({ nativeEvent }) => {
            const raw = Math.min(Math.max(nativeEvent.locationX / trackWidth, 0), 1);
            const next = Math.round(raw * 5);
            onChange?.(next);
          }}
          className="relative h-3 w-full rounded-full bg-muted overflow-hidden"
        >
          <View
            style={{ width: `${percentage}%`, backgroundColor: "#3aa27f" }}
            className="absolute left-0 top-0 bottom-0 rounded-full"
          />
        </Pressable>
        <View className="flex-row justify-between px-1">
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <Pressable
              key={num}
              onPress={() => onChange?.(num)}
              className={cn(
                "w-9 h-9 rounded-full items-center justify-center",
                value === num ? "bg-primary" : "bg-muted"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  value === num ? "text-primary-foreground" : "text-foreground"
                )}
              >
                {num}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

export default SeveritySlider;
