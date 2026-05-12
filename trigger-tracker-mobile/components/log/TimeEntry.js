import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Clock, ChevronRight, Pencil } from "lucide-react-native";
import { cn } from "../../utils/style";
import { usePostHog } from "posthog-react-native";
import TimePickerSheet from "./TimePickerSheet";

const PRESETS = [
  { id: "15m", label: "15m ago", minutes: 15 },
  { id: "30m", label: "30m ago", minutes: 30 },
  { id: "1h", label: "1h ago", minutes: 60 },
  { id: "2h", label: "2h ago", minutes: 120 },
  { id: "earlier", label: "Earlier today", minutes: null },
];

const previewLabel = (d) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const TimeEntry = ({
  value,
  presetId = "now",
  onChange,
  label = "When?",
}) => {
  const [editing, setEditing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const posthog = usePostHog();

  const setNow = () => {
    onChange?.(new Date(), "now");
  };

  const applyPreset = (preset) => {
    if (preset.id === "earlier") {
      openSheet();
      return;
    }
    const next = new Date();
    next.setMinutes(next.getMinutes() - preset.minutes);
    onChange?.(next, preset.id);
  };

  const openSheet = () => {
    posthog?.capture("time_picker_opened");
    setSheetOpen(true);
  };

  if (!editing) {
    return (
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Pressable
          onPress={() => setEditing(true)}
          className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-card border border-border"
        >
          <Text className="text-foreground font-medium">
            {presetId === "now" ? "Just now" : previewLabel(value || new Date())}
          </Text>
          <View className="flex-row items-center gap-1">
            <Pencil size={14} color="#5f6f74" />
            <Text className="text-xs text-muted-foreground">edit</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">{label}</Text>
        </View>
        <Pressable onPress={() => setEditing(false)} hitSlop={8}>
          <Text className="text-xs text-muted-foreground">Done</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => {
            setNow();
          }}
          className={cn(
            "px-4 py-2 rounded-full",
            presetId === "now" ? "bg-primary" : "bg-card border border-border"
          )}
        >
          <Text
            className={cn(
              "text-sm font-semibold",
              presetId === "now" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Just now
          </Text>
        </Pressable>
        {PRESETS.map((preset) => {
          const active = presetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => applyPreset(preset)}
              className={cn(
                "px-4 py-2 rounded-full",
                active ? "bg-primary" : "bg-card border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  active ? "text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => openSheet()}
          className={cn(
            "px-4 py-2 rounded-full flex-row items-center gap-1",
            presetId === "custom" ? "bg-primary" : "bg-card border border-border"
          )}
        >
          <Text
            className={cn(
              "text-sm font-semibold",
              presetId === "custom" ? "text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Custom
          </Text>
          <ChevronRight
            size={14}
            color={presetId === "custom" ? "white" : "#5f6f74"}
          />
        </Pressable>
      </View>
      <TimePickerSheet
        visible={sheetOpen}
        initialDate={value || new Date()}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(d) => {
          setSheetOpen(false);
          onChange?.(d, "custom");
        }}
      />
    </View>
  );
};

export default TimeEntry;
