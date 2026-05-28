// AI client for non-image GERDBuddy use cases: visit-prep question generation
// and the in-app Q&A chat. Modelled on services/foodAnalysis.ts — same Gemini
// endpoint, key, safety settings, JSON-fallback parsing, and debug-logging
// pattern. Kept as a separate file so the two domains don't entangle.

const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const AI_API_KEY =
  process.env.EXPO_PUBLIC_FOOD_AI_KEY || "YOUR_GEMINI_API_KEY_HERE";
const placeholderKeys = ["YOUR_GEMINI_API_KEY_HERE", "YOUR_VISION_MODEL_API_KEY_HERE"];
const DEBUG_DOCTOR_AI = process.env.EXPO_PUBLIC_FOOD_AI_DEBUG === "true";

const logDebug = (message: string, details?: Record<string, unknown>) => {
  if (!DEBUG_DOCTOR_AI) return;
  if (details) {
    console.log(`[DoctorAI] ${message}`, details);
  } else {
    console.log(`[DoctorAI] ${message}`);
  }
};

// ── Shared types ────────────────────────────────────────────────────────

export type TriggerSummary = {
  ingredient: string;
  symptomRate?: number;
  avgSeverity?: number;
  totalOccurrences?: number;
  confidence?: number;
};

export type SafeFoodSummary = {
  ingredient: string;
  safetyScore?: number;
  totalOccurrences?: number;
};

export type UserContext = {
  topTriggers: TriggerSummary[];
  safeFoods: SafeFoodSummary[];
  avgSeverity?: number;
  lateEatingRisk?: number;
  worstTimeOfDay?: string;
  symptomFreeDays?: number;
  totalMeals?: number;
  totalSymptoms?: number;
  recentMeals?: string[]; // last 7-day meal texts, short list
  recentSymptoms?: { type: string; severity: number; ago: string }[];
  conditions?: string[];
};

export type VisitPrepResult = {
  questions: string[]; // 3 short doctor-facing questions
  concerningTrends: string[]; // 1-3 trend callouts the AI flagged
};

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type ChatReply = {
  reply: string;
  sourceFacts: string[]; // short citations the AI used (e.g. "3 trigger meals in 7d")
};

// ── Shared system prompt ────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a careful health-tracking assistant for someone managing GERD. " +
  "Your role is to interpret patterns in the user's tracked data (meals, symptoms, triggers). " +
  "You DO NOT diagnose conditions, prescribe medications, or replace doctor advice. " +
  "When users describe symptoms outside of patterns (severe pain, blood, weight loss, chest pain), " +
  "recommend they consult a doctor immediately. " +
  "Be specific and cite the data point you used (e.g., 'You logged tomato sauce in 3 of the last 4 symptom flares'). " +
  "Be concise — replies under 100 words unless the question genuinely requires more. " +
  "Never invent data the user didn't provide.";

// ── Response parsing helpers (copied pattern from foodAnalysis.ts) ──────

const parseModelJson = (content: unknown) => {
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
};

const extractTextFromResponse = (data: any): string => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part: any) => part?.text)
    .filter(Boolean)
    .join("\n");
};

const ensureKey = () => {
  if (!AI_API_KEY || placeholderKeys.includes(AI_API_KEY)) {
    throw new Error(
      "Missing AI API key. Add EXPO_PUBLIC_FOOD_AI_KEY or update the placeholder key."
    );
  }
};

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
];

// ── User-context formatting ─────────────────────────────────────────────

export const formatUserContextForPrompt = (ctx: UserContext): string => {
  const parts: string[] = [];

  if (ctx.topTriggers?.length) {
    const list = ctx.topTriggers
      .slice(0, 5)
      .map((t) => {
        const bits = [t.ingredient];
        if (typeof t.symptomRate === "number") bits.push(`${t.symptomRate}% symptom rate`);
        if (typeof t.avgSeverity === "number") bits.push(`avg severity ${t.avgSeverity}/5`);
        if (typeof t.totalOccurrences === "number") bits.push(`${t.totalOccurrences}x logged`);
        return `- ${bits.join(", ")}`;
      })
      .join("\n");
    parts.push(`Top suspected triggers:\n${list}`);
  }

  if (ctx.safeFoods?.length) {
    const list = ctx.safeFoods
      .slice(0, 5)
      .map((f) => `- ${f.ingredient}${typeof f.safetyScore === "number" ? ` (${f.safetyScore}% safe)` : ""}`)
      .join("\n");
    parts.push(`Likely safe foods:\n${list}`);
  }

  const stats: string[] = [];
  if (typeof ctx.totalMeals === "number") stats.push(`${ctx.totalMeals} meals tracked`);
  if (typeof ctx.totalSymptoms === "number") stats.push(`${ctx.totalSymptoms} symptoms logged`);
  if (typeof ctx.avgSeverity === "number") stats.push(`average severity ${ctx.avgSeverity.toFixed(1)}/5`);
  if (typeof ctx.symptomFreeDays === "number") stats.push(`${ctx.symptomFreeDays} symptom-free days`);
  if (typeof ctx.lateEatingRisk === "number") stats.push(`${ctx.lateEatingRisk}% of symptoms follow late meals`);
  if (ctx.worstTimeOfDay) stats.push(`worst time of day: ${ctx.worstTimeOfDay}`);
  if (stats.length) parts.push(`Stats: ${stats.join("; ")}.`);

  if (ctx.recentMeals?.length) {
    parts.push(`Recent meals (last 7d): ${ctx.recentMeals.slice(0, 8).join("; ")}`);
  }

  if (ctx.recentSymptoms?.length) {
    const recent = ctx.recentSymptoms
      .slice(0, 5)
      .map((s) => `${s.type} (severity ${s.severity}/5, ${s.ago})`)
      .join("; ");
    parts.push(`Recent symptoms: ${recent}`);
  }

  if (ctx.conditions?.length) {
    parts.push(`Conditions: ${ctx.conditions.join(", ")}`);
  }

  return parts.join("\n\n");
};

