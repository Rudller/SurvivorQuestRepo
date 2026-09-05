import type { MetadataRoute } from "next";

/**
 * Web app manifest, served by Next at /manifest.webmanifest.
 *
 * Colours match the page background so that a window opened from a home-screen
 * shortcut does not flash white before the app paints.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SurvivorQuest — platforma eventowa",
    short_name: "SurvivorQuest",
    description:
      "Platforma do prowadzenia gier terenowych, zarządzania zespołami i monitorowania realizacji na żywo.",
    start_url: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#0f1914",
    theme_color: "#0f1914",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
