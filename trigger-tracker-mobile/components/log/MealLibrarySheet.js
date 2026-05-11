import { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Search } from "lucide-react-native";
import { cn } from "../../utils/style";
import Button from "../Button";
import ChipScroller from "./ChipScroller";

const LIBRARY = {
  Breakfast: ["Coffee", "Tea", "Oatmeal", "Eggs", "Toast", "Bagel", "Cereal", "Yogurt", "Pancakes", "Bacon"],
  Lunch: ["Sandwich", "Salad", "Soup", "Burrito", "Wrap", "Sushi", "Pizza slice", "Burger", "Pasta salad", "Leftovers"],
  Dinner: ["Pasta with tomato sauce", "Pizza", "Grilled chicken", "Steak", "Fish", "Rice and beans", "Stir fry", "Curry", "Roast vegetables", "Tacos", "Mac and cheese", "Spicy food"],
  Drinks: ["Water", "Coffee", "Tea", "Soda", "Beer", "Wine", "Orange juice", "Milk", "Smoothie", "Sparkling water"],
  Snacks: ["Chocolate", "Chips", "Crackers", "Cheese", "Nuts", "Fruit", "Citrus fruit", "Ice cream", "Popcorn", "Cookies"],
};

const CATEGORIES = Object.keys(LIBRARY);

const toChips = (labels) =>
  labels.map((label) => ({ id: label, label }));

export const MealLibrarySheet = ({ visible, onCancel, onConfirm }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible) {
      setCategory(CATEGORIES[0]);
      setSearch("");
      setSelected([]);
    }
  }, [visible]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LIBRARY[category];
    return Object.values(LIBRARY)
      .flat()
      .filter((label) => label.toLowerCase().includes(q))
      .filter((label, i, arr) => arr.indexOf(label) === i);
  }, [category, search]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCancel} />
      <View className="bg-background rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: "85%" }}>
        <View className="self-center w-10 h-1.5 rounded-full bg-muted mb-4" />
        <Text className="text-lg font-bold text-foreground mb-3">Browse foods</Text>

        <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border mb-3">
          <Search size={16} color="#5f6f74" />
          <TextInput
            placeholder="Search foods"
            placeholderTextColor="#5f6f74"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-foreground"
          />
        </View>

        {!search && (
          <View className="mb-3">
            <ChipScroller
              chips={CATEGORIES.map((c) => ({ id: c, label: c }))}
              mode="single"
              selectedIds={[category]}
              onToggle={(id) => setCategory(id)}
            />
          </View>
        )}

        <ScrollView className="mb-4" style={{ maxHeight: 320 }}>
          <View className="flex-row flex-wrap gap-2">
            {items.map((label) => {
              const active = selected.includes(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => toggle(label)}
                  className={cn(
                    "px-4 py-2.5 rounded-full",
                    active ? "bg-accent" : "bg-card border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      active ? "text-white" : "text-foreground"
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onPress={() => onConfirm?.(selected)}
            className="flex-1"
          >
            {selected.length === 0 ? "Done" : `Done (${selected.length})`}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default MealLibrarySheet;
