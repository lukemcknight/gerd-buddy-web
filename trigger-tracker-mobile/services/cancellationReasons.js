// Stable list — IDs are part of the analytics contract.
// DO NOT rename existing IDs without coordinating an analytics migration.
export const CANCELLATION_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using_enough", label: "Not using it enough" },
  { id: "missing_features", label: "Missing features I need" },
  { id: "found_better_app", label: "Found a better app" },
  { id: "gerd_improved", label: "My GERD improved" },
  { id: "other", label: "Other" },
];

export const isOtherReason = (id) => id === "other";

export const reasonLabelFor = (id) => {
  if (!id) return null;
  const match = CANCELLATION_REASONS.find((r) => r.id === id);
  return match ? match.label : null;
};
