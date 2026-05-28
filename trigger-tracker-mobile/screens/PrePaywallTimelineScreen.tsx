import { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, Camera, Check, ChevronLeft, FileText } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { EVENTS } from "../services/analytics";

type Props = {
  navigation: any;
};

const TRIAL_DAYS = 3;

const formatBillingDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export default function PrePaywallTimelineScreen({ navigation }: Props) {
  const posthog = usePostHog();

  const billingDateLabel = useMemo(() => {
    const target = new Date();
    target.setDate(target.getDate() + TRIAL_DAYS);
    return formatBillingDate(target);
  }, []);

  useEffect(() => {
    posthog?.screen("PrePaywallTimeline");
    posthog?.capture(EVENTS.PRE_PAYWALL_TIMELINE_VIEWED);
  }, []);

  const nodes = [
    {
      Icon: Camera,
      title: "Today",
      body:
        "Start logging meals, symptoms, scans, and timing into one evidence window.",
      iconBg: "#154212",
      lineColor: "#154212",
    },
    {
      Icon: AlertTriangle,
      title: `Day ${TRIAL_DAYS} - Trial Ends`,
      body:
        `Early trigger signals start to form. Free until ${billingDateLabel}; cancel before then.`,
      iconBg: "#b87518",
      lineColor: "#1b1c1c",
    },
    {
      Icon: FileText,
      title: "Day 14, Ready to Share",
      body: "By now your trigger patterns are usually clear. Export an AI-personalized visit packet for your doctor.",
      iconBg: "#303030",
      lineColor: null,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcf9f8" }} edges={["top", "left", "right"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, minHeight: 44, justifyContent: "center" }}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
          style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft size={26} color="#1b1c1c" />
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <View style={{ paddingTop: 8, alignItems: "center" }}>
          <Text
            style={{
              color: "#1b1c1c",
              fontSize: 28,
              fontWeight: "800",
              textAlign: "center",
              lineHeight: 34,
            }}
          >
            Your trial starts{"\n"}the evidence window.
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24 }}>
          {nodes.map((node, index) => {
            return (
              <View
                key={node.title}
                style={{ flexDirection: "row", alignItems: "flex-start" }}
              >
                <View style={{ alignItems: "center", width: 56 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: node.iconBg,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                    }}
                  >
                    <node.Icon size={24} color="#ffffff" strokeWidth={2.2} />
                  </View>
                  {node.lineColor ? (
                    <View
                      style={{
                        width: 4,
                        flex: 1,
                        backgroundColor: node.lineColor,
                        marginTop: 4,
                        minHeight: 36,
                        borderRadius: 2,
                      }}
                    />
                  ) : null}
                </View>
                <View
                  style={{
                    flex: 1,
                    paddingLeft: 12,
                    paddingBottom: index === nodes.length - 1 ? 0 : 24,
                  }}
                >
                  <Text
                    style={{
                      color: "#1b1c1c",
                      fontSize: 18,
                      fontWeight: "700",
                    }}
                  >
                    {node.title}
                  </Text>
                  <Text
                    style={{
                      color: "#72796e",
                      fontSize: 14,
                      lineHeight: 20,
                      marginTop: 4,
                    }}
                  >
                    {node.body}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fcf9f8" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <Check size={16} color="#1b1c1c" strokeWidth={3} />
            <Text style={{ color: "#1b1c1c", fontSize: 14, fontWeight: "600" }}>
              Free for 3 days. Cancel anytime.
            </Text>
          </View>
          <Pressable
            onPress={() =>
              navigation.push("Paywall", { trigger_source: "onboarding_funnel" })
            }
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
