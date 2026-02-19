import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { Utensils, Clock, ArrowLeft, Sparkles } from "lucide-react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { TextArea } from "../components/TextField";
import { saveMeal } from "../services/storage";
import { showToast } from "../utils/feedback";

const quickMeals = [
  "☕ Coffee",
  "🍕 Pizza",
  "🍝 Pasta with tomato sauce",
  "🌶️ Spicy food",
  "🍫 Chocolate",
  "🍊 Citrus fruit",
  "🧅 Onions or garlic",
  "🍟 Fried food",
];

export default function LogMealScreen() {
  const navigation = useNavigation();
  const [mealText, setMealText] = useState("");
  const [mealTime, setMealTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleQuickAdd = (meal) => {
    const cleanMeal = meal.replace(/^\S+\s/, "");
    setMealText((prev) => (prev ? `${prev}, ${cleanMeal}` : cleanMeal));
  };

  const handleSubmit = async () => {
    if (!mealText.trim()) {
      showToast("Please describe what you ate");
      return;
    }
    await saveMeal({ text: mealText.trim(), timestamp: mealTime.getTime() });
    showToast("Meal logged!", "Keep tracking to discover your triggers.");
    navigation.goBack();
  };

  return (
    <Screen contentClassName="gap-6">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="p-2 rounded-xl bg-muted/60">
          <ArrowLeft size={18} color="#1f2a30" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground">Log Meal</Text>
          <Text className="text-sm text-muted-foreground">What did you eat?</Text>
        </View>
        <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
          <Utensils size={22} color="#3aa27f" />
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">Describe your meal</Text>
        <TextArea
          placeholder="e.g., Grilled chicken with rice and vegetables..."
          value={mealText}
          onChangeText={setMealText}
        />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Sparkles size={16} color="#5f6f74" />
          <Text className="text-sm text-muted-foreground font-medium">Quick add common triggers</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {quickMeals.map((meal) => (
            <Pressable
              key={meal}
              onPress={() => handleQuickAdd(meal)}
              className="px-3 py-2 rounded-full bg-muted"
            >
              <Text className="text-sm text-foreground">{meal}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color="#5f6f74" />
          <Text className="text-sm font-medium text-foreground">When did you eat?</Text>
        </View>
        <Pressable
          onPress={() => setShowPicker(true)}
          className="w-full px-4 py-3 rounded-xl border border-border bg-card"
        >
          <Text className="text-foreground">
            {mealTime.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={mealTime}
            mode="datetime"
            display="default"
            onChange={(_, date) => {
              setShowPicker(false);
              if (date) setMealTime(date);
            }}
          />
        )}
      </View>

      <Button
        onPress={handleSubmit}
        disabled={!mealText.trim()}
        className="w-full"
      >
        <Text className="text-primary-foreground font-semibold">Log Meal</Text>
      </Button>
    </Screen>
  );
}
