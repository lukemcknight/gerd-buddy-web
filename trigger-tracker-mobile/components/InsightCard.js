import { Text, View } from "react-native";
import { Flame, Clock, Sparkles, TrendingUp, AlertTriangle } from "lucide-react-native";
import { cn } from "../utils/style";

const iconMap = {
  trigger: Flame,
  time: Clock,
  positive: Sparkles,
  streak: TrendingUp,
};

const severityBackgrounds = {
  low: "border-success/30 bg-success-light",
  medium: "border-warning/30 bg-warning-light",
  high: "border-accent/30 bg-accent-light",
};

const severityIconColors = {
  low: "text-success",
  medium: "text-warning",
  high: "text-accent",
};

export const InsightCard = ({ insight, className, style }) => {
  const Icon = iconMap[insight.type] || AlertTriangle;
  const severity = insight.severity || "low";

  return (
    <View
      style={style}
      className={cn(
        "border border-border rounded-2xl p-4 bg-card",
        severityBackgrounds[severity],
        className
      )}
    >
      <View className="flex-row gap-3">
        <View className={cn("mt-0.5", severityIconColors[severity])}>
          <Icon size={20} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {insight.title}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default InsightCard;
