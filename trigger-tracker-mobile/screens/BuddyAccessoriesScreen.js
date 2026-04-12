import { useCallback, useState } from "react";
import { Text, View, Pressable, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Lock, Check, ChevronLeft } from "lucide-react-native";
import Screen from "../components/Screen";
import Card from "../components/Card";
import { getMeals, getUser, getStreakInfo, saveUser } from "../services/storage";
import {
  ALL_ACCESSORIES,
  getEarnedAccessories,
  getLevelProgress,
} from "../utils/buddyState";

// Accessory images
const accessoryImages = {
  party_hat: require("../assets/accessories/party_hat.png"),
  sunglasses: require("../assets/accessories/sunglasses.png"),
  scarf: require("../assets/accessories/scarf.png"),
  cape: require("../assets/accessories/cape.png"),
  backpack: require("../assets/accessories/backpack.png"),
  star_badge: require("../assets/accessories/star_badge.png"),
  crown: require("../assets/accessories/crown.png"),
  golden_glow: require("../assets/accessories/golden_glow.png"),
};

const turtleHappy = require("../assets/mascot/turtle_happy.png");
const iconStar = require("../assets/icons/icon_star.png");

export default function BuddyAccessoriesScreen({ navigation }) {
  const [totalMeals, setTotalMeals] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [unlockAll, setUnlockAll] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const [meals, u] = await Promise.all([getMeals(), getUser()]);
        setUser(u);
        setTotalMeals(meals.length);
        setSelectedAccessory(u?.equippedAccessory || null);
        const streakInfo = getStreakInfo(meals, u);
        setBestStreak(streakInfo.bestStreak);
      };
      load();
    }, [])
  );

  const handleSelectAccessory = async (accessoryId) => {
    const newSelection = accessoryId === selectedAccessory ? null : accessoryId;
    setSelectedAccessory(newSelection);
    if (user) {
      const updated = { ...user, equippedAccessory: newSelection };
      await saveUser(updated);
      setUser(updated);
    }
  };

  const handleTurtleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setUnlockAll((prev) => !prev);
      setTapCount(0);
    }
  };

  const earned = unlockAll
    ? ALL_ACCESSORIES
    : getEarnedAccessories({ totalMeals, bestStreak });
  const earnedIds = new Set(earned.map((a) => a.id));
  const levelProgress = getLevelProgress(totalMeals);

  return (
    <Screen contentClassName="gap-6">
      {/* Header with back button */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-muted/50 items-center justify-center"
        >
          <ChevronLeft size={22} color="#1f2a30" />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">Your Buddy</Text>
      </View>

      {/* Buddy overview */}
      <Card className="p-5 items-center gap-3">
        <Pressable onPress={handleTurtleTap}>
          <Image
            source={turtleHappy}
            style={{ width: 160, height: 160 }}
            resizeMode="contain"
          />
        </Pressable>
        <View className="items-center gap-1">
          <View className="flex-row items-center gap-1.5">
            <Image source={iconStar} style={{ width: 36, height: 36 }} resizeMode="contain" />
            <Text className="text-lg font-bold text-foreground" style={{ lineHeight: 36 }}>
              Level {levelProgress.level}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            {totalMeals} meals logged  ·  Best streak: {bestStreak} days
          </Text>
        </View>
        <View className="w-full px-4 mt-1">
          <View className="h-2 bg-muted/60 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${levelProgress.percent}%` }}
            />
          </View>
          <Text className="text-[10px] text-muted-foreground text-center mt-1">
            {levelProgress.currentXP}/{levelProgress.maxXP} XP to next level
          </Text>
        </View>
      </Card>

      {/* Accessories collection */}
      <View className="gap-2">
        <Text className="text-base font-semibold text-foreground">
          Rewards ({earned.length}/{ALL_ACCESSORIES.length})
        </Text>
        <View className="gap-2">
          {ALL_ACCESSORIES.map((accessory) => {
            const isEarned = earnedIds.has(accessory.id);
            const isEquipped = selectedAccessory === accessory.id;
            const card = (
              <Card
                key={accessory.id}
                className={`p-4 flex-row items-center gap-3 ${
                  isEquipped ? "border-primary" : isEarned ? "border-primary/30" : "opacity-60"
                }`}
              >
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center overflow-hidden ${
                    isEarned ? "bg-primary/10" : "bg-muted/50"
                  }`}
                >
                  {accessoryImages[accessory.id] ? (
                    <Image
                      source={accessoryImages[accessory.id]}
                      style={{ width: 36, height: 36, opacity: isEarned ? 1 : 0.4 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text className="text-lg font-bold text-foreground">
                      {accessory.label.charAt(0)}
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {accessory.label}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {isEquipped ? "Equipped" : isEarned ? "Tap to equip" : accessory.requirement}
                  </Text>
                </View>
                {isEquipped ? (
                  <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                    <Check size={14} color="#ffffff" />
                  </View>
                ) : isEarned ? (
                  <View className="w-6 h-6 rounded-full bg-muted/50 items-center justify-center" />
                ) : (
                  <Lock size={16} color="#9ca3af" />
                )}
              </Card>
            );
            if (isEarned) {
              return (
                <Pressable key={accessory.id} onPress={() => handleSelectAccessory(accessory.id)}>
                  {card}
                </Pressable>
              );
            }
            return card;
          })}
        </View>
      </View>
    </Screen>
  );
}
