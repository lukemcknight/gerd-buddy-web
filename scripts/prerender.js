/**
 * Post-build prerendering script.
 * Crawls the built SPA with Puppeteer and saves rendered HTML for each route,
 * giving search engines and AI crawlers full content without JS execution.
 *
 * Run as part of the build: `node scripts/prerender.js`
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");
const PORT = 4173;

// Discover blog slugs from source files
const blogDir = resolve(__dirname, "../src/content/blog");
const blogSlugs = readdirSync(blogDir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "types.ts")
  .map((f) => {
    const content = readFileSync(resolve(blogDir, f), "utf-8");
    const match = content.match(/slug:\s*["']([^"']+)["']/);
    return match ? match[1] : null;
  })
  .filter(Boolean);

const routes = [
  "/",
  "/blog",
  ...blogSlugs.map((s) => `/blog/${s}`),
  "/privacy",
  "/terms",
];

// Simple static file server for dist/
function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer((req, res) => {
      let filePath = resolve(DIST, req.url === "/" ? "index.html" : req.url.slice(1));

      // Try the exact file first, then fall back to index.html (SPA)
      let content;
      try {
        content = readFileSync(filePath);
      } catch {
        content = readFileSync(resolve(DIST, "index.html"));
        filePath = resolve(DIST, "index.html");
      }

      const ext = filePath.split(".").pop();
      const mimeTypes = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpeg",
        svg: "image/svg+xml",
        json: "application/json",
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
      };

      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      res.end(content);
    });

    server.listen(PORT, () => {
      console.log(`Static server running on http://localhost:${PORT}`);
      resolvePromise(server);
    });
  });
}

async function prerender() {
  const server = await startServer();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  console.log(`Prerendering ${routes.length} routes...`);

  for (const route of routes) {
    const page = await browser.newPage();
    const url = `http://localhost:${PORT}${route}`;

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

      // Wait a bit for react-helmet-async to inject meta tags
      await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

      const html = await page.content();

      // Determine output path
      const outDir = route === "/"
        ? DIST
        : resolve(DIST, route.slice(1));

      mkdirSync(outDir, { recursive: true });
      writeFileSync(resolve(outDir, "index.html"), html, "utf-8");
      console.log(`  ✓ ${route}`);
    } catch (err) {
      console.error(`  ✗ ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
  console.log("Prerendering complete!");
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
