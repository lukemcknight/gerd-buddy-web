/**
 * Generates sitemap.xml from blog post data.
 * Run as part of the build: `node --import tsx scripts/generate-sitemap.js`
 *
 * This script reads the blog post files to extract slugs and dates,
 * then writes a sitemap.xml to the dist/ directory.
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { posts } from "../src/content/blog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://www.gerdbuddy.app";

// Static pages with their priorities
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/forum", priority: "0.8", changefreq: "daily" },
  { path: "/forum/food-and-triggers", priority: "0.7", changefreq: "daily" },
  { path: "/forum/medication-and-treatment", priority: "0.7", changefreq: "daily" },
  { path: "/forum/lifestyle-and-tips", priority: "0.7", changefreq: "daily" },
  { path: "/forum/new-to-gerd", priority: "0.7", changefreq: "daily" },
  { path: "/forum/general-discussion", priority: "0.7", changefreq: "daily" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

// Use the same article records as the browser and every other publishing output.
const blogEntries = posts.map((post) => ({
  path: `/blog/${post.slug}`,
  lastmod: post.dateModified || post.date,
  priority: "0.7",
  changefreq: "monthly",
}));

const today = new Date().toISOString().split("T")[0];

const urls = [
  ...staticPages.map((p) => ({
    ...p,
    lastmod: today,
  })),
  ...blogEntries,
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

const outPath = resolve(__dirname, "../dist/sitemap.xml");
writeFileSync(outPath, sitemap, "utf-8");
console.log(`Sitemap generated at ${outPath} with ${urls.length} URLs`);
