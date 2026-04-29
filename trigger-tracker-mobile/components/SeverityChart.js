import { Text, View } from "react-native";
import Card from "./Card";
import { SEVERITY_MAX } from "../utils/severityChart";

const BAR_HEIGHT = 88;
const MIN_BAR_HEIGHT = 4;

const barColor = (avg) => {
  if (avg <= 0) return "#e5e7eb";
  if (avg <= 1.5) return "#5db88a";
  if (avg <= 3) return "#e0a93a";
  return "#d44040";
};

export const SeverityChart = ({ data }) => {
  const safe = Array.isArray(data) ? data : [];
  const totalCount = safe.reduce((acc, d) => acc + (d.count || 0), 0);
  const isEmpty = totalCount === 0;

  return (
    <Card className="p-4">
      <View className="flex-row items-end justify-between mb-3">
        <Text className="text-base font-semibold text-foreground">Last 7 days</Text>
        <Text className="text-xs text-muted-foreground">Avg severity</Text>
      </View>

      <View
        style={{ height: BAR_HEIGHT, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}
      >
        {safe.map((day, i) => {
          const ratio = Math.min(1, Math.max(0, day.avgSeverity / SEVERITY_MAX));
          const heightPx = day.count > 0
            ? Math.max(MIN_BAR_HEIGHT, ratio * BAR_HEIGHT)
            : MIN_BAR_HEIGHT;
          return (
            <View
              key={`${day.dateMs}-${i}`}
              style={{
                width: 24,
                height: heightPx,
                backgroundColor: barColor(day.avgSeverity),
                borderRadius: 6,
              }}
            />
          );
        })}
      </View>

      <View className="flex-row justify-between mt-2">
        {safe.map((day, i) => (
          <Text
            key={`label-${day.dateMs}-${i}`}
            className="text-xs text-muted-foreground"
            style={{ width: 24, textAlign: "center" }}
          >
            {day.dayLabel}
          </Text>
        ))}
      </View>

      {isEmpty && (
        <Text className="text-xs text-muted-foreground text-center mt-3">
          No symptoms logged this week — keep it up.
        </Text>
      )}
    </Card>
  );
};

export default SeverityChart;
