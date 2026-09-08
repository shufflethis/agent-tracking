import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "See what AI agents do on your website.",
    start_url: "/",
    display: "browser",
    background_color: "#060606",
    theme_color: "#0b0b10",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
