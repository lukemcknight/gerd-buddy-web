/**
 * Template-based prerendering script.
 * Reads blog post source files and generates static HTML with full content,
 * meta tags, and JSON-LD for each route — no browser required.
 *
 * Run as part of the build: `node --import tsx scripts/prerender.js`
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { posts } from "../src/content/blog/index.ts";
import { HOME, bigFeatures, moreFeatures, faqItems, homepageSchema } from "../src/content/homepage.ts";
import { marked } from "marked";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");
const SITE_URL = "https://www.gerdbuddy.app";

// Shared, verified data. These same files feed the React app (src/pages/*.tsx) and
// generate-llms.js, so the prerendered HTML, the client-rendered page, and llms.txt
// cannot drift apart. See src/config/app-facts.json for how each value was verified.
const readJson = (path) => JSON.parse(readFileSync(resolve(__dirname, path), "utf-8"));
const APP = readJson("../src/config/app-facts.json");
const BLOG_FAQS = readJson("../src/content/blog/faqs.json");

// Byline. Mirrors AUTHOR in src/config/site.ts.
const AUTHOR = { name: "Luke McKnight", jobTitle: "Founder, GERDBuddy" };

if (faqItems.some((faq) => /\{\{.*?\}\}/.test(faq.a))) {
  throw new Error("Unresolved product fact in homepage FAQ");
}

// Read the built index.html as our shell
const shell = readFileSync(resolve(DIST, "index.html"), "utf-8");

// Extract CSS link from the shell so prerendered pages load styles
const cssLink = shell.match(/<link[^>]+\.css[^>]*>/)?.[0] || "";
const jsScripts = [...shell.matchAll(/<script[^>]*src="[^"]*"[^>]*><\/script>/g)].map((m) => m[0]).join("\n");

// Lift inline <script> blocks (the analytics snippet) out of the shell so prerendered
// pages are measured too. Without this, every blog post and forum page would be a
// blind spot, which is exactly where AI referrals land. Single source stays index.html.
const inlineScripts = [...shell.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .filter((m) => !/application\/ld\+json/.test(m[0]))
  .map((m) => m[0])
  .join("\n");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildPage({ title, description, path, content, jsonLd, type = "website", extra = "" }) {
  const fullTitle = `${title} | GERDBuddy`;
  const url = `${SITE_URL}${path}`;
  const jsonLdTags = (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    .filter(Boolean)
    .map((j) => `<script type="application/ld+json" data-rh="true">${JSON.stringify(j)}</script>`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}" data-rh="true" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" data-rh="true" />
  <link rel="canonical" href="${url}" data-rh="true" />
  <meta property="og:title" content="${esc(title)}" data-rh="true" />
  <meta property="og:description" content="${esc(description)}" data-rh="true" />
  <meta property="og:url" content="${url}" data-rh="true" />
  <meta property="og:type" content="${type}" data-rh="true" />
  <meta property="og:image" content="${SITE_URL}/gerdbuddy-mark.png" data-rh="true" />
  <meta property="og:site_name" content="GERDBuddy" data-rh="true" />
  <meta property="og:locale" content="en_US" data-rh="true" />
  <meta name="twitter:card" content="summary_large_image" data-rh="true" />
  <meta name="twitter:title" content="${esc(title)}" data-rh="true" />
  <meta name="twitter:description" content="${esc(description)}" data-rh="true" />
  <meta name="twitter:image" content="${SITE_URL}/gerdbuddy-mark.png" data-rh="true" />
  <meta name="theme-color" content="#154212" />
  <meta name="apple-itunes-app" content="app-id=6756620910" />
  <link rel="alternate" type="application/rss+xml" title="GERDBuddy Blog" href="${SITE_URL}/feed.xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  ${cssLink}
  ${inlineScripts}
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

const faqHtml = faqItems
  .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
  .join("\n");

const recentBlogHtml = posts.slice(0, 3)
  .map((p) => `<article><h3><a href="/blog/${p.slug}">${esc(p.title)}</a></h3><p>${esc(p.description)}</p><time datetime="${p.date}">${p.date}</time></article>`)
  .join("\n");

// The crawler-visible homepage uses the same copy and schema as React.
writePage("/", buildPage({
  title: HOME.title,
  description: HOME.description,
  path: "/",
  content: `<h1>${esc(HOME.heroLines.join(" "))}</h1>
<p>${esc(HOME.intro)}</p>
<p>${esc(APP.pricing.summary)}</p>
<a href="${APP.url}">Download on iOS</a>
<section id="features"><h2>${esc(HOME.featuresHeading)}</h2>
${bigFeatures.map((f) => `<article><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p><ul>${f.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></article>`).join("\n")}
${moreFeatures.map((f) => `<article><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></article>`).join("\n")}
</section>
<section><h2>GERD articles</h2>${recentBlogHtml}<a href="/blog">View all articles</a></section>
<section><h2>Community forum</h2><p>Ask questions, share what works, and connect with people who actually understand life with reflux.</p><a href="/forum">Join the conversation</a></section>
<section><h2>Frequently asked questions</h2>${faqHtml}</section>
<section><h2>Why GERDBuddy?</h2><p>${esc(HOME.founder)}</p></section>
<section><h2>${esc(HOME.ctaHeading)}</h2><p>${esc(APP.pricing.summary)}</p><a href="${APP.url}">Download on the App Store</a></section>`,
  jsonLd: homepageSchema,
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
    author: { "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.jobTitle },
    publisher: { "@type": "Organization", name: "GERDBuddy", logo: { "@type": "ImageObject", url: `${SITE_URL}/gerdbuddy-mark.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    image: `${SITE_URL}/gerdbuddy-mark.png`,
  };

  // AEO block for this post: extractable Q&As plus the verified primary sources.
  const postFaq = BLOG_FAQS.posts[post.slug];
  const faqs = postFaq?.faq || [];
  const sources = (postFaq?.sources || []).map((k) => BLOG_FAQS.sources[k]).filter(Boolean);

  const medicalSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    about: { "@type": "MedicalCondition", name: "Gastroesophageal Reflux Disease (GERD)", alternateName: "GERD" },
    medicalAudience: { "@type": "MedicalAudience", audienceType: "Patient" },
    lastReviewed: post.dateModified || post.date,
    ...(sources.length && {
      citation: sources.map((src) => ({
        "@type": "CreativeWork",
        name: src.title,
        publisher: { "@type": "Organization", name: src.publisher },
        url: src.url,
      })),
    }),
  };

  const faqSchema = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const postFaqHtml = faqs.length
    ? `<section>
  <h2>Common Questions</h2>
  ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n  ")}
</section>`
    : "";

  const sourcesHtml = sources.length
    ? `<section>
  <h2>Sources and further reading</h2>
  <ul>${sources.map((src) => `<li><a href="${src.url}" rel="nofollow">${esc(src.title)}</a>, ${esc(src.publisher)}</li>`).join("")}</ul>
  <p>This article is general information, not medical advice. Talk to your doctor about your own symptoms and treatment.</p>
</section>`
    : "";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  const articleMeta = post.tags.map((t) => `<meta property="article:tag" content="${esc(t)}" data-rh="true" />`).join("\n  ");

  writePage(`/blog/${post.slug}`, buildPage({
    title: post.title,
    type: "article",
    description: post.description,
    path: `/blog/${post.slug}`,
    content: `<nav><a href="/">Home</a> &gt; <a href="/blog">Blog</a> &gt; ${esc(post.title)}</nav>
<article>
  <h1>${esc(post.title)}</h1>
  <time datetime="${post.date}">${post.date}</time>
  <span>${esc(AUTHOR.name)}, ${esc(AUTHOR.jobTitle)}</span>
  <div class="prose">${articleHtml}</div>
</article>
${postFaqHtml}
${sourcesHtml}`,
    jsonLd: [articleSchema, medicalSchema, breadcrumbSchema, faqSchema].filter(Boolean),
    extra: `<meta property="article:published_time" content="${post.date}" data-rh="true" />
  <meta property="article:modified_time" content="${post.dateModified || post.date}" data-rh="true" />
  <meta property="article:section" content="${esc(post.category)}" data-rh="true" />
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
