import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from 'expo-haptics';
import { cn } from "../../utils/style";

const AnimatedPath = Animated.createAnimatedComponent(Path);

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

export const SubmitFeedback = ({
  label,
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
      <Pressable
        onPress={handlePress}
        disabled={disabled || playing}
        className={cn(
          "flex-row items-center justify-center rounded-xl px-4 py-4 bg-primary",
          disabled && "opacity-60",
          className
        )}
      >
        {playing ? (
          <CheckmarkOverlay play onDone={finish} />
        ) : (
          <Text className="text-primary-foreground font-semibold text-base">{label}</Text>
        )}
      </Pressable>
    </View>
  );
};

export default SubmitFeedback;
