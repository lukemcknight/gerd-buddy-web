import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { cn } from "../utils/style";

// Number of arc segments used to render the progress ring. Each segment
// gets its own opacity based on how far around the ring it sits, which
// creates the appearance of a gradient that grows more solid as the ring
// progresses. Higher = smoother gradient; 60 is the sweet spot between
// smoothness and overdraw.
const NUM_SEGMENTS = 60;
const MIN_OPACITY = 0.18;
const MAX_OPACITY = 1;
// Each segment overdraws into the next by this many pixels so anti-aliased
// dash boundaries don't render as visible radial seams between segments.
const SEGMENT_OVERLAP = 0.5;

export const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  color = "#154212",
  trackColor = "#e5e2d9",
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const segLen = circumference / NUM_SEGMENTS;
  const progressArc = Math.max(0, Math.min(100, progress)) / 100 * circumference;

  const segments = [];
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const segStart = i * segLen;
    if (segStart >= progressArc) break;
    const visibleLen = Math.min(segLen + SEGMENT_OVERLAP, progressArc - segStart);
    const positionFraction = (segStart + visibleLen / 2) / circumference;
    const opacity = MIN_OPACITY + positionFraction * (MAX_OPACITY - MIN_OPACITY);
    segments.push(
      <Circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        strokeDasharray={`${visibleLen} ${circumference}`}
        strokeDashoffset={-segStart}
        opacity={opacity}
      />
    );
  }

  return (
    <View className={cn("relative items-center justify-center", className)}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {segments}
      </Svg>
      <View className="absolute inset-0 items-center justify-center">{children}</View>
    </View>
  );
};

export default ProgressRing;
