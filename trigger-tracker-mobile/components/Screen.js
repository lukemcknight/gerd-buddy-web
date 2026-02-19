import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View } from "react-native";
import { cn } from "../utils/style";

export const Screen = ({ children, className = "", scrollable = true, contentClassName = "" }) => {
  if (scrollable) {
    return (
      <SafeAreaView className={cn("flex-1 bg-background", className)}>
        <ScrollView
          className="flex-1"
          contentContainerClassName={cn("px-5 pb-8 pt-3", contentClassName)}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={cn("flex-1 bg-background", className)}>
      <View className={cn("flex-1 px-5 pb-8 pt-3", contentClassName)}>{children}</View>
    </SafeAreaView>
  );
};

export default Screen;
