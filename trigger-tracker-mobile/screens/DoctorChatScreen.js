import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Info, Send, ShieldAlert } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import ChatBubble from "../components/ChatBubble";
import { askDoctorAI } from "../services/doctorAI";
import {
  getMeals,
  getSymptoms,
  getUser,
  AI_CHAT_DAILY_LIMIT,
  getAIChatCount,
  incrementAIChatCount,
  resetAIChatCountIfNewDay,
} from "../services/storage";
import { generateTriggerReport } from "../utils/triggerEngine";
import { EVENTS } from "../services/analytics";

const SUGGESTED_QUESTIONS = [
  "Why am I having heartburn today?",
  "What changed this week?",
  "Is coffee safe for me based on my data?",
];

const buildUserContext = async () => {
  const [meals, symptoms, user] = await Promise.all([
    getMeals(),
    getSymptoms(),
    getUser(),
  ]);
  const report = generateTriggerReport(meals, symptoms);

  // Recent meals: last 8 in chronological order, just the text.
  const recentMeals = meals
    .slice(-8)
    .map((m) => m.text)
    .filter(Boolean);

  // Recent symptoms with relative-time labels (rough, not precise).
  const now = Date.now();
  const formatAgo = (ts) => {
    const hours = Math.floor((now - ts) / (60 * 60 * 1000));
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  const recentSymptoms = symptoms
    .slice(-5)
    .map((s) => ({
      type: (s.symptomTypes && s.symptomTypes[0]) || "symptom",
      severity: s.severity,
      ago: formatAgo(s.timestamp),
    }));

  return {
    topTriggers: report.topTriggers,
    safeFoods: report.safeFoods,
    avgSeverity: report.avgSeverity,
    lateEatingRisk: report.lateEatingRisk,
    worstTimeOfDay: report.worstTimeOfDay,
    symptomFreeDays: report.symptomFreeDays,
    totalMeals: report.totalMeals,
    totalSymptoms: report.totalSymptoms,
    recentMeals,
    recentSymptoms,
    conditions: user?.conditions,
  };
};

export default function DoctorChatScreen({ navigation }) {
  const [messages, setMessages] = useState([]); // { id, role, text, sourceFacts }
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [chatCount, setChatCount] = useState(0);
  const scrollRef = useRef(null);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture(EVENTS.AI_CHAT_OPENED);
    (async () => {
      await resetAIChatCountIfNewDay();
      setChatCount(await getAIChatCount());
    })();
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const sendMessage = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text || isSending) return;

    const remaining = AI_CHAT_DAILY_LIMIT - chatCount;
    if (remaining <= 0) {
      posthog?.capture(EVENTS.AI_CHAT_QUOTA_REACHED);
      setMessages((prev) => [
        ...prev,
        {
          id: `quota-${Date.now()}`,
          role: "assistant",
          text: "Daily limit reached — resets at midnight. Try again tomorrow.",
        },
      ]);
      scrollToBottom();
      return;
    }

    const userMsg = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowDisclaimer(false);
    setIsSending(true);
    scrollToBottom();

    const startedAt = Date.now();
    try {
      const userContext = await buildUserContext();
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));
      const { reply, sourceFacts } = await askDoctorAI({
        userMessage: text,
        conversationHistory,
        userContext,
      });

      const newCount = await incrementAIChatCount();
      setChatCount(newCount);

      posthog?.capture(EVENTS.AI_CHAT_MESSAGE_SENT, {
        message_count_today: newCount,
        response_ms: Date.now() - startedAt,
      });

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: reply, sourceFacts },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text:
            "I couldn't reach the analysis service. Check your connection and try again — and remember this assistant is for interpreting patterns, not medical advice.",
        },
      ]);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const remaining = Math.max(0, AI_CHAT_DAILY_LIMIT - chatCount);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: "#fcf9f8" }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e2d9",
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityLabel="Back"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color="#1b1c1c" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1b1c1c" }}>
            Ask GERDBuddy AI
          </Text>
          <Text style={{ fontSize: 11, color: "#72796e", marginTop: 2 }}>
            {remaining} of {AI_CHAT_DAILY_LIMIT} messages left today
          </Text>
        </View>
        <Pressable
          onPress={() => setShowDisclaimer((v) => !v)}
          hitSlop={8}
          accessibilityLabel="About this assistant"
          accessibilityRole="button"
        >
          <Info size={20} color="#72796e" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          onContentSizeChange={scrollToBottom}
        >
          {showDisclaimer ? (
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                backgroundColor: "#ecf5e9",
                borderColor: "#cfdcca",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <ShieldAlert size={18} color="#154212" />
              <Text style={{ flex: 1, fontSize: 12, color: "#154212", lineHeight: 18 }}>
                This AI interprets patterns in your tracked data — it is not
                medical advice. Always consult your doctor for medical decisions.
              </Text>
            </View>
          ) : null}

          {messages.length === 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: "#72796e",
                  fontWeight: "800",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Try asking
              </Text>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => sendMessage(q)}
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e5e2d9",
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#1b1c1c" }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            messages.map((m) => (
              <ChatBubble
                key={m.id}
                role={m.role}
                text={m.text}
                sourceFacts={m.sourceFacts}
              />
            ))
          )}

          {isSending ? (
            <View style={{ alignSelf: "flex-start", paddingVertical: 8, paddingLeft: 6 }}>
              <ActivityIndicator size="small" color="#154212" />
            </View>
          ) : null}
        </ScrollView>

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 8,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 24 : 28,
            borderTopWidth: 1,
            borderTopColor: "#e5e2d9",
            backgroundColor: "#fcf9f8",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your patterns…"
            placeholderTextColor="#9da39a"
            multiline
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 120,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e5e2d9",
              backgroundColor: "#ffffff",
              paddingHorizontal: 14,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 15,
              color: "#1b1c1c",
            }}
            editable={!isSending}
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={!input.trim() || isSending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: input.trim() && !isSending ? "#154212" : "#cfdcca",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Send size={18} color="#ffffff" strokeWidth={2.2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
