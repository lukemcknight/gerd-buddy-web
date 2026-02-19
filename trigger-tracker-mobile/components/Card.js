import { View } from "react-native";
import { cn } from "../utils/style";

export const Card = ({ className, children, ...props }) => (
  <View
    className={cn(
      "bg-card border border-border rounded-2xl shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </View>
);

export default Card;
