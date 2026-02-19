import { Image, Text, View } from "react-native";
import { memo } from "react";

type MascotSize = "small" | "medium" | "large";

type MascotProps = {
  size?: MascotSize;
  message?: string;
  className?: string;
};

const sizeMap: Record<MascotSize, number> = {
  small: 72,
  medium: 108,
  large: 140,
};

function MascotComponent({ size = "medium", message, className }: MascotProps) {
  const dimension = sizeMap[size];

  return (
    <View className={`items-center gap-3 ${className ?? ""}`}>
      <Image
        source={require("../assets/mascot/turtle_shell_standing.png")}
        style={{ width: dimension, height: dimension }}
        className="rounded-3xl"
        resizeMode="contain"
      />
      {message ? (
        <View className="px-4 py-3 rounded-2xl bg-card border border-border max-w-xs">
          <Text className="text-center text-muted-foreground">{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const Mascot = memo(MascotComponent);

export default Mascot;
