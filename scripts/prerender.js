/**
 * Template-based prerendering script.
 * Reads blog post source files and generates static HTML with full content,
 * meta tags, and JSON-LD for each route — no browser required.
 *
 * Run as part of the build: `node scripts/prerender.js`
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");
const SITE_URL = "https://gerdbuddy.app";

// Read the built index.html as our shell
const shell = readFileSync(resolve(DIST, "index.html"), "utf-8");

// Extract CSS link from the shell so prerendered pages load styles
const cssLink = shell.match(/<link[^>]+\.css[^>]*>/)?.[0] || "";
const jsScripts = [...shell.matchAll(/<script[^>]*src="[^"]*"[^>]*><\/script>/g)].map((m) => m[0]).join("\n");

// Parse blog post files
const blogDir = resolve(__dirname, "../src/content/blog");
const blogFiles = readdirSync(blogDir).filter(
  (f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts"
);

function extractField(content, field) {
  // Handle multiline string fields (like description that may span lines)
  const multiline = content.match(new RegExp(`${field}:\\s*\\n?\\s*["'\`]([^"'\`]+)["'\`]`));
  if (multiline) return multiline[1];
  const single = content.match(new RegExp(`${field}:\\s*["'\`]([^"'\`]+)["'\`]`));
  return single ? single[1] : null;
}

function extractArray(content, field) {
  const match = content.match(new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`));
  if (!match) return [];
  return match[1].match(/["']([^"']+)["']/g)?.map((s) => s.replace(/["']/g, "")) || [];
}

const posts = [];
for (const file of blogFiles) {
  const raw = readFileSync(resolve(blogDir, file), "utf-8");
  const slug = extractField(raw, "slug");
  if (!slug) continue;

  // Extract markdown content between backticks
  const contentMatch = raw.match(/content:\s*`\n?([\s\S]*?)`\.trim\(\)/);
  const markdownContent = contentMatch ? contentMatch[1].trim() : "";

  posts.push({
    slug,
    title: extractField(raw, "title") || slug,
    description: extractField(raw, "description") || "",
    date: extractField(raw, "date") || "",
    dateModified: extractField(raw, "dateModified") || "",
    author: extractField(raw, "author") || "GERDBuddy Team",
    category: extractField(raw, "category") || "GERD Management",
    tags: extractArray(raw, "tags"),
    content: markdownContent,
  });
}

posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildPage({ title, description, path, content, jsonLd, extra = "" }) {
  const fullTitle = `${title} | GERDBuddy`;
  const url = `${SITE_URL}${path}`;
  const jsonLdTags = (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    .filter(Boolean)
    .map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${SITE_URL}/turtle.png" />
  <meta property="og:site_name" content="GERDBuddy" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${SITE_URL}/turtle.png" />
  <meta name="theme-color" content="#4d9078" />
  <meta name="apple-itunes-app" content="app-id=6756620910" />
  <link rel="alternate" type="application/rss+xml" title="GERDBuddy Blog" href="${SITE_URL}/feed.xml" />
  ${cssLink}
  ${jsonLdTags}
  ${extra}
</head>
<body>
  <div id="root">${content}</div>
  ${jsScripts}
</body>
</html>`;
}

function writePage(route, html) {
  const outDir = route === "/" ? DIST : resolve(DIST, route.slice(1));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html, "utf-8");
}

// --- Generate pages ---

console.log(`Prerendering ${2 + 1 + posts.length + 6} routes...`);

// FAQ data for homepage prerender
const faqItems = [
  { q: "Is GERDBuddy a medical app?", a: "No. GERDBuddy is for informational and tracking purposes only and does not provide medical advice." },
  { q: "Is my data shared or sold?", a: "No. User data is never sold or shared." },
  { q: "How do I cancel my subscription?", a: "Subscriptions are managed through your Apple App Store or Google Play account." },
  { q: "What foods trigger GERD?", a: "Common GERD trigger foods include spicy foods, fatty or fried foods, citrus fruits, tomatoes, chocolate, mint, coffee, alcohol, and carbonated drinks. However, triggers vary from person to person — tracking your meals and symptoms is the best way to identify your personal triggers." },
  { q: "How do I track my GERD triggers?", a: "Keep a food and symptom journal for at least 1-2 weeks. Record what you eat, when you eat, any symptoms you experience, and their severity. GERDBuddy makes this easy by letting you quickly log meals and symptoms on your phone and uses AI to help surface patterns and correlations." },
  { q: "What is the difference between GERD and heartburn?", a: "Heartburn is a symptom — a burning feeling in your chest caused by stomach acid reaching the esophagus. GERD (gastroesophageal reflux disease) is a chronic condition where acid reflux happens frequently, typically twice a week or more. Occasional heartburn is normal, but persistent heartburn may indicate GERD and should be discussed with a doctor." },
  { q: "Can GERD be managed without medication?", a: "Many people manage mild GERD symptoms through lifestyle changes such as elevating the head of the bed, eating smaller meals, avoiding trigger foods, not eating 2-3 hours before bed, maintaining a healthy weight, and managing stress. However, moderate to severe GERD may require medication. Always consult your doctor for personalized advice." },
  { q: "What foods help with acid reflux?", a: "Foods that can help soothe acid reflux include oatmeal, bananas, ginger, melons, green vegetables, lean proteins, whole grains, and non-citrus fruits. These foods are low in acid, high in fiber, and easy to digest. However, individual tolerances vary, so tracking your personal response to different foods is important." },
  { q: "Is acid reflux common during pregnancy?", a: "Yes, up to 80% of pregnant women experience acid reflux. It's caused by hormonal changes (progesterone relaxes the lower esophageal sphincter) and physical pressure from the growing uterus. Most pregnancy-related reflux resolves after delivery." },
  { q: "Can exercise make GERD worse?", a: "Some exercises can trigger acid reflux, especially high-impact activities, heavy weightlifting, and exercises that increase abdominal pressure. However, regular moderate exercise actually helps GERD long-term through weight management and stress reduction. Low-impact activities like walking, swimming, and yoga are generally well-tolerated." },
  { q: "What is the best app for tracking GERD triggers?", a: "GERDBuddy is a dedicated GERD trigger tracking app available on the App Store. It lets you quickly log meals and symptoms, then uses AI-powered insights to help you identify your personal trigger foods and patterns. Most users start seeing meaningful patterns within 7 days of consistent tracking." },
  { q: "How long does it take to identify GERD triggers?", a: "With consistent daily tracking of meals and symptoms, most people can start identifying their primary GERD triggers within 1-2 weeks. A more complete picture typically emerges after 3-4 weeks." },
  { q: "Can a hiatal hernia cause GERD?", a: "Yes, a hiatal hernia can contribute to GERD by weakening the lower esophageal sphincter (LES) and allowing stomach acid to flow back into the esophagus. However, many people with small hiatal hernias have no reflux symptoms at all." },
  { q: "Can acid reflux cause breathing problems or asthma?", a: "Yes, GERD can trigger or worsen asthma and breathing problems through two mechanisms: microaspiration (tiny amounts of acid reaching the airways) and vagal nerve reflexes that cause airway tightening. Up to 80% of asthma sufferers also have GERD." },
  { q: "What should I do during a GERD flare-up?", a: "During a GERD flare-up, take an antacid for quick relief, stay upright, sip water, and stick to bland foods like oatmeal, bananas, plain rice, and steamed vegetables. Avoid all known triggers, eat small portions, and keep your head elevated while sleeping." },
  { q: "Do children get GERD?", a: "Yes, GERD can affect children of all ages. Infant reflux (spitting up) is very common and usually resolves by 12-18 months. Older children may experience heartburn, chronic cough, sore throat, or food refusal." },
  { q: "How do eating habits affect GERD?", a: "How you eat is just as important as what you eat for GERD management. Eating too fast, large portions, eating late at night, slouching while eating, and lying down after meals can all trigger acid reflux. Helpful habits include eating smaller meals, chewing thoroughly, sitting upright during and after meals, and waiting 2-3 hours before lying down." },
];

const faqHtml = faqItems
  .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
  .join("\n");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const recentBlogHtml = posts.slice(0, 3)
  .map((p) => `<article><h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.description)}</p><time datetime="${p.date}">${p.date}</time></article>`)
  .join("\n");

// Home page
writePage("/", buildPage({
  title: "Your All-in-One GERD Resource — Articles, Tracking & Community",
  description: "Track triggers, explore expert articles, and connect with a community that gets it. GERDBuddy is your all-in-one resource for managing GERD and acid reflux.",
  path: "/",
  content: `<h1>Your All-in-One GERD Resource</h1>
<p>Track triggers, explore expert articles, and connect with a community that gets it.</p>

<section>
  <h2>Blog &amp; Articles</h2>
  <p>Expert-written articles on managing GERD, trigger foods, and lifestyle tips.</p>
  <a href="/blog">Browse articles</a>

  <h2>Community Forum</h2>
  <p>Ask questions, share what works, and connect with others who understand life with GERD.</p>
  <a href="/forum">Visit the forum</a>

  <h2>GERDBuddy App</h2>
  <p>Track your triggers on the go. Log meals and symptoms, then let AI surface your personal patterns.</p>
  <a href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910">Get it on the App Store</a>
</section>

<section>
  <h2>Recent Blog Posts</h2>
  ${recentBlogHtml}
  <a href="/blog">View all articles</a>
</section>

<section>
  <h2>Frequently Asked Questions</h2>
  <p>Everything you need to know about GERD, triggers, and GERDBuddy.</p>
  ${faqHtml}
</section>

<section>
  <h2>Why GERDBuddy?</h2>
  <p>I built GERDBuddy because I know how frustrating it is to manage GERD without clear answers. This started as a simple tracking app and has grown into a community resource for everyone dealing with acid reflux. Whether you're newly diagnosed or have been managing symptoms for years, you deserve better tools and a supportive community to help you figure out what works for your body.</p>
</section>`,
  jsonLd: [
    faqSchema,
    { "@context": "https://schema.org", "@type": "WebSite", name: "GERDBuddy", url: SITE_URL, description: "Track meals and symptoms to discover your personal GERD triggers with AI-powered insights." },
    { "@context": "https://schema.org", "@type": "Organization", name: "GERDBuddy", url: SITE_URL, logo: `${SITE_URL}/turtle.png`, contactPoint: { "@type": "ContactPoint", email: "gerdbuddy2@gmail.com", contactType: "customer support" } },
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "GERDBuddy - GERD Food Scanner", operatingSystem: "iOS", applicationCategory: "HealthApplication", url: "https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
  ],
}));
console.log("  ✓ /");

// Blog index
const blogListHtml = posts
  .map((p) => `<article><h2><a href="/blog/${p.slug}">${esc(p.title)}</a></h2><p>${esc(p.description)}</p><time datetime="${p.date}">${p.date}</time></article>`)
  .join("\n");

writePage("/blog", buildPage({
  title: "Blog",
  description: "Articles about managing GERD, identifying trigger foods, and living well with acid reflux. Tips, guides, and insights from GERDBuddy.",
  path: "/blog",
  content: `<h1>GERDBuddy Blog</h1><p>Guides and tips for managing GERD, understanding your triggers, and feeling your best.</p>${blogListHtml}`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "GERDBuddy Blog",
    url: `${SITE_URL}/blog`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/blog/${p.slug}`, name: p.title })),
    },
  },
}));
console.log("  ✓ /blog");

// Individual blog posts
for (const post of posts) {
  const articleHtml = marked.parse(post.content);
  const wordCount = post.content.trim().split(/\s+/).length;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    wordCount,
    articleSection: post.category,
    keywords: post.tags.join(", "),
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "GERDBuddy", logo: { "@type": "ImageObject", url: `${SITE_URL}/turtle.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    image: `${SITE_URL}/turtle.png`,
  };

  const medicalSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    about: { "@type": "MedicalCondition", name: "Gastroesophageal Reflux Disease (GERD)", alternateName: "GERD" },
    medicalAudience: { "@type": "MedicalAudience", audienceType: "Patient" },
    lastReviewed: post.dateModified || post.date,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  const articleMeta = post.tags.map((t) => `<meta property="article:tag" content="${esc(t)}" />`).join("\n  ");

  writePage(`/blog/${post.slug}`, buildPage({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    content: `<nav><a href="/">Home</a> &gt; <a href="/blog">Blog</a> &gt; ${esc(post.title)}</nav>
<article>
  <h1>${esc(post.title)}</h1>
  <time datetime="${post.date}">${post.date}</time>
  <span>${post.author}</span>
  <div class="prose">${articleHtml}</div>
</article>`,
    jsonLd: [articleSchema, medicalSchema, breadcrumbSchema],
    extra: `<meta property="article:published_time" content="${post.date}" />
  <meta property="article:modified_time" content="${post.dateModified || post.date}" />
  <meta property="article:section" content="${esc(post.category)}" />
  ${articleMeta}`,
  }));
  console.log(`  ✓ /blog/${post.slug}`);
}

// Static pages (privacy, terms) — just inject meta into the shell
for (const page of ["privacy", "terms"]) {
  const title = page === "privacy" ? "Privacy Policy" : "Terms of Service";
  writePage(`/${page}`, buildPage({
    title,
    description: `${title} for GERDBuddy.`,
    path: `/${page}`,
    content: `<h1>${title}</h1>`,
    jsonLd: null,
  }));
  console.log(`  ✓ /${page}`);
}

// Forum index
const forumCategories = [
  { slug: "food-and-triggers", name: "Food & Triggers", description: "What to eat, what to avoid, recipes" },
  { slug: "medication-and-treatment", name: "Medication & Treatment", description: "PPIs, H2 blockers, natural remedies" },
  { slug: "lifestyle-and-tips", name: "Lifestyle & Tips", description: "Sleep positions, stress management, exercise" },
  { slug: "new-to-gerd", name: "New to GERD", description: "Introductions, newly diagnosed, basic questions" },
  { slug: "general-discussion", name: "General Discussion", description: "Anything GERD-related that doesn't fit above" },
];

const forumCategoriesHtml = forumCategories
  .map((c) => `<article><h2><a href="/forum/${c.slug}">${esc(c.name)}</a></h2><p>${esc(c.description)}</p></article>`)
  .join("\n");

writePage("/forum", buildPage({
  title: "Community Forum",
  description: "Join the GERDBuddy community forum to discuss GERD triggers, treatments, lifestyle tips, and connect with others managing acid reflux.",
  path: "/forum",
  content: `<nav><a href="/">Home</a> &gt; Forum</nav>
<h1>Community Forum</h1>
<p>Connect with others, share experiences, and find support for managing GERD.</p>
${forumCategoriesHtml}`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Forum", item: `${SITE_URL}/forum` },
    ],
  },
}));
console.log("  ✓ /forum");

// Forum category pages
for (const cat of forumCategories) {
  writePage(`/forum/${cat.slug}`, buildPage({
    title: `${cat.name} — GERD Forum`,
    description: `Discuss ${cat.description.toLowerCase()} with others managing GERD. Join the GERDBuddy community forum.`,
    path: `/forum/${cat.slug}`,
    content: `<nav><a href="/">Home</a> &gt; <a href="/forum">Forum</a> &gt; ${esc(cat.name)}</nav>
<h1>${esc(cat.name)}</h1>
<p>${esc(cat.description)}</p>
<p><a href="/forum/${cat.slug}/new">Start a new thread</a></p>`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Forum", item: `${SITE_URL}/forum` },
        { "@type": "ListItem", position: 3, name: cat.name, item: `${SITE_URL}/forum/${cat.slug}` },
      ],
    },
  }));
  console.log(`  ✓ /forum/${cat.slug}`);
}

console.log("Prerendering complete!");
