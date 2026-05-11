import { Pressable, Text, View } from "react-native";
import { ArrowLeft, Sparkles, ShieldCheck, TrendingDown } from "lucide-react-native";
import Button from "../Button";

// TODO(v2): wire `onAccept` to a real RevenueCat win-back offer or a separate
// discounted product. For v1, the parent deep-links the user to App Store
// subscription management so they can adjust there. Options when ready:
//   1. RevenueCat Win-Back Offer (App Store Connect side, requires signed offer).
//   2. A separate $29.99/year SKU that we purchase via Purchases.purchasePackage.
const ValueRow = ({ Icon, title, body }) => (
  <View className="flex-row gap-3">
    <View className="w-9 h-9 rounded-xl items-center justify-center bg-primary/10">
      <Icon size={18} color="#3aa27f" />
    </View>
    <View className="flex-1">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      <Text className="text-xs text-muted-foreground mt-0.5">{body}</Text>
    </View>
  </View>
);

export const RetentionOfferStep = ({
  offerPriceLabel = "$29.99/year",
  onAccept,
  onDecline,
  onBack,
}) => {
  return (
    <View className="flex-1 gap-5">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onBack}
          hitSlop={12}
          className="w-9 h-9 rounded-full items-center justify-center bg-card border border-border"
        >
          <ArrowLeft size={18} color="#1f2a30" />
        </Pressable>
        <Text className="text-sm font-semibold text-muted-foreground uppercase">
          Step 2 of 3
        </Text>
      </View>

      <View className="bg-primary/5 border border-primary/30 rounded-2xl p-5 gap-3">
        <View className="flex-row items-center gap-2">
          <Sparkles size={18} color="#3aa27f" />
          <Text className="text-xs font-semibold text-primary uppercase tracking-wide">
            Special offer
          </Text>
        </View>
        <Text className="text-2xl font-bold text-foreground">
          Stay with us for {offerPriceLabel}
        </Text>
        <Text className="text-sm text-muted-foreground">
          We'd love to keep helping you track your triggers. Lock in this rate
          and stay on Pro.
        </Text>
      </View>

      <View className="gap-4">
        <ValueRow
          Icon={TrendingDown}
          title="Discounted rate"
          body="Lower than the standard yearly price — yours to keep."
        />
        <ValueRow
          Icon={ShieldCheck}
          title="All Pro features"
          body="Unlimited tracking, full trigger analysis, and exports."
        />
        <ValueRow
          Icon={Sparkles}
          title="Cancel anytime"
          body="No commitment. You can still cancel from the App Store later."
        />
      </View>

      <View className="mt-auto gap-3">
        <Button
          onPress={onAccept}
          className="w-full py-4 rounded-2xl"
        >
          Keep my subscription
        </Button>
        <Pressable onPress={onDecline} className="py-3 items-center">
          <Text className="text-sm font-semibold text-muted-foreground underline">
            Continue to cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default RetentionOfferStep;
