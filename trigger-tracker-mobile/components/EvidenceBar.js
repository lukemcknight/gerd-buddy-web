import { Text, View } from "react-native";

const toneColors = {
  primary: "#154212",
  symptom: "#9e4132",
  gold: "#b87518",
  ink: "#303030",
};

export default function EvidenceBar({
  label,
  value,
  percent,
  tone = "primary",
  fillColor,
}) {
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  const color = fillColor || toneColors[tone] || toneColors.primary;

  return (
    <View style={{ gap: 7 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Text>
        <Text className="text-[11px] font-semibold text-foreground">{value}</Text>
      </View>
      <View className="h-1.5 rounded-full bg-muted overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${safePercent === 0 ? 0 : Math.max(4, safePercent)}%`,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
