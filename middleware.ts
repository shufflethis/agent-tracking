import { NextResponse, type NextRequest } from "next/server";

/**
 * Content negotiation: the same address returns Markdown when a client asks
 * for it. The path travels in the rewrite target rather than a query string,
 * which would not survive the rewrite.
 */
export function middleware(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/api/md" + (request.nextUrl.pathname === "/" ? "/home" : request.nextUrl.pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/", "/de", "/docs", "/de/docs", "/guides", "/de/guides", "/guides/:path*", "/de/guides/:path*"],
};
