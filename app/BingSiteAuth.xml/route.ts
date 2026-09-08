import { VERIFY } from "@/lib/site";

export const revalidate = 3600;

/** Bing Webmaster Tools ownership file. 404 until BING_SITE_VERIFICATION is set. */
export function GET() {
  if (!VERIFY.bing) return new Response("Not configured", { status: 404 });
  return new Response(`<?xml version="1.0"?>\n<users>\n  <user>${VERIFY.bing}</user>\n</users>\n`, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
