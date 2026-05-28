import { View } from "react-native";
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import BrandMark from "./BrandMark";

// Cold-launch splash: brand mark fades in, "GERDBuddy" slides in from the
// right beside it. Mirrors the Home-screen header layout (BrandMark + bold
// brand text) at larger scale, centered on the cream brand background.
// Rendered by RootNavigator while it's determining the initial route and for
// a ~1200ms minimum so the brand moment lands on fast startups.
export default function SplashAnimation() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fcf9f8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Animated.View entering={FadeIn.duration(450)}>
          <BrandMark variant="dark" size={80} />
        </Animated.View>
        <Animated.Text
          entering={FadeInRight.delay(180).duration(450)}
          style={{
            fontSize: 40,
            fontWeight: "800",
            color: "#154212",
            letterSpacing: -0.5,
          }}
        >
          GERDBuddy
        </Animated.Text>
      </View>
    </View>
  );
}
