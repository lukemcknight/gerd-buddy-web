import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { Activity, Clock, ArrowLeft } from "lucide-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { TextArea } from "../components/TextField";
import SeveritySlider from "../components/SeveritySlider";
import { saveSymptom } from "../services/storage";
import { showToast } from "../utils/feedback";

export default function LogSymptomScreen() {
  const navigation = useNavigation();
  const [severity, setSeverity] = useState(2);
  const [notes, setNotes] = useState("");
  const [symptomTime, setSymptomTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = async () => {
    await saveSymptom({
      severity,
      timestamp: symptomTime.getTime(),
      notes: notes.trim() || undefined,
    });
    showToast("Symptom logged!", `Severity ${severity}/5 recorded.`);
    navigation.goBack();
  };

  return (
    <Screen contentClassName="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-xl bg-muted/60">
          <ArrowLeft size={18} color="#1f2a30" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">Log Symptom</Text>
          <Text className="text-sm text-muted-foreground">How are you feeling?</Text>
        </View>
        <View className="w-12 h-12 rounded-2xl bg-accent/10 items-center justify-center">
          <Activity size={22} color="#f07c52" />
        </View>
      </View>

      <View className="bg-card border border-border rounded-2xl p-5">
        <SeveritySlider value={severity} onChange={setSeverity} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">When did symptoms start?</Text>
        </View>
        <Pressable
          onPress={() => setShowPicker(true)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card"
        >
          <Text className="text-foreground">
            {symptomTime.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={symptomTime}
            mode="datetime"
            display="default"
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) setSymptomTime(date);
            }}
          />
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Additional notes (optional)</Text>
        <TextArea
          placeholder="Any other details? Medication taken, stress level, etc..."
          value={notes}
          onChangeText={setNotes}
          className="min-h-[90px]"
        />
      </View>

      <Button onPress={handleSubmit} className="w-full bg-accent">
        <Text className="text-accent-foreground font-semibold">Log Symptom</Text>
      </Button>
    </Screen>
  );
}
