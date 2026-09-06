import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Samjho | AI that teaches, not just answers",
    short_name: "Samjho",
    description: "An adaptive AI tutor that helps concepts click.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbf8",
    theme_color: "#1f6960",
    lang: "en-IN",
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}