/**
 * Generates llms.txt from the same data the site renders.
 * Run as part of the build: `node --import tsx scripts/generate-llms.js`
 *
 * llms.txt is the one document the site hands an AI crawler as authoritative, so a
 * stale one is worse than none. It used to be a hand-maintained file in public/,
 * which meant every new post or price change silently desynced it. This builds it
 * from src/content/blog/*, src/content/home-faqs.json and src/config/app-facts.json,
 * so it cannot fall behind.
 *
 * The product-facts block is the part that matters for AEO. An assistant asked
 * "how much does GERDBuddy cost" or "what does it run on" reads these lines.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { posts } from "../src/content/blog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://www.gerdbuddy.app";

const readJson = (path) => JSON.parse(readFileSync(resolve(__dirname, path), "utf-8"));
const APP = readJson("../src/config/app-facts.json");
const HOME_FAQS = readJson("../src/content/home-faqs.json");

const resolveFacts = (text) =>
  text.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const value = path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), APP);
    if (value === undefined || value === null) {
      throw new Error(`generate-llms: unknown app-facts token {{${path}}}`);
    }
    return String(value);
  });

// --- forum categories (mirrors FORUM_CATEGORIES in src/config/site.ts) -------
const forumCategories = [
  { slug: "food-and-triggers", name: "Food & Triggers", description: "What to eat, what to avoid, recipes" },
  { slug: "medication-and-treatment", name: "Medication & Treatment", description: "PPIs, H2 blockers, natural remedies" },
  { slug: "lifestyle-and-tips", name: "Lifestyle & Tips", description: "Sleep positions, stress management, exercise" },
  { slug: "new-to-gerd", name: "New to GERD", description: "Introductions, newly diagnosed, basic questions" },
  { slug: "general-discussion", name: "General Discussion", description: "Anything GERD-related that doesn't fit above" },
];

// --- document ---------------------------------------------------------------
const out = `# GERDBuddy

> GERDBuddy is an all-in-one GERD (gastroesophageal reflux disease) resource: an app for iPhone and iPad that scans meals for estimated reflux risk and helps you explore personal patterns, plus ${posts.length} educational articles and a community forum for people managing acid reflux.

GERDBuddy helps people identify their personal GERD trigger foods by logging meals and symptoms, then using AI to surface patterns and correlations. The app also scans restaurant menus for lower-risk suggestions and includes guided breathing and comfort steps during a flare. Estimates cannot guarantee that a food is safe. The site provides educational articles about GERD management and a community forum for peer support.

## Product Facts

These are the verified specifics about the GERDBuddy app, last checked ${APP._verification.verifiedOn}.

- **Name:** ${APP.name}
- **Platform:** ${APP.devices}. Requires ${APP.operatingSystem}. Not available on Android or as a web app.
- **Category:** ${APP.applicationSubCategory}
- **Price:** ${APP.pricing.summary}
- **Free trial:** ${APP.pricing.freeTrialDays} days
- **App Store rating:** ${APP.rating.value} out of 5 from ${APP.rating.count} ratings (US App Store)
- **App Store link:** ${APP.url}

### What the app does

${APP.featureList.map((f) => `- ${f}`).join("\n")}

### How it differs from a generic food diary

${APP.differentiators.map((d) => `- ${d}`).join("\n")}

### Important limitation

${APP.notMedicalAdvice}

## Key Pages

- [Homepage](${SITE_URL}/): Overview of GERDBuddy's resources including blog, forum, app, and FAQ
- [Blog](${SITE_URL}/blog): ${posts.length} educational articles about GERD management, trigger foods, lifestyle tips, and related conditions
- [Community Forum](${SITE_URL}/forum): Discussion categories for food triggers, medications, lifestyle tips, and general GERD topics
- [App Store](${APP.url}): The GERDBuddy app for iPhone and iPad

## Blog Articles

${posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`).join("\n")}

## Forum Categories

${forumCategories.map((c) => `- [${c.name}](${SITE_URL}/forum/${c.slug}): ${c.description}`).join("\n")}

## Frequently Asked Questions

### About the app

${HOME_FAQS.product.map((f) => `- **${f.q}** ${resolveFacts(f.a)}`).join("\n")}

### About GERD

${HOME_FAQS.general.map((f) => `- **${f.q}** ${resolveFacts(f.a)}`).join("\n")}

## Contact

- Email: gerdbuddy2@gmail.com
- Website: ${SITE_URL}
`;

const outPath = resolve(__dirname, "../dist/llms.txt");
writeFileSync(outPath, out, "utf-8");
console.log(
  `llms.txt generated at ${outPath} (${posts.length} posts, ${HOME_FAQS.product.length + HOME_FAQS.general.length} FAQs, product facts verified ${APP._verification.verifiedOn})`
);
