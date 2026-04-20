import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Craving House",
    short_name: "Craving House",
    description: "Order ahead • Loyalty rewards",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0d12",
    theme_color: "#f2b705",
    categories: ["food", "shopping", "lifestyle"],
    shortcuts: [
      {
        name: "Browse menu",
        short_name: "Menu",
        url: "/menu"
      },
      {
        name: "My loyalty QR",
        short_name: "Loyalty",
        url: "/loyalty"
      },
      {
        name: "Track orders",
        short_name: "Orders",
        url: "/orders"
      }
    ],
    icons: [
      {
        src: "/ch-favicon.jpeg",
        sizes: "1766x1766",
        type: "image/jpeg",
        purpose: "any"
      }
    ]
  };
}
