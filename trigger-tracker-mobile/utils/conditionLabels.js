/**
 * Returns user-facing labels based on the user's selected conditions.
 * conditions: string[] — e.g. ["gerd"], ["gastritis"], or ["gerd", "gastritis"]
 */

const hasGerd = (c) => c?.includes("gerd");
const hasGastritis = (c) => c?.includes("gastritis");
const hasBoth = (c) => hasGerd(c) && hasGastritis(c);

/** Short noun: "acid reflux", "gastritis", or "digestive" */
export const conditionNoun = (conditions) => {
  if (!conditions?.length) return "acid reflux";
  if (hasBoth(conditions)) return "digestive";
  if (hasGastritis(conditions)) return "gastritis";
  return "acid reflux";
};

/** For "your GERD triggers" → "your acid reflux triggers" / "your gastritis triggers" / "your digestive triggers" */
export const conditionTriggerLabel = (conditions) =>
  `${conditionNoun(conditions)} triggers`;

/** For headings: "Understanding GERD Triggers" → condition-aware */
export const conditionHeading = (conditions) => {
  if (!conditions?.length) return "Acid Reflux / GERD";
  if (hasBoth(conditions)) return "Acid Reflux & Gastritis";
  if (hasGastritis(conditions)) return "Gastritis";
  return "Acid Reflux / GERD";
};

/** For tagline: "Your calm companion for ..." */
export const conditionTagline = (conditions) => {
  if (!conditions?.length) return "acid reflux & gastritis";
  if (hasBoth(conditions)) return "acid reflux & gastritis";
  if (hasGastritis(conditions)) return "gastritis";
  return "acid reflux";
};

/** For AI prompts: what the AI should focus on */
export const conditionAIContext = (conditions) => {
  if (!conditions?.length || (hasGerd(conditions) && !hasGastritis(conditions))) {
    return {
      focus: "GERD and acid reflux trigger risk",
      categories: "fat, spice, acid, carbonation, caffeine, chocolate, mint, alcohol",
      description: "estimates acid reflux trigger risk from food photos",
    };
  }
  if (hasGastritis(conditions) && !hasGerd(conditions)) {
    return {
      focus: "gastritis irritant risk",
      categories: "fat, spice, acid, caffeine, alcohol, processed foods, dairy, heavy meals",
      description: "estimates stomach irritant risk from food photos for someone with gastritis",
    };
  }
  // Both
  return {
    focus: "digestive trigger risk (acid reflux and gastritis)",
    categories: "fat, spice, acid, carbonation, caffeine, chocolate, mint, alcohol, processed foods, heavy meals",
    description: "estimates digestive trigger risk from food photos for someone with acid reflux and gastritis",
  };
};
