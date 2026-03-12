/**
 * Generates RSS feed (feed.xml) from blog post data.
 * Run as part of the build: `node scripts/generate-feed.js`
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://gerdbuddy.app";

const blogDir = resolve(__dirname, "../src/content/blog");
const blogFiles = readdirSync(blogDir).filter(
  (f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts"
);

const posts = [];
for (const file of blogFiles) {
  const content = readFileSync(resolve(blogDir, file), "utf-8");
  const slug = content.match(/slug:\s*["']([^"']+)["']/)?.[1];
  const title = content.match(/title:\s*["']([^"']+)["']/)?.[1];
  const description = content.match(/description:\s*\n?\s*["']([^"']+)["']/)?.[1]
    || content.match(/description:\s*["']([^"']+)["']/)?.[1];
  const date = content.match(/date:\s*["']([^"']+)["']/)?.[1];
  const author = content.match(/author:\s*["']([^"']+)["']/)?.[1];
  if (slug && title && date) {
    posts.push({ slug, title, description: description || "", date, author: author || "GERDBuddy Team" });
  }
}

// Sort newest first
posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GERDBuddy Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Articles about managing GERD, identifying trigger foods, and living well with acid reflux.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/turtle.png</url>
      <title>GERDBuddy Blog</title>
      <link>${SITE_URL}/blog</link>
    </image>
${posts
  .map(
    (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <description>${escapeXml(p.description)}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <author>gerdbuddy2@gmail.com (${escapeXml(p.author)})</author>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

const outPath = resolve(__dirname, "../dist/feed.xml");
writeFileSync(outPath, feed, "utf-8");
console.log(`RSS feed generated at ${outPath} with ${posts.length} items`);
