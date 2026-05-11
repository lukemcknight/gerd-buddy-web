import { ScrollView, View, Pressable, Text } from "react-native";
import { cn } from "../../utils/style";

export const ChipScroller = ({
  chips = [],
  mode = "single",
  selectedIds = [],
  onToggle,
  onPress,
  wrap = false,
  chipClassName = "",
  selectedChipClassName = "bg-accent",
  textClassName = "text-foreground",
  selectedTextClassName = "text-white",
}) => {
  const renderChip = (chip) => {
    const isSelected =
      (mode === "single" || mode === "multi") && selectedIds.includes(chip.id);
    const handlePress = () => {
      if (mode === "action") {
        onPress?.(chip.id, chip);
        return;
      }
      onToggle?.(chip.id, chip);
    };
    return (
      <Pressable
        key={chip.id}
        onPress={handlePress}
        className={cn(
          "px-4 py-2.5 rounded-full",
          isSelected
            ? selectedChipClassName
            : "bg-card border border-border",
          chipClassName
        )}
      >
        <Text
          className={cn(
            "text-sm font-semibold",
            isSelected ? selectedTextClassName : textClassName
          )}
        >
          {chip.label}
        </Text>
      </Pressable>
    );
  };

  if (wrap) {
    return (
      <View className="flex-row flex-wrap gap-2">{chips.map(renderChip)}</View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    >
      {chips.map(renderChip)}
    </ScrollView>
  );
};

export default ChipScroller;
