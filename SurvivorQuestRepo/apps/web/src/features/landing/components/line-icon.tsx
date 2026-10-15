import type { ReactNode } from "react";

export type LineIconName = "brief" | "scenario" | "event" | "finale" | "mobile" | "web" | "chip";

/** Line icons on a 24px grid, stroked in `currentColor` so the parent sets the colour. */
const PATHS: Record<LineIconName, ReactNode> = {
  // Two speech bubbles — the first conversation.
  brief: (
    <>
      <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3" />
      <path d="M6 9h7M6 12h4" />
    </>
  ),
  // Folded map with a dashed route and a pin.
  scenario: (
    <>
      <path d="M3 6.5 8.5 4l7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20Z" />
      <path d="M8.5 4v13.5M15.5 6.5V20" />
      <path d="M5.5 15c1.5-1 2-2.5 4-2.5s2.5 1.5 4 1.5" strokeDasharray="1.5 2" />
      <path d="M18.3 11.7c0 1.4-1.8 3.3-1.8 3.3s-1.8-1.9-1.8-3.3a1.8 1.8 0 0 1 3.6 0Z" />
    </>
  ),
  // Start flag — the game is on.
  event: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4L17 12H5" />
      <path d="M9 4v8M13 4v8" strokeOpacity="0.45" />
    </>
  ),
  // Trophy.
  finale: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M8.5 20h7M9.5 17h5v3h-5Z" />
    </>
  ),
  // Tablet with an app tile grid.
  mobile: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
      <path d="M8.5 6.5h3v3h-3ZM12.5 6.5h3v3h-3ZM8.5 10.5h3v3h-3Z" />
      <path d="M12.5 12h3" strokeOpacity="0.45" />
    </>
  ),
  // Browser window with a live ranking.
  web: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M2.5 8h19" />
      <path d="M5 6h.01M7 6h.01M9 6h.01" />
      <path d="M6 16.5v-3M10 16.5v-5M14 16.5v-2M18 16.5v-6" />
    </>
  ),
  // Microcontroller with pins — the ESP32 boards.
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <path d="M9.5 9.5h5v5h-5Z" />
      <path d="M9 2.5V6M12 2.5V6M15 2.5V6M9 18v3.5M12 18v3.5M15 18v3.5M2.5 9H6M2.5 12H6M2.5 15H6M18 9h3.5M18 12h3.5M18 15h3.5" />
    </>
  ),
};

export function LineIcon({ name, className }: { name: LineIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
