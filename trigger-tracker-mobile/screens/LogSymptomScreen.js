import { useState, useEffect } from "react";
import { Text, View, Pressable, Image } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Activity, Clock, ArrowLeft, CalendarDays, FileText, ChevronRight } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { TextArea } from "../components/TextField";
import SeveritySlider from "../components/SeveritySlider";
import { saveSymptom } from "../services/storage";
import { showToast } from "../utils/feedback";
import { syncSmartNotifications } from "../services/notifications";

const symptomTypes = [
  { id: "heartburn", label: "Heartburn" },
  { id: "regurgitation", label: "Regurgitation" },
  { id: "bloating", label: "Bloating" },
  { id: "nausea", label: "Nausea" },
  { id: "chest_pain", label: "Chest Pain" },
  { id: "throat", label: "Sore Throat" },
  { id: "stomach_pain", label: "Stomach Pain" },
  { id: "gas", label: "Gas" },
  { id: "other", label: "Other" },
];

export default function LogSymptomScreen({ navigation }) {
  const [severity, setSeverity] = useState(2);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [notes, setNotes] = useState("");
  const [symptomTime, setSymptomTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [activePreset, setActivePreset] = useState("now");
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("LogSymptom");
  }, []);

  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const timePresets = [
    { id: "now", label: "Just now", minutes: 0 },
    { id: "15m", label: "15m ago", minutes: 15 },
    { id: "30m", label: "30m ago", minutes: 30 },
    { id: "1h", label: "1h ago", minutes: 60 },
  ];

  const applyPreset = (preset) => {
    const nextTime = new Date();
    nextTime.setMinutes(nextTime.getMinutes() - preset.minutes);
    setSymptomTime(nextTime);
    setActivePreset(preset.id);
  };

  const handleSubmit = async () => {
    const typeLabels = selectedTypes.map(
      (id) => symptomTypes.find((t) => t.id === id)?.label
    ).filter(Boolean);

    await saveSymptom({
      severity,
      symptomTypes: selectedTypes,
      timestamp: symptomTime.getTime(),
      notes: notes.trim() || undefined,
    });
    posthog?.capture("symptom_logged", {
      severity,
      symptom_types: selectedTypes,
      has_notes: Boolean(notes.trim()),
      time_preset: activePreset,
    });

    const typeText = typeLabels.length > 0 ? typeLabels.join(", ") : `Severity ${severity}/5`;
    showToast("Symptom logged!", typeText);
    navigation.goBack();
    syncSmartNotifications().catch(() => {});
  };

  return (
    <Screen contentClassName="gap-6 pb-24">
      <View className="flex-row items-center">
        <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-xl bg-muted/60">
          <ArrowLeft size={18} color="#1f2a30" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-base font-semibold text-foreground">Log Symptom</Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-accent-light items-center justify-center">
          <Activity size={18} color="#f07c52" />
        </View>
      </View>

      {/* Symptom type selection */}
      <View className="gap-3">
        <Text className="text-sm font-medium text-foreground">What are you feeling?</Text>
        <View className="flex-row flex-wrap gap-2">
          {symptomTypes.map((type) => {
            const isSelected = selectedTypes.includes(type.id);
            return (
              <Pressable
                key={type.id}
                onPress={() => toggleType(type.id)}
                className={[
                  "px-4 py-2.5 rounded-full",
                  isSelected ? "bg-accent" : "bg-card border border-border",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-sm font-semibold",
                    isSelected ? "text-white" : "text-foreground",
                  ].join(" ")}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Severity slider */}
      <View className="bg-card border border-border rounded-3xl p-5 space-y-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">Intensity</Text>
          <View className="px-3 py-1 rounded-full bg-primary-light">
            <Text className="text-primary text-lg font-bold">{severity}</Text>
          </View>
        </View>
        <SeveritySlider value={severity} onChange={setSeverity} showHeader={false} />
        <View className="flex-row justify-between px-1">
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Mild</Text>
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Moderate</Text>
          <Text className="text-[11px] font-semibold text-muted-foreground uppercase">Severe</Text>
        </View>
      </View>

      {/* Time presets */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">When did it start?</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {timePresets.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => applyPreset(preset)}
                className={[
                  "px-4 py-2 rounded-full",
                  isActive ? "bg-primary" : "bg-card border border-border",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-sm font-semibold",
                    isActive ? "text-primary-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => {
            setShowPicker(true);
            setActivePreset("custom");
          }}
          className="w-full px-4 py-4 rounded-2xl border border-border bg-card flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3">
            <CalendarDays size={18} color="#3aa27f" />
            <View>
              <Text className="text-sm font-semibold text-foreground">Custom time</Text>
              <Text className="text-xs text-muted-foreground">
                {symptomTime.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#5f6f74" />
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={symptomTime}
            mode="datetime"
            display="default"
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) {
                setSymptomTime(date);
                setActivePreset("custom");
              }
            }}
          />
        )}
      </View>

      {/* Notes */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <FileText size={16} color="#3aa27f" />
          <Text className="text-sm font-medium text-foreground">Notes (optional)</Text>
        </View>
        <TextArea
          placeholder="Anything else? (what you ate, stress, etc.)"
          value={notes}
          onChangeText={setNotes}
          className="min-h-[90px] rounded-2xl"
        />
      </View>

      <Button onPress={handleSubmit} className="w-full rounded-full py-4 bg-accent shadow-lg">
        <Text className="text-accent-foreground font-semibold text-base">Log Symptom</Text>
      </Button>
    </Screen>
  );
}
