import { useEffect } from "react";
import { Image, ImageBackground, Pressable, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
// Custom icons
const iconStreak = require("../assets/icons/icon_streak.png");
const iconReward = require("../assets/icons/icon_reward.png");
const iconStar = require("../assets/icons/icon_star.png");

// Mood-specific turtle images
const turtleImages = {
  excited: require("../assets/mascot/turtle_excited.png"),
  happy: require("../assets/mascot/turtle_happy.png"),
  content: require("../assets/mascot/turtle_content.png"),
  sad: require("../assets/mascot/turtle_sad.png"),
};

// Accessory images and per-accessory layout (relative to 160x160 turtle container)
const accessoryConfig = {
  party_hat: {
    source: require("../assets/accessories/party_hat.png"),
    width: 84, height: 84, top: -13, left: 63, rotate: "-10deg"
  },
  sunglasses: {
    source: require("../assets/accessories/sunglasses.png"),
    width: 64, height: 32, top: 38, left: 72,
  },
  scarf: {
    source: require("../assets/accessories/scarf.png"),
    width: 56, height: 44, top: 62, left: 64,
  },
  cape: {
    source: require("../assets/accessories/cape.png"),
    width: 72, height: 72, top: 30, left: 4,
  },
  backpack: {
    source: require("../assets/accessories/backpack.png"),
    width: 80, height: 80, top: 16, left: 10, rotate: "23deg",
  },
  star_badge: {
    source: require("../assets/accessories/star_badge.png"),
    width: 40, height: 44, top: 60, left: 90,
  },
  crown: {
    source: require("../assets/accessories/crown.png"),
    width: 56, height: 42, top: -14, left: 72,
  },
  golden_glow: {
    source: require("../assets/accessories/golden_glow.png"),
    width: 180, height: 180, top: -10, left: -10,
  },
};

// Scene background
const sceneBg = require("../assets/scene/scene_bg.png");

export default function TurtleBuddy({ buddyState, onPress }) {
  const {
    mood,
    levelProgress,
    earnedAccessories,
    message,
    currentStreak,
    equippedAccessory,
  } = buddyState;

  // Sway animation (left-right like PillPets)
  const sway = useSharedValue(0);
  const bounce = useSharedValue(1);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(-1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const turtleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sway.value * 4}deg` },
      { translateX: sway.value * 3 },
      { scale: bounce.value },
    ],
  }));

  const handlePress = () => {
    bounce.value = withSequence(
      withSpring(1.12, { damping: 4, stiffness: 300 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );
    onPress?.();
  };

  // Mood-based turtle image
  const turtleSource = turtleImages[mood.id] || turtleImages.content;

  // Show equipped accessory if set, otherwise most recently earned
  const accConfig = equippedAccessory && accessoryConfig[equippedAccessory]
    ? accessoryConfig[equippedAccessory]
    : earnedAccessories.length > 0
      ? accessoryConfig[earnedAccessories[earnedAccessories.length - 1].id]
      : null;

  return (
    <View className="gap-3">
      {/* Top stats bar with app name centered */}
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1">
          <Image source={iconStreak} style={{ width: 40, height: 40 }} resizeMode="contain" />
          <Text className="text-lg font-bold text-foreground" style={{ lineHeight: 40 }}>
            {currentStreak || 0}
          </Text>
        </View>
        <Text className="text-lg font-bold text-foreground">GERDBuddy</Text>
        <View className="flex-row items-center gap-1">
          <Image source={iconReward} style={{ width: 40, height: 40 }} resizeMode="contain" />
          <Text className="text-lg font-bold text-foreground" style={{ lineHeight: 40 }}>
            {earnedAccessories.length}
          </Text>
        </View>
      </View>

      {/* Scenic environment card */}
      <Pressable onPress={handlePress}>
        <View
          className="rounded-3xl overflow-hidden"
          style={{
            shadowColor: "#1f3d33",
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <ImageBackground
            source={sceneBg}
            style={{ height: 260, position: "relative" }}
            resizeMode="cover"
          >
            {/* Level + XP overlay (top-left) */}
            <View
              className="absolute top-3 left-3 bg-white/85 rounded-2xl px-3 py-2"
              style={{ minWidth: 100 }}
            >
              <View className="flex-row items-center gap-1.5">
                <Image source={iconStar} style={{ width: 28, height: 28 }} resizeMode="contain" />
                <Text className="text-sm font-bold text-foreground" style={{ lineHeight: 28 }}>
                  Level {levelProgress.level}
                </Text>
              </View>
              <View className="h-1.5 bg-muted/60 rounded-full overflow-hidden mt-1.5">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </View>
              <Text className="text-[9px] text-muted-foreground mt-0.5">
                {levelProgress.currentXP}/{levelProgress.maxXP} XP
              </Text>
            </View>

            {/* Turtle character with accessory */}
            <View
              className="absolute items-center"
              style={{ bottom: 8, left: 0, right: 0 }}
            >
              <Animated.View style={turtleAnimatedStyle}>
                <View style={{ width: 160, height: 160 }}>
                  <Image
                    source={turtleSource}
                    style={{ width: 160, height: 160 }}
                    resizeMode="contain"
                  />
                  {accConfig && (
                    <Image
                      source={accConfig.source}
                      style={{
                        width: accConfig.width,
                        height: accConfig.height,
                        position: "absolute",
                        top: accConfig.top,
                        left: accConfig.left,
                        ...(accConfig.rotate ? { transform: [{ rotate: accConfig.rotate }] } : {}),
                      }}
                      resizeMode="contain"
                    />
                  )}
                </View>
              </Animated.View>
            </View>
          </ImageBackground>
        </View>
      </Pressable>

    </View>
  );
}
