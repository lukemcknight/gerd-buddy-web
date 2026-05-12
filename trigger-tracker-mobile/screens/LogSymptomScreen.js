import { useState, useEffect } from "react";
import { Text, View } from "react-native";
import { Activity, FileText } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import LogScreenShell from "../components/log/LogScreenShell";
import ChipScroller from "../components/log/ChipScroller";
import SeverityDots from "../components/log/SeverityDots";
import TimeEntry from "../components/log/TimeEntry";
import SubmitFeedback from "../components/log/SubmitFeedback";
import { TextArea } from "../components/TextField";
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
  const [timePreset, setTimePreset] = useState("now");
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.screen("LogSymptom");
  }, []);

  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const typeLabels = selectedTypes
      .map((id) => symptomTypes.find((t) => t.id === id)?.label)
      .filter(Boolean);

    await saveSymptom({
      severity,
      symptomTypes: selectedTypes,
      timestamp: symptomTime.getTime(),
      notes: notes.trim() || undefined,
    });

    posthog?.capture("symptom_logged", {
      severity,
      severity_input: "dots",
      symptom_types: selectedTypes,
      has_notes: Boolean(notes.trim()),
      time_preset: timePreset,
    });

    const typeText =
      typeLabels.length > 0 ? typeLabels.join(", ") : `Severity ${severity}/5`;
    showToast("Symptom logged!", typeText);
    syncSmartNotifications().catch(() => {});
  };

  return (
    <LogScreenShell
      title="Log Symptom"
      onBack={() => navigation.goBack()}
      icon={
        <View className="w-10 h-10 rounded-full bg-accent-light items-center justify-center">
          <Activity size={18} color="#f07c52" />
        </View>
      }
      submitSlot={
        <SubmitFeedback
          variant="checkmark"
          label="Log Symptom"
          onSubmit={handleSubmit}
          onComplete={() => navigation.goBack()}
        />
      }
    >
      <View className="gap-3">
        <Text className="text-sm font-medium text-foreground">
          What are you feeling?
        </Text>
        <ChipScroller
          chips={symptomTypes}
          mode="multi"
          selectedIds={selectedTypes}
          onToggle={toggleType}
          wrap
        />
      </View>

      <View className="bg-card border border-border rounded-3xl p-5 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-foreground">
            Intensity
          </Text>
          <View className="px-3 py-1 rounded-full bg-primary-light">
            <Text className="text-primary text-lg font-bold">{severity}</Text>
          </View>
        </View>
        <SeverityDots value={severity} onChange={setSeverity} />
      </View>

      <TimeEntry
        value={symptomTime}
        presetId={timePreset}
        onChange={(date, preset) => {
          setSymptomTime(date);
          setTimePreset(preset);
        }}
        label="When did it start?"
      />

      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <FileText size={16} color="#3aa27f" />
          <Text className="text-sm font-medium text-foreground">
            Notes (optional)
          </Text>
        </View>
        <TextArea
          placeholder="Anything else? (what you ate, stress, etc.)"
          value={notes}
          onChangeText={setNotes}
          className="min-h-[90px]"
        />
      </View>
    </LogScreenShell>
  );
}
