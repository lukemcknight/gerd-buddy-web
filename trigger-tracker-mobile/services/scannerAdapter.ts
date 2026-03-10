import type { FoodAnalysisResult } from "./foodAnalysis";

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

export type SaferSwap = {
  original: string;
  suggestion: string;
  reason: string;
};

export type EnhancedScanResult = {
  trafficLight: TrafficLightLabel;
  reasonTags: ReasonTag[];
  saferSwaps: SaferSwap[];
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

// ── Safer swaps ────────────────────────────────────────────────────────

// TODO: When backend supports swaps, fetch from API instead
const SWAP_DATABASE: Record<string, SaferSwap[]> = {
  acidic: [
    { original: "Tomato sauce", suggestion: "Pesto or olive oil dressing", reason: "Lower acidity" },
    { original: "Orange juice", suggestion: "Melon or banana smoothie", reason: "Non-acidic fruit" },
  ],
  spicy: [
    { original: "Hot sauce", suggestion: "Herbs (basil, oregano, thyme)", reason: "Flavor without heat" },
    { original: "Chili peppers", suggestion: "Bell peppers", reason: "Sweet pepper, no capsaicin" },
  ],
  "high-fat": [
    { original: "Fried chicken", suggestion: "Grilled or baked chicken", reason: "Less fat, same protein" },
    { original: "Cream sauce", suggestion: "Broth-based sauce", reason: "Lighter on the stomach" },
  ],
  caffeine: [
    { original: "Coffee", suggestion: "Low-acid coffee or herbal tea", reason: "Less stomach irritation" },
    { original: "Energy drink", suggestion: "Water with lemon (small amount)", reason: "Hydration without caffeine" },
  ],
  carbonation: [
    { original: "Soda", suggestion: "Still water or herbal tea", reason: "No gas buildup" },
    { original: "Sparkling water", suggestion: "Still water with cucumber", reason: "Refreshing, no bubbles" },
  ],
  mint: [
    { original: "Peppermint tea", suggestion: "Chamomile or ginger tea", reason: "Soothing without relaxing LES" },
  ],
  chocolate: [
    { original: "Chocolate dessert", suggestion: "Vanilla pudding or banana", reason: "Sweet without theobromine" },
  ],
  alcohol: [
    { original: "Wine", suggestion: "Non-alcoholic alternative", reason: "Avoids acid stimulation" },
  ],
  fried: [
    { original: "French fries", suggestion: "Baked potato wedges", reason: "Same taste, less grease" },
    { original: "Fried fish", suggestion: "Baked or steamed fish", reason: "Lighter preparation" },
  ],
  citrus: [
    { original: "Orange", suggestion: "Banana or melon", reason: "Non-acidic fruit" },
  ],
  dairy: [
    { original: "Whole milk", suggestion: "Almond or oat milk", reason: "Plant-based, easier to digest" },
  ],
  garlic: [
    { original: "Raw garlic", suggestion: "Garlic-infused oil (strained)", reason: "Milder flavor, less irritation" },
  ],
  onion: [
    { original: "Raw onion", suggestion: "Cooked onion (small amounts)", reason: "Cooking reduces irritation" },
  ],
};

export const getSaferSwaps = (
  reasonTags: ReasonTag[],
  maxSwaps: number = 3
): SaferSwap[] => {
  const swaps: SaferSwap[] = [];

  for (const tag of reasonTags) {
    if (tag === "personal-trigger") continue;
    const tagSwaps = SWAP_DATABASE[tag];
    if (tagSwaps) {
      for (const swap of tagSwaps) {
        if (swaps.length >= maxSwaps) break;
        // Avoid duplicates
        if (!swaps.some((s) => s.suggestion === swap.suggestion)) {
          swaps.push(swap);
        }
      }
    }
    if (swaps.length >= maxSwaps) break;
  }

  return swaps;
};

// ── Main adapter ───────────────────────────────────────────────────────

export const enhanceScanResult = (
  result: FoodAnalysisResult
): EnhancedScanResult => {
  const trafficLight = mapToTrafficLight(result.label, result.score);
  const reasonTags = extractReasonTags(result);
  const saferSwaps =
    trafficLight !== "Likely Safe" ? getSaferSwaps(reasonTags) : [];

  return {
    trafficLight,
    reasonTags,
    saferSwaps,
    score: result.score,
    label: result.label,
    confidence: result.confidence,
    reasons: result.reasons,
    suggestions: result.suggestions,
    personalTriggerMatch: result.personalTriggerMatch,
  };
};
