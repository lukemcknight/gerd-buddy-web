import { Pressable, Text, View } from "react-native";
import { ArrowLeft, ExternalLink, Heart } from "lucide-react-native";
import Button from "../Button";

export const CancellationConfirmStep = ({
  onBack,
  onOpenAppStore,
  onAbort,
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
          Step 3 of 3
        </Text>
      </View>

      <View className="items-center gap-3 pt-2">
        <View className="w-16 h-16 rounded-full items-center justify-center bg-muted/50">
          <Heart size={28} color="#5f6f74" />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center">
          We'll miss you
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          To finish cancelling, we'll send you to the App Store — Apple handles
          all subscription cancellations.
        </Text>
      </View>

      <View className="bg-card border border-border rounded-2xl p-4 gap-2">
        <Text className="text-sm font-semibold text-foreground">
          What happens next
        </Text>
        <Text className="text-xs text-muted-foreground leading-relaxed">
          {`1. Tap "Open App Store" below.\n2. Find GERDBuddy in your subscriptions.\n3. Tap "Cancel Subscription".\n\nYou'll keep Pro access until your current billing period ends.`}
        </Text>
      </View>

      <View className="mt-auto gap-3">
        <Button onPress={onOpenAppStore} className="w-full py-4 rounded-2xl">
          <View className="flex-row items-center gap-2">
            <Text className="text-primary-foreground font-semibold">
              Open App Store
            </Text>
            <ExternalLink size={16} color="#ffffff" />
          </View>
        </Button>
        <Pressable onPress={onAbort} className="py-3 items-center">
          <Text className="text-sm font-semibold text-muted-foreground underline">
            Never mind, keep my subscription
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default CancellationConfirmStep;
