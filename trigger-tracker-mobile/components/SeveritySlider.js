import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "../utils/style";

const severityLabels = ["None", "Mild", "Light", "Moderate", "Severe", "Intense"];
const severityEmojis = ["😊", "😐", "😕", "😣", "😖", "😫"];

const severityColor = (value) => {
  if (value <= 1) return "text-success";
  if (value <= 3) return "text-warning";
  return "text-accent";
};

export const SeveritySlider = ({ value, onChange, className, showHeader = true }) => {
  const [trackWidth, setTrackWidth] = useState(1);
  const [trackX, setTrackX] = useState(0);
  const trackRef = useRef(null);
  const percentage = useMemo(() => (value / 5) * 100, [value]);

  const clampValue = (next) => Math.min(5, Math.max(0, Math.round(next)));
  const updateFromPageX = (pageX) => {
    const locationX = pageX - trackX;
    const raw = Math.min(Math.max(locationX / trackWidth, 0), 1);
    const next = clampValue(raw * 5);
    onChange?.(next);
  };

  return (
    <View className={cn("space-y-4", className)}>
      {showHeader && (
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground font-medium">Severity</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">{severityEmojis[value]}</Text>
            <Text className={cn("font-semibold", severityColor(value))}>
              {severityLabels[value]}
            </Text>
          </View>
        </View>
      )}

      <View className="space-y-3">
        <View
          ref={trackRef}
          onLayout={({ nativeEvent }) => {
            setTrackWidth(nativeEvent.layout.width || 1);
            trackRef.current?.measureInWindow((x) => setTrackX(x));
          }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={({ nativeEvent }) => updateFromPageX(nativeEvent.pageX)}
          onResponderMove={({ nativeEvent }) => updateFromPageX(nativeEvent.pageX)}
          className="relative w-full h-10 justify-center"
        >
          <View className="h-3 w-full rounded-full overflow-hidden">
            <LinearGradient
              colors={["#3aa27f", "#f2b440", "#f07c52"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>
          <View
            className="absolute w-6 h-6 rounded-full border-2 border-primary bg-white"
            style={{
              left: `${percentage}%`,
              top: "50%",
              transform: [{ translateX: -12 }, { translateY: -12 }],
            }}
          />
          <View className="absolute inset-x-0 flex-row justify-between items-center px-1">
            {[0, 1, 2, 3, 4, 5].map((num) => (
              <View key={num} className="w-2 h-2 rounded-full bg-white/80" />
            ))}
          </View>
        </View>
        <View className="flex-row justify-between px-1">
          <Text className="text-xs font-semibold text-muted-foreground">0</Text>
          <Text className="text-xs font-semibold text-muted-foreground">5</Text>
        </View>
      </View>
    </View>
  );
};

export default SeveritySlider;
