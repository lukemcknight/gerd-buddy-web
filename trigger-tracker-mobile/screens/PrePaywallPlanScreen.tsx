import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import ProgressRing from "../components/ProgressRing";
import { EVENTS } from "../services/analytics";
import { getUser } from "../services/storage";

type Props = {
  navigation: any;
};

type Phase = {
  name: string;
  subtitle: string;
  goal: string;
  progress: number;
};

// 4-step evidence arc for the visual 14-day trigger report experiment.
// This does not change the stored onboarding plan; it is the product story
// shown before the hard paywall.
const PHASES: Phase[] = [
  {
    name: "Baseline",
    subtitle: "Log the first meals",
    goal: "Start with meals, symptoms, and timing.",
    progress: 25,
  },
  {
    name: "Signals",
    subtitle: "Patterns begin to separate",
    goal: "See early repeats between foods and symptoms.",
    progress: 50,
  },
  {
    name: "Confidence",
    subtitle: "Evidence gets stronger",
    goal: "Build confidence scores from your own logs.",
    progress: 75,
  },
  {
    name: "Report",
    subtitle: "Ready for your doctor",
    goal: "Export an AI-personalized visit packet with questions tailored to your patterns.",
    progress: 100,
  },
];

const TOTAL_DURATION_MS = 6000;

export default function PrePaywallPlanScreen({ navigation }: Props) {
  const posthog = usePostHog();
  const [progress, setProgress] = useState(0);
  const [userGoalLabel, setUserGoalLabel] = useState<string | null>(null);

  useEffect(() => {
    posthog?.screen("PrePaywallPlan");
    posthog?.capture(EVENTS.PRE_PAYWALL_PLAN_VIEWED);
  }, []);

  useEffect(() => {
    getUser()
      .then((u) => setUserGoalLabel(u?.goalLabel ?? null))
      .catch(() => {});
  }, []);

  // Smoothly animate the ring from 0% to 100% over TOTAL_DURATION_MS and
  // then freeze on the finished report phase rather than looping.
  useEffect(() => {
    let rafId: number | null = null;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const next = Math.min(100, (elapsed / TOTAL_DURATION_MS) * 100);
      setProgress(next);
      if (next < 100) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const phaseIndex = Math.min(
    Math.floor(progress / (100 / PHASES.length)),
    PHASES.length - 1
  );
  const currentPhase = PHASES[phaseIndex];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcf9f8" }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ paddingTop: 8, alignItems: "flex-start" }}>
          <Text
            style={{
              color: "#1b1c1c",
              fontSize: 28,
              fontWeight: "800",
              lineHeight: 34,
            }}
          >
            Your 14-day trigger evidence window
          </Text>
          <Text
            style={{
              color: "#72796e",
              fontSize: 15,
              lineHeight: 22,
              marginTop: 10,
            }}
          >
            GERDBuddy turns meals, symptoms, and timing into a doctor-ready
            pattern report.
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ProgressRing progress={progress} size={300} strokeWidth={16} color="#154212" className="">
            <Text style={{ color: "#72796e", fontSize: 14, fontWeight: "500" }}>
              Phase {phaseIndex + 1}
            </Text>
            <Text
              style={{
                color: "#1b1c1c",
                fontSize: 26,
                fontWeight: "800",
                marginTop: 4,
                textAlign: "center",
                paddingHorizontal: 16,
              }}
            >
              {currentPhase.name}
            </Text>
            <Text
              style={{
                color: "#72796e",
                fontSize: 14,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {currentPhase.subtitle}
            </Text>
          </ProgressRing>

          {/* Phase position indicator — 4 dots; active dot is wider so the
              user can see how far through the arc they are. The final phase
              ("Report") uses gold to signal the finished evidence
              destination rather than another beat of the same green. */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 24 }}>
            {PHASES.map((_, idx) => {
              const isActive = idx === phaseIndex;
              const isFinal = idx === PHASES.length - 1;
              const activeColor = isFinal ? "#b87518" : "#154212";
              return (
                <View
                  key={idx}
                  style={{
                    width: isActive ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isActive ? activeColor : "#e5e2d9",
                  }}
                />
              );
            })}
          </View>

        </View>

        <View style={{ paddingBottom: 8 }}>
          <Text
            style={{
              color: "#1b1c1c",
              fontSize: 15,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {userGoalLabel ? `Your goal: ${userGoalLabel}` : currentPhase.goal}
          </Text>
        </View>
      </View>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fcf9f8" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
          <Pressable
            onPress={() => navigation.push("PrePaywallTryFree")}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            style={{
              alignSelf: "stretch",
              backgroundColor: "#154212",
              borderRadius: 999,
              minHeight: 56,
              paddingVertical: 18,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "700" }}>
              Continue
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}
