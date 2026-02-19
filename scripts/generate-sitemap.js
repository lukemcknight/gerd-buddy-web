/**
 * Generates sitemap.xml from blog post data.
 * Run as part of the build: `node scripts/generate-sitemap.js`
 *
 * This script reads the blog post files to extract slugs and dates,
 * then writes a sitemap.xml to the dist/ directory.
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://gerdbuddy.com";

// Static pages with their priorities
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

// Read blog post files to extract slugs and dates
const blogDir = resolve(__dirname, "../src/content/blog");
const blogFiles = readdirSync(blogDir).filter(
  (f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts"
);

const blogEntries = [];
for (const file of blogFiles) {
  const content = readFileSync(resolve(blogDir, file), "utf-8");
  const slugMatch = content.match(/slug:\s*["']([^"']+)["']/);
  const dateMatch = content.match(/date:\s*["']([^"']+)["']/);
  if (slugMatch) {
    blogEntries.push({
      path: `/blog/${slugMatch[1]}`,
      lastmod: dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0],
      priority: "0.7",
      changefreq: "monthly",
    });
  }
}

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
