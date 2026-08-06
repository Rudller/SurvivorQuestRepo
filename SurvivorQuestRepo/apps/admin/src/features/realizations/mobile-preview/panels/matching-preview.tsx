"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { resolveMatchingPairs } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/matching-station-panel.tsx.
// Simplified to click-to-connect instead of drag, since the preview only
// needs to look and feel like a match — not replicate the drag gesture.
export function MatchingPreview(props: StationPreviewProps) {
  const pairs = resolveMatchingPairs(toPuzzleView(props), props.language);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const connectedRights = new Set(Object.values(connections));

  return (
    <div className="mt-1">
      <p className="text-center font-semibold" style={{ color: MOBILE_THEME.textPrimary, fontSize: 13 }}>
        Przeciągnij linię od każdego wyrazu po lewej do pasującego wyrazu po prawej.
      </p>
      <p className="mt-1 text-center" style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
        Każdy wyraz można połączyć tylko raz.
      </p>
      <div className="mt-3 space-y-2">
        {pairs.map((pair) => {
          const isLeftConnected = Boolean(connections[pair.left]);
          const isRightConnected = connectedRights.has(pair.right);
          return (
            <div key={pair.left} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedLeft(pair.left)}
                className="flex-1 rounded-2xl border px-3 py-2.5 text-left text-[15px] font-semibold transition"
                style={{
                  borderColor: isLeftConnected ? "rgba(34,197,94,0.85)" : selectedLeft === pair.left ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
                  backgroundColor: isLeftConnected ? "rgba(20,83,45,0.4)" : MOBILE_THEME.panelMuted,
                  color: MOBILE_THEME.textPrimary,
                }}
              >
                {pair.left}
              </button>
              <span style={{ color: MOBILE_THEME.textSubtle }}>{isLeftConnected ? "—" : "···"}</span>
              <button
                type="button"
                onClick={() => {
                  if (!selectedLeft || isRightConnected) return;
                  setConnections((current) => ({ ...current, [selectedLeft]: pair.right }));
                  setSelectedLeft(null);
                }}
                className="flex-1 rounded-2xl border px-3 py-2.5 text-left text-[15px] font-semibold transition"
                style={{
                  borderColor: isRightConnected ? "rgba(34,197,94,0.85)" : MOBILE_THEME.border,
                  backgroundColor: isRightConnected ? "rgba(20,83,45,0.4)" : MOBILE_THEME.panelMuted,
                  color: MOBILE_THEME.textPrimary,
                }}
              >
                {pair.right}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-right" style={{ color: MOBILE_THEME.textPrimary, fontSize: 10 }}>
        Dopasowano: {Object.keys(connections).length}/{pairs.length}
      </p>
    </div>
  );
}
