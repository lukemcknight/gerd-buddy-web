import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronLeft } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { EVENTS } from "../services/analytics";

type Props = {
  navigation: any;
};

type Slide = {
  id: string;
  source: any;
  caption: string;
};

const SLIDES: Slide[] = [
  { id: "scan", source: require("../assets/onboarding/scan.png"), caption: "Snap any meal" },
  { id: "ai", source: require("../assets/onboarding/ai.png"), caption: "Ask an AI that knows your data" },
  { id: "insights", source: require("../assets/onboarding/insights.png"), caption: "See your real triggers" },
  { id: "report", source: require("../assets/onboarding/report.png"), caption: "Doctor-ready in one tap" },
];

export default function PrePaywallTryFreeScreen({ navigation }: Props) {
  const posthog = usePostHog();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Image height scales with screen so the carousel doesn't get cropped on
  // shorter devices (iPhone SE / mini). Caps at 540 on tall screens so the
  // image doesn't dominate on Pro Max sizes either.
  const slideImageHeight = Math.min(540, Math.max(360, screenHeight * 0.55));
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  useEffect(() => {
    posthog?.screen("PrePaywallTryFree");
    posthog?.capture(EVENTS.PRE_PAYWALL_TRY_FREE_VIEWED);
  }, []);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
      setActiveIndex(index);
      posthog?.capture(EVENTS.PRE_PAYWALL_CAROUSEL_SLIDE_VIEWED, {
        slide_index: index,
        slide_id: SLIDES[index].id,
      });
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={{ width: screenWidth, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={item.source}
          style={{ width: 280, height: slideImageHeight }}
          resizeMode="contain"
        />
        <Text
          style={{
            color: "#1b1c1c",
            fontSize: 15,
            fontWeight: "700",
            textAlign: "center",
            marginTop: 12,
            paddingHorizontal: 24,
          }}
        >
          {item.caption}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcf9f8" }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>
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
        <View style={{ paddingHorizontal: 24, paddingTop: 4, alignItems: "center" }}>
          <Text
            style={{
              color: "#1b1c1c",
              fontSize: 28,
              fontWeight: "800",
              textAlign: "center",
              lineHeight: 34,
            }}
          >
            We want you to try GERDBuddy for free
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.id}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={screenWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={handleMomentumEnd}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 20,
            }}
          >
            {SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={{
                  width: index === activeIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === activeIndex ? "#154212" : "#e5e2d9",
                }}
              />
            ))}
          </View>
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
            onPress={() => navigation.push("PrePaywallTimeline")}
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
