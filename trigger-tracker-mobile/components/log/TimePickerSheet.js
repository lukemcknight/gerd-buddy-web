import { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import * as Haptics from 'expo-haptics';
import Button from "../Button";

const PAD = (n) => String(n).padStart(2, "0");

const buildDayOptions = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const label =
      i === 0
        ? "Today"
        : i === 1
        ? "Yesterday"
        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    return { value: i, label };
  });
};

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: PAD(h),
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  value: i * 5,
  label: PAD(i * 5),
}));

const toComposed = (daysAgo, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const previewLabel = (d) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const TimePickerSheet = ({
  visible,
  initialDate,
  onCancel,
  onConfirm,
}) => {
  const days = useMemo(buildDayOptions, [visible]);

  const initial = useMemo(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAgo = Math.max(
      0,
      Math.min(6, Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86_400_000))
    );
    const minute = Math.round(d.getMinutes() / 5) * 5;
    return { daysAgo, hour: d.getHours(), minute: minute === 60 ? 55 : minute };
  }, [initialDate, visible]);

  const [daysAgo, setDaysAgo] = useState(initial.daysAgo);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  useEffect(() => {
    if (visible) {
      setDaysAgo(initial.daysAgo);
      setHour(initial.hour);
      setMinute(initial.minute);
    }
  }, [visible]);

  const tick = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const composed = toComposed(daysAgo, hour, minute);
  const now = new Date();
  const isFuture = composed > now;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCancel} />
      <View className="bg-background rounded-t-3xl px-5 pt-4 pb-8">
        <View className="self-center w-10 h-1.5 rounded-full bg-muted mb-4" />
        <Text className="text-center text-sm text-muted-foreground mb-2">
          {previewLabel(composed)}
          {isFuture ? "  ·  using current time" : ""}
        </Text>
        <View className="flex-row justify-between gap-2 mb-6">
          <View className="flex-1">
            <WheelPicker
              data={days}
              value={daysAgo}
              onValueChanged={({ item }) => {
                tick();
                setDaysAgo(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
          <View className="w-16">
            <WheelPicker
              data={HOURS}
              value={hour}
              onValueChanged={({ item }) => {
                tick();
                setHour(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
          <View className="w-16">
            <WheelPicker
              data={MINUTES}
              value={minute}
              onValueChanged={({ item }) => {
                tick();
                setMinute(item.value);
              }}
              itemHeight={40}
              visibleItemCount={5}
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onPress={() => onConfirm?.(isFuture ? now : composed)}
            className="flex-1"
          >
            Set time
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default TimePickerSheet;
