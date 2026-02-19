type FoodImageAsset = {
  uri: string;
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
};

export type FoodAnalysisResult = {
  score: number; // 1–5
  label: "Low" | "Moderate" | "High";
  confidence: number; // 0–1
  reasons: string[];
  suggestions: string[];
};

const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// TODO: Move this key to a backend service once available.
const AI_API_KEY =
  process.env.EXPO_PUBLIC_FOOD_AI_KEY || "YOUR_GEMINI_API_KEY_HERE";
const placeholderKeys = ["YOUR_GEMINI_API_KEY_HERE", "YOUR_VISION_MODEL_API_KEY_HERE"];

const fallbackResult: FoodAnalysisResult = {
  score: 3,
  label: "Moderate",
  confidence: 0.5,
  reasons: ["We could not confidently read this image. Try a clearer photo."],
  suggestions: ["Retake the photo in better lighting and avoid glare."],
};

const clampScore = (value?: number | string | null) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.min(5, Math.max(1, Math.round(parsed)));
  }
  return 3;
};

const normalizeLabel = (label: string | null | undefined, score: number) => {
  if (!label) {
    if (score <= 2) return "Low";
    if (score >= 4) return "High";
    return "Moderate";
  }
  const normalized = label.toLowerCase();
  if (normalized.includes("low")) return "Low";
  if (normalized.includes("high")) return "High";
  return "Moderate";
};

const ensureArray = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return fallback;
};

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

const normalizeResult = (raw: any): FoodAnalysisResult => {
  if (!raw || typeof raw !== "object") {
    return fallbackResult;
  }

  const score = clampScore(raw.score);
  const label = normalizeLabel(raw.label, score);
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0.5));
  const reasons = ensureArray(
    raw.reasons,
    fallbackResult.reasons
  );
  const suggestions = ensureArray(
    raw.suggestions,
    ["Eat smaller portions and avoid lying down soon after eating."]
  );

  return {
    score,
    label,
    confidence,
    reasons,
    suggestions,
  };
};

export const analyzeFoodImage = async (
  asset: FoodImageAsset
): Promise<FoodAnalysisResult> => {
  if (!AI_API_KEY || placeholderKeys.includes(AI_API_KEY)) {
    throw new Error(
      "Missing AI API key. Add EXPO_PUBLIC_FOOD_AI_KEY or update the placeholder key."
    );
  }

  if (!asset?.base64) {
    throw new Error(
      "No image data available for analysis. Please retake the photo and allow image access."
    );
  }

  const systemPrompt =
    "You are a concise assistant that estimates GERD trigger risk from food photos. " +
    "Stay cautious, avoid medical claims, and keep outputs brief.";

  const userPrompt =
    "Analyze this food image for GERD trigger risk. " +
    'Return ONLY JSON: {"score":1-5,"label":"Low"|"Moderate"|"High","confidence":0-1,"reasons":string[],"suggestions":string[]}. ' +
    "Keep reasons short, call out trigger categories when relevant (fat, spice, acid, carbonation, caffeine, chocolate, mint, alcohol). " +
    "No markdown, no code fences, no extra text.";

  const response = await fetch(`${API_URL}?key=${AI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inline_data: {
                mime_type: asset.mimeType || "image/jpeg",
                data: asset.base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Analysis failed (${response.status}): ${errorText || "Unknown error from AI service"
      }`
    );
  }

  const data = await response.json();

  // Try to extract all text parts to improve parsing reliability.
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const content = parts
    .map((part: any) => part?.text)
    .filter(Boolean)
    .join("\n");

  const finishReason = data?.candidates?.[0]?.finishReason;
  const parsed = parseModelJson(content);

  if (!parsed && finishReason === "MAX_TOKENS") {
    throw new Error(
      "The AI response was truncated. Please try again; if it persists, reduce prompt length or increase max tokens."
    );
  }

  return normalizeResult(parsed);
};

export default analyzeFoodImage;
