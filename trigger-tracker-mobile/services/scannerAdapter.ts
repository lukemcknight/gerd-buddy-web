import type { FoodAnalysisResult, SaferSwapResult } from "./foodAnalysis";

// ── Traffic light labels ───────────────────────────────────────────────

export type TrafficLightLabel = "Likely Safe" | "Caution" | "Likely Trigger";

export type ReasonTag =
  | "acidic"
  | "spicy"
  | "high-fat"
  | "caffeine"
  | "carbonation"
  | "mint"
  | "chocolate"
  | "alcohol"
  | "dairy"
  | "fried"
  | "citrus"
  | "garlic"
  | "onion"
  | "personal-trigger";

export type SaferSwap = SaferSwapResult;

export type EnhancedScanResult = {
  trafficLight: TrafficLightLabel;
  reasonTags: ReasonTag[];
  saferSwaps: SaferSwap[];
  detectedFoods: string[];
  // Original fields preserved
  score: number;
  label: string;
  confidence: number;
  reasons: string[];
  suggestions: string[];
  personalTriggerMatch?: string[];
};

// ── Label mapping ──────────────────────────────────────────────────────

export const mapToTrafficLight = (
  label: string,
  score: number
): TrafficLightLabel => {
  if (label === "Low" || score <= 2) return "Likely Safe";
  if (label === "High" || score >= 4) return "Likely Trigger";
  return "Caution";
};

// ── Reason tag extraction ──────────────────────────────────────────────

const REASON_KEYWORDS: Record<ReasonTag, string[]> = {
  acidic: ["acid", "acidic", "tomato", "vinegar", "citrus"],
  spicy: ["spicy", "spice", "pepper", "chili", "hot sauce", "jalapeño", "cayenne"],
  "high-fat": ["fat", "fatty", "greasy", "cream", "butter", "oil", "fried"],
  caffeine: ["caffeine", "coffee", "espresso", "tea", "energy drink"],
  carbonation: ["carbonat", "fizzy", "soda", "sparkling", "seltzer"],
  mint: ["mint", "peppermint", "spearmint", "menthol"],
  chocolate: ["chocolate", "cocoa", "cacao"],
  alcohol: ["alcohol", "wine", "beer", "liquor", "spirits"],
  dairy: ["dairy", "milk", "cheese", "yogurt", "cream"],
  fried: ["fried", "deep-fried", "breaded", "crispy", "battered"],
  citrus: ["citrus", "orange", "lemon", "lime", "grapefruit"],
  garlic: ["garlic"],
  onion: ["onion", "shallot", "scallion"],
  "personal-trigger": [],
};

export const extractReasonTags = (
  result: FoodAnalysisResult
): ReasonTag[] => {
  const tags = new Set<ReasonTag>();
  const searchText = [
    ...result.reasons,
    ...result.suggestions,
    ...(result.detectedFoods || []),
  ]
    .join(" ")
    .toLowerCase();

  for (const [tag, keywords] of Object.entries(REASON_KEYWORDS)) {
    if (tag === "personal-trigger") continue;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        tags.add(tag as ReasonTag);
        break;
      }
    }
  }

  if (result.personalTriggerMatch && result.personalTriggerMatch.length > 0) {
    tags.add("personal-trigger");
  }

  return Array.from(tags);
};

// ── Main adapter ───────────────────────────────────────────────────────

export const enhanceScanResult = (
  result: FoodAnalysisResult
): EnhancedScanResult => {
  const trafficLight = mapToTrafficLight(result.label, result.score);
  const reasonTags = extractReasonTags(result);
  // Use AI-generated swaps directly
  const saferSwaps = trafficLight !== "Likely Safe" ? (result.saferSwaps || []) : [];

  return {
    trafficLight,
    reasonTags,
    saferSwaps,
    detectedFoods: result.detectedFoods || [],
    score: result.score,
    label: result.label,
    confidence: result.confidence,
    reasons: result.reasons,
    suggestions: result.suggestions,
    personalTriggerMatch: result.personalTriggerMatch,
  };
};
