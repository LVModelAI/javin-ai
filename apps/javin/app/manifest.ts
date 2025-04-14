import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Javin.ai",
    short_name: "Javin.ai",
    description: "A focused, no-nonsense AI search engine for crypto.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/images/javin/javin-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/images/javin/javin_logo_192px.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/javin/javin_logo_512px.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/images/javin/screenshots/Screenshot_400x800.png",
        sizes: "400x800",
        type: "image/png",
      },
      {
        src: "/images/javin/screenshots/Screenshot_1280x960.png",
        sizes: "1280x960",
        type: "image/png",
      },
    ],
  };
}
