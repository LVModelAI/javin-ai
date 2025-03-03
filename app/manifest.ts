import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Javin.ai",
    short_name: "Javin.ai",
    description:
      "A focused, no-nonsense AI search engine for crypto and blockchain.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/images/javin/javin_192px_text1.jpg",
        sizes: "192x192",
        type: "image/jpg",
        purpose: "maskable",
      },
      {
        src: "/images/javin/javin_512px_text1.jpg",
        sizes: "512x512",
        type: "image/jpg",
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
