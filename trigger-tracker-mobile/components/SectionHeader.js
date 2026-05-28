import { Text, View } from "react-native";

const toneColors = {
  primary: "#154212",
  symptom: "#9e4132",
  gold: "#774400",
  ink: "#303030",
};

export default function SectionHeader({
  icon: Icon,
  tone = "primary",
  title,
  subtitle,
  trailing,
}) {
  const color = toneColors[tone] || toneColors.primary;
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2 flex-1">
        {Icon ? <Icon size={20} color={color} strokeWidth={2} /> : null}
        <View className="flex-1">
          <Text className="text-base font-semibold text-primary">{title}</Text>
          {subtitle ? (
            <Text className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
