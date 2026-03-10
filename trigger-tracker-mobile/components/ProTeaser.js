import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Sparkles } from "lucide-react-native";
import Button from "./Button";

export const ProTeaser = ({ title, description }) => {
  const navigation = useNavigation();

  return (
    <View className="p-4 rounded-xl border bg-primary/5 border-primary/20">
      <View className="flex-row items-center gap-2 mb-1">
        <Sparkles size={16} color="#3aa27f" />
        <Text className="font-semibold text-foreground">{title}</Text>
      </View>
      <Text className="text-sm text-muted-foreground mb-3">{description}</Text>
      <Button
        onPress={() => navigation.navigate("Paywall")}
        className="w-full py-3 rounded-xl"
      >
        <View className="flex-row items-center justify-center gap-2">
          <Sparkles size={16} color="#ffffff" />
          <Text className="text-primary-foreground font-semibold">Upgrade</Text>
        </View>
      </Button>
    </View>
  );
};

export default ProTeaser;
