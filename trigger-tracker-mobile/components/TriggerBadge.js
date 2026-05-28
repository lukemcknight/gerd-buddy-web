import { Text, View } from "react-native";
import { cn } from "../utils/style";
import ProgressRing from "./ProgressRing";

const clampPercent = (value) => Math.min(100, Math.max(0, Number(value) || 0));

const SeverityDots = ({ value }) => {
  const filled = Math.round(Number(value) || 0);
  return (
    <View className="flex-row gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <View
          key={index}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: index < filled ? "#9e4132" : "#e5e2d9",
          }}
        />
      ))}
    </View>
  );
};

export const TriggerBadge = ({ trigger, rank, className, style, showDetails = true }) => {
  // Use confidence to determine severity level display
  const confidenceLevel = trigger.confidence >= 0.7 ? "high" : trigger.confidence >= 0.5 ? "medium" : "low";

  const textColors = {
    high: "text-accent",
    medium: "text-warning",
    low: "text-muted-foreground",
  };

  // Format confidence as percentage
  const confidencePercent = clampPercent(Math.round((trigger.confidence || 0) * 100));
  const symptomRate = clampPercent(trigger.symptomRate || 0);
  const ringColor = confidenceLevel === "high"
    ? "#9e4132"
    : confidenceLevel === "medium"
      ? "#b87518"
      : "#72796e";
  const riskLabel = confidenceLevel === "high"
    ? "Strong Signal"
    : confidenceLevel === "medium"
      ? "Building"
      : "Early";

  return (
    <View
      style={style}
      className={cn(
        "p-4 rounded-xl border border-border bg-card",
        className
      )}
    >
      <View className="flex-row items-start gap-4">
        <ProgressRing
          progress={showDetails ? confidencePercent : 100}
          size={64}
          strokeWidth={5}
          color={ringColor}
        >
          {showDetails ? (
            <>
              <Text className={cn("text-[13px] font-bold", textColors[confidenceLevel])}>
                {confidencePercent}%
              </Text>
            </>
          ) : (
            <Text
              className={cn(
                "text-base font-bold",
                confidenceLevel === "high" || confidenceLevel === "medium"
                  ? textColors[confidenceLevel]
                  : "text-muted-foreground"
              )}
            >
              #{rank}
            </Text>
          )}
        </ProgressRing>

        <View className="flex-1 gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="font-semibold text-foreground capitalize">
                {trigger.ingredient}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {trigger.occurrences}/{trigger.totalOccurrences || trigger.occurrences} logs with symptoms
              </Text>
            </View>
            <View className="items-end gap-1">
              <View className="rounded-full border border-accent/20 bg-accent-light px-2 py-0.5">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  {riskLabel}
                </Text>
              </View>
              <SeverityDots value={trigger.avgSeverity} />
              <Text className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {trigger.avgSeverity}/5 avg
              </Text>
            </View>
          </View>

          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symptom rate</Text>
              <Text className={cn("text-xs font-semibold", textColors[confidenceLevel])}>
                {symptomRate}%
              </Text>
            </View>
            <View className="h-1.5 rounded-full bg-muted overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${symptomRate === 0 ? 0 : Math.max(4, symptomRate)}%`,
                  backgroundColor:
                    confidenceLevel === "high"
                      ? "#9e4132"
                      : confidenceLevel === "medium"
                        ? "#b87518"
                        : "#72796e",
                }}
              />
            </View>
          </View>
        </View>
      </View>
      {showDetails && trigger.confidence !== undefined && (
        <View className="mt-3 pt-3 border-t border-border">
          <View className="flex-row justify-between">
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Confidence {confidencePercent}%
            </Text>
            {trigger.relativeRisk !== undefined && (
              <Text className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
