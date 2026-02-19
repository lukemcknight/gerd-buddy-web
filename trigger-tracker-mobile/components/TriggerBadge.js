import { Text, View } from "react-native";
import { cn } from "../utils/style";

export const TriggerBadge = ({ trigger, rank, className, style }) => {
  // Use confidence to determine severity level display
  const confidenceLevel = trigger.confidence >= 0.7 ? "high" : trigger.confidence >= 0.5 ? "medium" : "low";

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

  // Format confidence as percentage
  const confidencePercent = Math.round((trigger.confidence || 0) * 100);
  const symptomRate = trigger.symptomRate || 0;

  return (
    <View
      style={style}
      className={cn(
        "p-4 rounded-xl border",
        bgColors[confidenceLevel],
        className
      )}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View
            className={cn(
              "w-9 h-9 rounded-full items-center justify-center text-sm font-bold",
              confidenceLevel === "high"
                ? "bg-accent"
                : confidenceLevel === "medium"
                  ? "bg-warning"
                  : "bg-muted-foreground/20"
            )}
          >
            <Text
              className={cn(
                "font-bold",
                confidenceLevel === "high" || confidenceLevel === "medium"
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
              {symptomRate}% symptom rate ({trigger.occurrences}/{trigger.totalOccurrences || trigger.occurrences} meals)
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={cn("text-lg font-bold", textColors[confidenceLevel])}>
            {trigger.avgSeverity}/5
          </Text>
          <Text className="text-xs text-muted-foreground">avg severity</Text>
        </View>
      </View>
      {trigger.confidence !== undefined && (
        <View className="mt-2 pt-2 border-t border-border/50">
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted-foreground">
              Confidence: {confidencePercent}%
            </Text>
            {trigger.relativeRisk !== undefined && (
              <Text className="text-xs text-muted-foreground">
                {trigger.relativeRisk}x more likely
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default TriggerBadge;
