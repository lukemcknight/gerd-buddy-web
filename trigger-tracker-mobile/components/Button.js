import { Pressable, Text } from "react-native";
import { cn } from "../utils/style";

const base =
  "flex-row items-center justify-center rounded-xl px-4 py-3 active:opacity-90";

const variants = {
  primary: "bg-primary",
  accent: "bg-accent",
  outline: "border border-border bg-white",
  ghost: "bg-transparent",
};

const textVariants = {
  primary: "text-primary-foreground font-semibold",
  accent: "text-accent-foreground font-semibold",
  outline: "text-foreground font-semibold",
  ghost: "text-foreground font-semibold",
};

export const Button = ({ title = "", children, variant = "primary", className = "", textClassName = "", disabled = false, ...props }) => {
  return (
    <Pressable
      className={cn(
        base,
        variants[variant] || variants.primary,
        disabled && "opacity-60",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {typeof children === "string" ? (
        <Text className={cn(textVariants[variant], textClassName)}>{children}</Text>
      ) : children ? (
        children
      ) : (
        <Text className={cn(textVariants[variant], textClassName)}>{title}</Text>
      )}
    </Pressable>
  );
};

export default Button;
