import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import Button from "../Button";
import { TextArea } from "../TextField";
import {
  CANCELLATION_REASONS,
  isOtherReason,
} from "../../services/cancellationReasons";

export const CancellationReasonStep = ({
  selectedId = null,
  otherText = "",
  onSelect,
  onOtherTextChange,
  onBack,
  onContinue,
}) => {
  const isOther = isOtherReason(selectedId);
  const continueDisabled =
    !selectedId || (isOther && otherText.trim().length === 0);

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
          Step 1 of 3
        </Text>
      </View>

      <View>
        <Text className="text-2xl font-bold text-foreground">
          Before you go
        </Text>
        <Text className="text-sm text-muted-foreground mt-1">
          What's the main reason you're thinking about cancelling? Your answer
          helps us improve GERDBuddy.
        </Text>
      </View>

      <View className="gap-2">
        {CANCELLATION_REASONS.map((opt) => {
          const selected = selectedId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect?.(opt.id)}
              className={`p-4 rounded-xl border ${
                selected
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border"
              }`}
            >
              <Text className="text-sm text-foreground">{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isOther && (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Tell us more
          </Text>
          <TextArea
            value={otherText}
            onChangeText={onOtherTextChange}
            placeholder="What's going on?"
            className="min-h-[100px]"
          />
        </View>
      )}

      <View className="mt-auto">
        <Button
          onPress={onContinue}
          disabled={continueDisabled}
          className="w-full py-4 rounded-2xl"
        >
          Continue
        </Button>
      </View>
    </View>
  );
};

export default CancellationReasonStep;
