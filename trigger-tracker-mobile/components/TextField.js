import { TextInput } from "react-native";
import { cn } from "../utils/style";

export const Input = ({ className, ...props }) => (
  <TextInput
    className={cn(
      "w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground",
      className
    )}
    placeholderTextColor="#5f6f74"
    {...props}
  />
);

export const TextArea = ({ className, ...props }) => (
  <TextInput
    className={cn(
      "w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground",
      "min-h-[120px]",
      className
    )}
    placeholderTextColor="#5f6f74"
    multiline
    textAlignVertical="top"
    {...props}
  />
);

export default Input;
