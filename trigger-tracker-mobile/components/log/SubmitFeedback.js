import { useEffect, useState } from "react";
import { AccessibilityInfo, Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from 'expo-haptics';
import { cn } from "../../utils/style";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const turtleHappy = require("../../assets/mascot/turtle_happy.png");
const heart = "❤️"; // simple emoji particle for v1

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      (v) => setReduced(Boolean(v))
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
};

const CHECK_LENGTH = 36;

const CheckmarkOverlay = ({ play, onDone }) => {
  const dashOffset = useSharedValue(CHECK_LENGTH);
  useEffect(() => {
    if (play) {
      dashOffset.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }),
        withDelay(
          300,
          withTiming(0, { duration: 1 }, () => runOnJS(onDone)())
        )
      );
    }
  }, [play]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: dashOffset.value }));
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <AnimatedPath
        d="M4 12 L10 18 L20 6"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={props}
      />
    </Svg>
  );
};

const BuddyOverlay = ({ play, onDone }) => {
  const scale = useSharedValue(0);
  const heartY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  useEffect(() => {
    if (play) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
      heartOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(200, withTiming(0, { duration: 250 }))
      );
      heartY.value = withTiming(-40, { duration: 500, easing: Easing.out(Easing.quad) }, () =>
        runOnJS(onDone)()
      );
    }
  }, [play]);
  const turtleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heartY.value }],
    opacity: heartOpacity.value,
  }));
  return (
    <View pointerEvents="none" className="absolute -top-20 left-0 right-0 items-center">
      <Animated.View style={turtleStyle}>
        <Image source={turtleHappy} style={{ width: 80, height: 80 }} resizeMode="contain" />
      </Animated.View>
      <Animated.Text style={[{ fontSize: 24, position: "absolute", top: 0 }, heartStyle]}>
        {heart}
      </Animated.Text>
    </View>
  );
};

export const SubmitFeedback = ({
  label,
  variant = "checkmark",
  onSubmit,
  onComplete,
  disabled = false,
  className = "",
}) => {
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);

  const finish = () => {
    setPlaying(false);
    onComplete?.();
  };

  const handlePress = async () => {
    if (disabled || playing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await onSubmit?.();
    } catch (e) {
      return;
    }
    if (reducedMotion) {
      onComplete?.();
      return;
    }
    setPlaying(true);
  };

  return (
    <View className="relative">
      {playing && variant === "buddy" && <BuddyOverlay play onDone={finish} />}
      <Pressable
        onPress={handlePress}
        disabled={disabled || playing}
        className={cn(
          "flex-row items-center justify-center rounded-xl px-4 py-4 bg-primary",
          disabled && "opacity-60",
          className
        )}
      >
        {playing && variant === "checkmark" ? (
          <CheckmarkOverlay play onDone={finish} />
        ) : (
          <Text className="text-primary-foreground font-semibold text-base">{label}</Text>
        )}
      </Pressable>
    </View>
  );
};

export default SubmitFeedback;
