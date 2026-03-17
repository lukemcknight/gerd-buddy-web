const COLORS = [
  "bg-primary", "bg-accent", "bg-success", "bg-warning",
  "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-teal-500",
];

interface InitialAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
}

const InitialAvatar = ({ name, size = "md" }: InitialAvatarProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colorIndex = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };

  return (
    <div className={`${COLORS[colorIndex]} ${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold`}>
      {initials}
    </div>
  );
};

export default InitialAvatar;
