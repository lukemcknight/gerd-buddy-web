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

console.log(`Prerendering ${2 + 1 + posts.length} routes...`);

// Home page
writePage("/", buildPage({
  title: "Discover Your GERD Triggers",
  description: "Track meals and symptoms for 7 days to discover your personal GERD triggers. Identify what causes your acid reflux with AI-powered insights.",
  path: "/",
  content: `<h1>GERDBuddy — A simple companion app to help manage GERD symptoms and triggers.</h1>
<p>Track meals and symptoms for 7 days to discover your personal GERD triggers. Identify what causes your acid reflux with AI-powered insights.</p>
<p><a href="https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910">Download on the App Store</a></p>`,
  jsonLd: [
    { "@context": "https://schema.org", "@type": "WebSite", name: "GERDBuddy", url: SITE_URL, description: "Track meals and symptoms to discover your personal GERD triggers with AI-powered insights." },
    { "@context": "https://schema.org", "@type": "Organization", name: "GERDBuddy", url: SITE_URL, logo: `${SITE_URL}/turtle.png` },
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "GERDBuddy - GERD Food Scanner", operatingSystem: "iOS", applicationCategory: "HealthApplication", url: "https://apps.apple.com/us/app/gerdbuddy-gerd-food-scanner/id6756620910" },
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

console.log("Prerendering complete!");
