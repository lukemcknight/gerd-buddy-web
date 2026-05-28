import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

const PALETTES = {
  primary: {
    bg: "#ecf5e9",
    border: "#cfdcca",
    line: "#154212",
    fill: "#e6f1e1",
    accent: "#2d5a27",
    warm: "#ffb872",
    alert: "#9e4132",
  },
  symptom: {
    bg: "#fff3ef",
    border: "#ffd4c9",
    line: "#9e4132",
    fill: "#ffdad4",
    accent: "#9e4132",
    warm: "#ffb872",
    alert: "#9e4132",
  },
  gold: {
    bg: "#fff5e8",
    border: "#f4ddbd",
    line: "#774400",
    fill: "#ffdcbf",
    accent: "#b87518",
    warm: "#ffb872",
    alert: "#9e4132",
  },
  ink: {
    bg: "#f0eded",
    border: "#e5e2d9",
    line: "#303030",
    fill: "#e4e2e1",
    accent: "#72796e",
    warm: "#ffb872",
    alert: "#9e4132",
  },
};

const strokeProps = {
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const getPalette = (tone, color) => {
  const base = PALETTES[tone] || PALETTES.primary;

  if (!color) return { ...base, mono: false };

  return {
    ...base,
    line: color,
    fill: "none",
    accent: color,
    warm: color,
    alert: color,
    mono: true,
  };
};

const Check = ({ p, x = 0, y = 0, scale = 1 }) => (
  <Path
    d={`M${x + 5 * scale} ${y + 10 * scale}L${x + 9 * scale} ${y + 14 * scale}L${x + 16 * scale} ${y + 6 * scale}`}
    fill="none"
    stroke={p.line}
    strokeWidth={2.7 * scale}
    {...strokeProps}
  />
);

const Sheet = ({ p, x = 11, y = 7, width = 26, height = 34 }) => (
  <>
    <Path
      d={`M${x} ${y}H${x + width - 8}L${x + width} ${y + 8}V${y + height}H${x}Z`}
      fill={p.mono ? "none" : "#fffdf7"}
      stroke={p.line}
      strokeWidth="2.5"
      {...strokeProps}
    />
    <Path
      d={`M${x + width - 8} ${y}V${y + 8}H${x + width}`}
      fill="none"
      stroke={p.line}
      strokeWidth="2.5"
      {...strokeProps}
    />
  </>
);

const FoodScanIcon = ({ p }) => (
  <>
    <Path d="M9 16V9H16" stroke={p.line} strokeWidth="2.6" fill="none" {...strokeProps} />
    <Path d="M32 9H39V16" stroke={p.line} strokeWidth="2.6" fill="none" {...strokeProps} />
    <Path d="M39 32V39H32" stroke={p.line} strokeWidth="2.6" fill="none" {...strokeProps} />
    <Path d="M16 39H9V32" stroke={p.line} strokeWidth="2.6" fill="none" {...strokeProps} />
    <Path
      d="M13 28C15 35 19 38 24 38C29 38 33 35 35 28Z"
      fill={p.fill}
      stroke={p.line}
      strokeWidth="2.6"
      {...strokeProps}
    />
    <Path d="M13 28H35" stroke={p.line} strokeWidth="2.8" fill="none" {...strokeProps} />
    <Path
      d="M20 22C20 16 25 13 31 15C29 21 25 24 20 22Z"
      fill={p.mono ? "none" : p.accent}
      stroke={p.line}
      strokeWidth="2.1"
      {...strokeProps}
    />
    <Circle cx="20" cy="25" r="3" fill={p.warm} />
    <Circle cx="29" cy="24" r="4" fill={p.alert} />
  </>
);

const SymptomIcon = ({ p }) => (
  <>
    <Path
      d="M25 7C32 15 34 22 31 29C28 36 19 38 14 32C10 27 14 21 18 17C21 14 22 10 25 7Z"
      fill={p.fill}
      stroke={p.line}
      strokeWidth="2.6"
      {...strokeProps}
    />
    <Path
      d="M24 21C28 27 27 32 23 34C19 36 15 33 16 29C16 26 19 24 20.5 21C22 18 22 15 23.5 12"
      fill={p.mono ? "none" : "#fff9ef"}
      stroke={p.mono ? p.line : "none"}
      strokeWidth="2"
      {...strokeProps}
    />
    <Circle cx="13" cy="33" r="3" fill={p.alert} />
  </>
);

const TriggerIcon = ({ p }) => (
  <>
    <Circle cx="17" cy="18" r="7" fill={p.fill} stroke={p.line} strokeWidth="2.5" />
    <Circle cx="32" cy="18" r="7" fill={p.mono ? "none" : "#fff0e8"} stroke={p.line} strokeWidth="2.5" />
    <Path
      d="M24 18C26 15 28 15 30 18"
      stroke={p.line}
      strokeWidth="2.3"
      strokeDasharray="2 5"
      fill="none"
      {...strokeProps}
    />
    <Rect x="14" y="31" width="4" height="8" rx="1.3" fill={p.accent} />
    <Rect x="22" y="27" width="4" height="12" rx="1.3" fill={p.accent} />
    <Rect x="30" y="23" width="4" height="16" rx="1.3" fill={p.accent} />
    <Circle cx="39" cy="35" r="6" fill={p.mono ? "none" : p.fill} stroke={p.line} strokeWidth="2.4" />
    <Check p={p} x={32.5} y={29} scale={0.6} />
  </>
);

const SafeIcon = ({ p }) => (
  <>
    <Path
      d="M13 28C15 35 19 38 24 38C29 38 33 35 35 28Z"
      fill={p.fill}
      stroke={p.line}
      strokeWidth="2.6"
      {...strokeProps}
    />
    <Path d="M13 28H35" stroke={p.line} strokeWidth="2.8" fill="none" {...strokeProps} />
    <Path
      d="M21 20C21 14 26 11 32 13C30 19 26 22 21 20Z"
      fill={p.mono ? "none" : p.accent}
      stroke={p.line}
      strokeWidth="2.1"
      {...strokeProps}
    />
    <Path
      d="M35 24L42 27.5V34C42 39 38 42 35 43.5C32 42 28 39 28 34V27.5Z"
      fill={p.mono ? "none" : "#e4f0df"}
      stroke={p.line}
      strokeWidth="2.5"
      {...strokeProps}
    />
    <Check p={p} x={30.5} y={29.3} scale={0.7} />
  </>
);

const ReportIcon = ({ p }) => (
  <>
    <Sheet p={p} />
    <Path d="M17 20H28" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Path d="M17 26H31" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Rect x="17" y="33" width="4" height="5" rx="1" fill={p.accent} />
    <Rect x="24" y="30" width="4" height="8" rx="1" fill={p.accent} />
    <Rect x="31" y="27" width="4" height="11" rx="1" fill={p.accent} />
  </>
);

const ExportIcon = ({ p }) => (
  <>
    <Sheet p={p} x={10} width={25} />
    <Path d="M17 22H27" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Path d="M17 28H24" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Path d="M28 34H41" stroke={p.line} strokeWidth="3.6" fill="none" {...strokeProps} />
    <Path d="M36 29L41 34L36 39" stroke={p.line} strokeWidth="3.6" fill="none" {...strokeProps} />
  </>
);

const CalendarIcon = ({ p }) => {
  const dots = [
    [14, 25, p.accent],
    [21, 25, p.accent],
    [28, 25, p.accent],
    [35, 25, p.accent],
    [14, 32, p.accent],
    [21, 32, p.warm],
    [28, 32, p.alert],
    [35, 32, p.accent],
    [14, 39, p.accent],
    [21, 39, p.accent],
  ];

  return (
    <>
      <Rect x="8" y="12" width="32" height="30" rx="4" fill={p.fill} stroke={p.line} strokeWidth="2.6" />
      <Path d="M8 20H40" stroke={p.line} strokeWidth="2.6" fill="none" {...strokeProps} />
      <Path d="M16 8V15" stroke={p.line} strokeWidth="3.4" fill="none" {...strokeProps} />
      <Path d="M32 8V15" stroke={p.line} strokeWidth="3.4" fill="none" {...strokeProps} />
      {dots.map(([cx, cy, fill], index) => (
        <Circle key={`${cx}-${cy}-${index}`} cx={cx} cy={cy} r="2.1" fill={fill} />
      ))}
    </>
  );
};

const SeverityIcon = ({ p }) => (
  <>
    <Circle cx="10" cy="28" r="3" fill={p.accent} />
    <Circle cx="18" cy="28" r="4" fill={p.accent} />
    <Circle cx="28" cy="28" r="5.5" fill={p.warm} />
    <Circle cx="39" cy="28" r="7" fill={p.alert} />
  </>
);

const TimingIcon = ({ p }) => (
  <>
    <Circle cx="23" cy="24" r="15" fill={p.fill} stroke={p.line} strokeWidth="2.7" />
    <Path d="M23 15V24L30 30" stroke={p.line} strokeWidth="3" fill="none" {...strokeProps} />
    <Path d="M12 24H15" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Path d="M23 12V15" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
    <Circle cx="36" cy="34" r="5" fill={p.alert} />
  </>
);

const StreakIcon = ({ p }) => (
  <>
    <SymptomIcon p={p} />
    {[10, 19, 28, 37].map((x, index) => (
      <G key={x}>
        <Circle cx={x} cy="39" r="4" fill={index === 3 ? p.warm : p.accent} opacity={index === 3 ? 0.7 : 1} />
        {index < 3 ? <Check p={{ ...p, line: "#fffdf7" }} x={x - 4.8} y={34} scale={0.45} /> : null}
      </G>
    ))}
  </>
);

const RewardIcon = ({ p }) => (
  <>
    <Path d="M17 30L15 42L24 37L33 42L31 30" fill={p.fill} stroke={p.line} strokeWidth="2.4" {...strokeProps} />
    <Circle cx="24" cy="22" r="14" fill={p.fill} stroke={p.line} strokeWidth="2.6" />
    <Path
      d="M24 14L26.5 19.2L32 20L28 24L29 29.5L24 27L19 29.5L20 24L16 20L21.5 19.2Z"
      fill={p.warm}
      stroke={p.line}
      strokeWidth="1.8"
      {...strokeProps}
    />
  </>
);

const SettingsIcon = ({ p }) => (
  <>
    <Circle cx="24" cy="24" r="7" fill={p.fill} stroke={p.line} strokeWidth="2.6" />
    <Path
      d="M24 8V13M24 35V40M8 24H13M35 24H40M12.5 12.5L16 16M32 32L35.5 35.5M35.5 12.5L32 16M16 32L12.5 35.5"
      stroke={p.line}
      strokeWidth="3"
      fill="none"
      {...strokeProps}
    />
  </>
);

const HomeIcon = ({ p }) => (
  <>
    <Path
      d="M10 24L24 12L38 24V39H29V30H19V39H10Z"
      fill={p.fill}
      stroke={p.line}
      strokeWidth="2.7"
      {...strokeProps}
    />
    <Path d="M18 22H30" stroke={p.line} strokeWidth="2.4" fill="none" {...strokeProps} />
  </>
);

const GLYPHS = {
  scan: FoodScanIcon,
  meal: FoodScanIcon,
  symptom: SymptomIcon,
  trigger: TriggerIcon,
  safe: SafeIcon,
  report: ReportIcon,
  export: ExportIcon,
  calendar: CalendarIcon,
  severity: SeverityIcon,
  timing: TimingIcon,
  streak: StreakIcon,
  reward: RewardIcon,
  settings: SettingsIcon,
  home: HomeIcon,
};

export function BrandGlyph({
  name,
  tone = "primary",
  size = 24,
  color,
}) {
  const palette = getPalette(tone, color);
  const Glyph = GLYPHS[name] || ReportIcon;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Glyph p={palette} />
    </Svg>
  );
}

export default function BrandIcon({
  name,
  tone = "primary",
  size = 26,
  boxSize = 44,
  color,
  boxed = true,
}) {
  const palette = PALETTES[tone] || PALETTES.primary;

  if (!boxed) {
    return <BrandGlyph name={name} tone={tone} size={size} color={color} />;
  }

  return (
    <View
      style={{
        width: boxSize,
        height: boxSize,
        borderRadius: Math.max(8, Math.round(boxSize * 0.24)),
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BrandGlyph name={name} tone={tone} size={size} color={color} />
    </View>
  );
}
