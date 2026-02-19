import { Text, View } from "react-native";
import { cn } from "../utils/style";

export const TriggerBadge = ({ trigger, rank, className, style }) => {
  const severityLevel =
    trigger.avgSeverity >= 3 ? "high" : trigger.avgSeverity >= 2 ? "medium" : "low";

  const bgColors = {
    high: "bg-accent/10 border-accent/30",
    medium: "bg-warning/10 border-warning/30",
    low: "bg-muted border-border",
  };

  const textColors = {
    high: "text-accent",
    medium: "text-warning",
    low: "text-muted-foreground",
  };

  return (
    <View
      style={style}
      className={cn(
        "flex-row items-center justify-between p-4 rounded-xl border",
        bgColors[severityLevel],
        className
      )}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={cn(
            "w-9 h-9 rounded-full items-center justify-center text-sm font-bold",
            severityLevel === "high"
              ? "bg-accent"
              : severityLevel === "medium"
                ? "bg-warning"
                : "bg-muted-foreground/20"
          )}
        >
          <Text
            className={cn(
              "font-bold",
              severityLevel === "high" || severityLevel === "medium"
                ? "text-white"
                : "text-muted-foreground"
            )}
          >
            {rank}
          </Text>
        </View>
        <View>
          <Text className="font-semibold text-foreground capitalize">
            {trigger.ingredient}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {trigger.occurrences} occurrences
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className={cn("text-lg font-bold", textColors[severityLevel])}>
          {trigger.avgSeverity}/5
        </Text>
        <Text className="text-xs text-muted-foreground">avg severity</Text>
      </View>
    </View>
  );
};

export default TriggerBadge;
