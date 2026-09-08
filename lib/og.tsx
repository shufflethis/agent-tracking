import { ImageResponse } from "next/og";
import { SITE_HOST } from "./site";

/**
 * Share images. Satori renders a flexbox subset and nothing else, so every
 * box says display: flex, and there is no grid, no CSS variable and no web
 * font: the default face @vercel/og ships is what shows.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#f0f0f0";
const MUTED = "#8a8a94";

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #0b0b10 0%, #060606 55%, #120a1c 100%)",
        color: INK,
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export function Footer({ tagline }: { tagline: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: MUTED }}>
      <span>{tagline}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 18, height: 18, borderRadius: 9, background: "linear-gradient(135deg, #3fd8ca, #8b3fca)" }} />
        <span style={{ color: INK, fontWeight: 700 }}>{SITE_HOST}</span>
      </span>
    </div>
  );
}

export async function genericImage(title: string, subtitle: string, eyebrow = "AGENT TRACKING"): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <span style={{ fontSize: 24, letterSpacing: 4, color: MUTED, fontWeight: 600 }}>{eyebrow}</span>
          <span style={{ fontSize: 72, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>{title}</span>
          <span style={{ fontSize: 34, marginTop: 26, color: "#c4c4c8", lineHeight: 1.3 }}>{subtitle}</span>
        </div>
        <Footer tagline="Measure agents on your site" />
      </Frame>
    ),
    OG_SIZE,
  );
}
