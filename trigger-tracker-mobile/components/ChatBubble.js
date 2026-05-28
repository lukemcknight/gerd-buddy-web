import { Text, View } from "react-native";

// Single chat bubble for the DoctorChatScreen. User bubbles right-aligned in
// brand-primary; assistant bubbles left-aligned in cream with a thin border.
// `sourceFacts` (assistant only) renders a small grey citation line below
// the reply text, e.g. "Based on: tomato sauce 3 of last 4 flares".

export default function ChatBubble({ role, text, sourceFacts }) {
  const isUser = role === "user";

  return (
    <View
      className={`max-w-[85%] my-1 ${isUser ? "self-end" : "self-start"}`}
    >
      <View
        className={`px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-primary rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        }`}
      >
        <Text
          className={`text-[15px] leading-[21px] ${
            isUser ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {text}
        </Text>
      </View>
      {!isUser && sourceFacts?.length > 0 ? (
        <Text className="text-[11px] text-muted-foreground mt-1 ml-2">
          Based on: {sourceFacts.join(" · ")}
        </Text>
      ) : null}
    </View>
  );
}
