import appFacts from "./app-facts.json";

export const SITE_URL = "https://www.gerdbuddy.app";
export const SITE_NAME = "GERDBuddy";
export const DEFAULT_IMAGE = `${SITE_URL}/gerdbuddy-mark.png`;

// Canonical App Store listing (GERDBuddy - GERD Food Scanner, app-id 6756620910).
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910";

/**
 * Verified product facts (price, rating, features, App Store URL).
 * Edit `app-facts.json`, never these values inline: the same file feeds the
 * SoftwareApplication schema, the prerendered HTML, and llms.txt, and AI
 * assistants quote those fields verbatim when asked about GERDBuddy.
 */
export const APP = appFacts;

/**
 * Byline for blog articles.
 *
 * Health content published under an anonymous "Team" byline is the weakest
 * credibility signal available to both search engines and AI answer engines,
 * which weight author identity heavily on medical topics. Luke is the app's
 * founder, the App Store seller of record, and already the first-person voice
 * of the App Store description and the homepage "Why GERDBuddy?" section, so a
 * founder byline is consistent with what the site already says.
 *
 * To revert to the previous organization byline, set `person` to null.
 */
export const AUTHOR = {
  person: {
    name: "Luke McKnight",
    jobTitle: "Founder, GERDBuddy",
  },
  /**
   * Deliberately empty. A "medically reviewed by" line is the single strongest
   * trust signal this site could add, and also the easiest to fake. Populate
   * this ONLY when a real, credentialed clinician has actually reviewed the
   * articles, and record who and when.
   */
  reviewedBy: null as { name: string; credentials: string; date: string } | null,
};

export const FORUM_CATEGORIES = [
  { slug: "food-and-triggers", name: "Food & Triggers", description: "What to eat, what to avoid, recipes" },
  { slug: "medication-and-treatment", name: "Medication & Treatment", description: "PPIs, H2 blockers, natural remedies" },
  { slug: "lifestyle-and-tips", name: "Lifestyle & Tips", description: "Sleep positions, stress management, exercise" },
  { slug: "new-to-gerd", name: "New to GERD", description: "Introductions, newly diagnosed, basic questions" },
  { slug: "general-discussion", name: "General Discussion", description: "Anything GERD-related that doesn't fit above" },
];
