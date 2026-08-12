/**
 * Submit the live sitemap's URLs to IndexNow (Bing, Seznam, Naver, Yandex).
 * Bing's index feeds Microsoft Copilot and ChatGPT browsing, so fast indexing
 * there is an AEO lever, not just classic SEO.
 *
 * Run MANUALLY after a production deploy is verified live:
 *   npm run submit:indexnow
 *
 * Deliberately not part of `npm run build`: Vercel runs the build for preview
 * deployments too, and pinging IndexNow with URLs that haven't shipped yet
 * (or from a build that never gets promoted) would submit stale content.
 * See ops/marketing/runbooks/aeo.md for the deploy-verification markers.
 */

const HOST = "www.gerdbuddy.app";
const KEY = "5236aed10498e041982d03b086710b6f";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function main() {
  // Pull URLs from the LIVE sitemap, not the local build, so we only ever
  // submit pages that are actually being served.
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error("no <loc> entries found in live sitemap");

  // Sanity: the key file must be live before engines will accept the submission.
  const keyRes = await fetch(KEY_LOCATION);
  if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
    throw new Error(
      `key file not live at ${KEY_LOCATION} (status ${keyRes.status}). Deploy first, then submit.`
    );
  }

  const submit = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });

  // IndexNow returns 200 or 202 on acceptance.
  console.log(`Submitted ${urls.length} URLs from ${SITEMAP}: HTTP ${submit.status}`);
  if (submit.status !== 200 && submit.status !== 202) {
    console.error(await submit.text());
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