// ── Visit-prep question generation ──────────────────────────────────────

const VISIT_PREP_FALLBACK: VisitPrepResult = {
  questions: [
    "Based on my tracked patterns, are there additional tests (H. pylori, endoscopy, pH study) you'd recommend?",
    "Are my current symptom triggers consistent with GERD, or could another condition explain them?",
    "Given my severity trend, should I consider adjusting medication or trying an elimination protocol?",
  ],
  concerningTrends: [],
};

export const generateVisitPrepQuestions = async (
  userContext: UserContext
): Promise<VisitPrepResult> => {
  ensureKey();
  logDebug("Generating visit-prep questions", {
    triggerCount: userContext.topTriggers?.length || 0,
    symptomCount: userContext.totalSymptoms,
  });

  const contextBlock = formatUserContextForPrompt(userContext);
  const userPrompt =
    "Generate a JSON object with two fields based on the user's tracked GERD data below.\n\n" +
    `${contextBlock}\n\n` +
    'Return ONLY JSON: {"questions":string[3] (3 SHORT specific questions to ask their GI, ' +
    "each grounded in a specific pattern above — under 25 words each, no fluff), " +
    '"concerningTrends":string[] (0-3 short callouts of patterns the GI should be aware of, ' +
    "each under 20 words; empty array if none stand out)}. " +
    "No markdown, no code fences, no preamble.";

  const response = await fetch(`${API_URL}?key=${AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 700,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
      safetySettings: SAFETY_SETTINGS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logDebug("Visit-prep response error", {
      status: response.status,
      errorText: errorText || "no body",
    });
    throw new Error(
      `Visit prep failed (${response.status}): ${errorText || "Unknown AI error"}`
    );
  }

  const data = await response.json();
  const content = extractTextFromResponse(data);
  const parsed = parseModelJson(content);
  logDebug("Visit-prep parsed", { hasParsed: Boolean(parsed) });

  if (!parsed) return VISIT_PREP_FALLBACK;

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((q: unknown) => String(q || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
  const concerningTrends = Array.isArray(parsed.concerningTrends)
    ? parsed.concerningTrends
        .map((t: unknown) => String(t || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (questions.length === 0) return VISIT_PREP_FALLBACK;

  return { questions, concerningTrends };
};

// ── Chat Q&A ────────────────────────────────────────────────────────────

const CHAT_FALLBACK_REPLY =
  "I couldn't reach the analysis service. Try again in a moment, " +
  "and remember this assistant is for interpreting patterns — not medical advice.";

export const askDoctorAI = async ({
  userMessage,
  conversationHistory = [],
  userContext,
}: {
  userMessage: string;
  conversationHistory?: ChatTurn[];
  userContext: UserContext;
}): Promise<ChatReply> => {
  ensureKey();
  logDebug("Sending chat message", {
    messageLength: userMessage.length,
    historyTurns: conversationHistory.length,
  });

  const contextBlock = formatUserContextForPrompt(userContext);

  // Convert prior turns into Gemini's chat-style "contents" array.
  const historyContents = conversationHistory.slice(-6).map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));

  const groundedUserPrompt =
    `USER QUESTION: ${userMessage}\n\n` +
    `USER'S DATA:\n${contextBlock || "(no data yet — user just started tracking)"}\n\n` +
    "Reply in plain prose (no JSON, no markdown headers). " +
    "At the very end of your reply, add a line starting with 'CITED:' " +
    "followed by a comma-separated list of the specific data points you used " +
    "(short phrases, e.g. 'tomato sauce 3 of last 4 flares, evening symptom pattern'). " +
    "If you used no specific data, omit the CITED line.";

  const response = await fetch(`${API_URL}?key=${AI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        ...historyContents,
        { role: "user", parts: [{ text: groundedUserPrompt }] },
      ],
      generationConfig: {
        maxOutputTokens: 600,
        temperature: 0.4,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logDebug("Chat response error", {
      status: response.status,
      errorText: errorText || "no body",
    });
    throw new Error(
      `Chat failed (${response.status}): ${errorText || "Unknown AI error"}`
    );
  }

  const data = await response.json();
  const raw = extractTextFromResponse(data) || CHAT_FALLBACK_REPLY;

  // Split off the CITED: line if present.
  const citedMatch = raw.match(/(?:^|\n)CITED:\s*(.+)\s*$/i);
  const sourceFacts = citedMatch
    ? citedMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const reply = citedMatch ? raw.replace(citedMatch[0], "").trim() : raw.trim();

  logDebug("Chat parsed", { replyLength: reply.length, citedCount: sourceFacts.length });

  return { reply, sourceFacts };
};
