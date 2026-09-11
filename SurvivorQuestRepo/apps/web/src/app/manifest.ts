import type { MetadataRoute } from "next";

/**
 * Web app manifest, served by Next at /manifest.webmanifest.
 *
 * Colours match the page background so that a window opened from a home-screen
 * shortcut does not flash white before the app paints.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SurvivorQuest — eventy integracyjne dla firm",
    short_name: "SurvivorQuest",
    description:
      "Gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm — integracje prowadzone na tabletach z rankingiem na żywo.",
    start_url: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#111419",
    theme_color: "#111419",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
