import { INDEXNOW_KEY } from "@/lib/site";

export const revalidate = 3600;

/** The IndexNow key file, so Bing, Yandex and Naver accept URL submissions for this host. 404 when no key is configured. */
export function GET() {
  if (!INDEXNOW_KEY) return new Response("Not configured", { status: 404 });
  return new Response(INDEXNOW_KEY, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
