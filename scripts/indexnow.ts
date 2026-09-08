import { INDEXNOW_KEY, SITE_HOST, SITE_ORIGIN } from "../lib/site";

/**
 * Tell IndexNow (Bing, Yandex, Naver, Seznam) which URLs changed. Reads the
 * sitemap and submits every URL in one request; run after a deploy that adds
 * or changes pages: npx tsx scripts/indexnow.ts
 */
async function main() {
  if (!INDEXNOW_KEY) throw new Error("INDEXNOW_KEY is not set");
  const xml = await (await fetch(`${SITE_ORIGIN}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: `${SITE_ORIGIN}/indexnow-key.txt`, urlList: urls }),
  });
  console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URL(s)`);
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
