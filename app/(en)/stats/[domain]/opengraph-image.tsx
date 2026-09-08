import { ImageResponse } from "next/og";
import { Footer, Frame, genericImage, OG_SIZE } from "@/lib/og";
import { normalizeDomain } from "@/lib/tracking/classify";
import { interactions, loadDashboard } from "@/lib/tracking/dashboard";
import { getSite } from "@/lib/tracking/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "AI agent interactions in 30 days";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const host = normalizeDomain(decodeURIComponent(domain));
  const site = host ? getSite(host) : null;
  if (!site || !site.public_share) return genericImage("Agent Tracking", "What AI agents do on a site, measured.");
  const o = loadDashboard(site.domain, 30).overview;
  const n = interactions(o);
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24, letterSpacing: 4, color: "#8a8a94", fontWeight: 600 }}>AGENT TRACKING</span>
          <span style={{ fontSize: site.domain.length > 24 ? 48 : 64, fontWeight: 700, marginTop: 22, lineHeight: 1.05 }}>{site.domain}</span>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 26 }}>
            <span style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -6, color: "#3fd8ca" }}>{n.toLocaleString("en-GB")}</span>
          </div>
          <span style={{ fontSize: 34, color: "#c4c4c8", marginTop: 12 }}>AI agent interactions in 30 days</span>
          <span style={{ fontSize: 24, color: "#8a8a94", marginTop: 14 }}>
            {o.totals.referrals} referrals · {o.totals.fetches} fetches · {o.totals.calls} tool calls · {o.totals.conversions} conversions
          </span>
        </div>
        <Footer tagline="Cookieless, no personal data" />
      </Frame>
    ),
    OG_SIZE,
  );
}
