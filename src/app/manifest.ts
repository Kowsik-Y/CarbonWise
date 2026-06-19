import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CarbonWise",
    short_name: "CarbonWise",
    description: "Track less. Reduce more. Your AI sustainability coach.",
    start_url: "/",
    display: "standalone",
    background_color: "#090d10",
    theme_color: "#10b981",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
