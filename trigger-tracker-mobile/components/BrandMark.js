import { Image } from "react-native";

const MARKS = {
  dark: require("../assets/brand/brand-mark-dark.png"),
  light: require("../assets/brand/brand-mark-light.png"),
};

export default function BrandMark({
  variant = "dark",
  size = 64,
  style,
  ...props
}) {
  return (
    <Image
      source={MARKS[variant] || MARKS.dark}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
      {...props}
    />
  );
}
