import { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Search, Plus, X } from "lucide-react-native";
import { cn } from "../../utils/style";
import Button from "../Button";
import {
  getCustomFoods,
  addCustomFood,
  removeCustomFood,
} from "../../services/storage";

const LIBRARY = {
  Breakfast: [
    "Coffee", "Tea", "Oatmeal", "Eggs", "Toast", "Bagel", "Cereal", "Yogurt",
    "Pancakes", "Bacon", "Sausage", "Ham", "Smoothie", "Granola",
    "French toast", "Waffles", "Omelette", "Hash browns", "Breakfast burrito",
    "Avocado toast", "Muffin", "Croissant", "Donut", "Fruit bowl",
    "Greek yogurt",
  ],
  Lunch: [
    "Sandwich", "Salad", "Soup", "Burrito", "Wrap", "Sushi", "Pizza slice",
    "Burger", "Pasta salad", "Leftovers", "Quesadilla", "Tuna sandwich",
    "Grilled cheese", "Caesar salad", "Greek salad", "BLT", "Club sandwich",
    "Chicken wrap", "Falafel", "Hummus and pita", "Hot dog", "Chili", "Ramen",
    "Pho", "Pad thai",
  ],
  Dinner: [
    "Pasta with tomato sauce", "Pizza", "Grilled chicken", "Steak", "Fish",
    "Rice and beans", "Stir fry", "Curry", "Roast vegetables", "Tacos",
    "Mac and cheese", "Spicy food", "Salmon", "Shrimp", "Lamb", "Pork chop",
    "Meatballs", "Lasagna", "Risotto", "BBQ ribs", "Roast beef",
    "Chicken parmesan", "Enchiladas", "Dumplings", "Casserole",
  ],
  Drinks: [
    "Water", "Coffee", "Tea", "Soda", "Beer", "Wine", "Orange juice", "Milk",
    "Smoothie", "Sparkling water", "Espresso", "Latte", "Cappuccino",
    "Iced coffee", "Iced tea", "Green tea", "Herbal tea", "Energy drink",
    "Cocktail", "Apple juice", "Lemonade", "Coconut water", "Kombucha",
    "Hot chocolate", "Whiskey",
  ],
  Snacks: [
    "Chocolate", "Chips", "Crackers", "Cheese", "Nuts", "Fruit",
    "Citrus fruit", "Ice cream", "Popcorn", "Cookies", "Granola bar",
    "Trail mix", "Pretzels", "Peanut butter", "Edamame", "Dark chocolate",
    "Candy", "Cake", "Brownie", "Apple", "Banana", "Berries", "Grapes",
    "Beef jerky", "Yogurt parfait",
  ],
};

const CATEGORIES = [...Object.keys(LIBRARY), "Custom"];

export const MealLibrarySheet = ({ visible, onCancel, onConfirm }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (visible) {
      setCategory(CATEGORIES[0]);
      setSearch("");
      setSelected([]);
      setCustomInput("");
      getCustomFoods().then(setCustomFoods);
    }
  }, [visible]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      if (category === "Custom") return customFoods;
      return LIBRARY[category] || [];
    }
    const all = [...Object.values(LIBRARY).flat(), ...customFoods];
    return all
      .filter((label) => label.toLowerCase().includes(q))
      .filter((label, i, arr) => arr.indexOf(label) === i);
  }, [category, search, customFoods]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddCustom = async () => {
    const ok = await addCustomFood(customInput);
    if (!ok) return;
    const updated = await getCustomFoods();
    setCustomFoods(updated);
    setCustomInput("");
  };

  const handleRemoveCustom = async (label) => {
    await removeCustomFood(label);
    const updated = await getCustomFoods();
    setCustomFoods(updated);
    setSelected((prev) => prev.filter((x) => x !== label));
  };

  const showAddRow = category === "Custom" && !search;
  const customSet = new Set(customFoods);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onCancel} />
      <View
        className="bg-background rounded-t-3xl px-5 pt-4 pb-8"
        style={{ maxHeight: "85%" }}
      >
        <View className="self-center w-10 h-1.5 rounded-full bg-muted mb-4" />
        <Text className="text-lg font-bold text-foreground mb-3">
          Browse foods
        </Text>

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
          <View className="border-b border-border mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 4, paddingRight: 16 }}
            >
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className={cn(
                      "px-3 pt-1 pb-3 -mb-px border-b-2",
                      active ? "border-accent" : "border-transparent"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-sm",
                        active
                          ? "font-bold text-foreground"
                          : "font-medium text-muted-foreground"
                      )}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!search && (
          <Text className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {category === "Custom" ? "Your foods" : `${category} · ${items.length}`}
          </Text>
        )}

        {showAddRow && (
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-1 flex-row items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border">
              <Plus size={16} color="#5f6f74" />
              <TextInput
                placeholder="Add your own food"
                placeholderTextColor="#5f6f74"
                value={customInput}
                onChangeText={setCustomInput}
                onSubmitEditing={handleAddCustom}
                returnKeyType="done"
                className="flex-1 text-foreground"
              />
            </View>
            <Pressable
              onPress={handleAddCustom}
              disabled={!customInput.trim()}
              className={cn(
                "px-4 py-2 rounded-xl",
                customInput.trim() ? "bg-primary" : "bg-muted"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-semibold",
                  customInput.trim()
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                Add
              </Text>
            </Pressable>
          </View>
        )}

        <ScrollView className="mb-4" style={{ maxHeight: 320 }}>
          {items.length === 0 && category === "Custom" && !search ? (
            <Text className="text-sm text-muted-foreground py-4 text-center">
              Add foods you eat often — they'll show up here.
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {items.map((label) => {
                const active = selected.includes(label);
                const canDelete = customSet.has(label);
                return (
                  <View key={label} className="relative">
                    <Pressable
                      onPress={() => toggle(label)}
                      className={cn(
                        "px-4 py-2.5 rounded-full",
                        active
                          ? "bg-accent"
                          : "bg-card border border-border"
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
                    {canDelete && (
                      <Pressable
                        onPress={() => handleRemoveCustom(label)}
                        hitSlop={8}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground items-center justify-center"
                      >
                        <X size={10} color="white" />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
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
