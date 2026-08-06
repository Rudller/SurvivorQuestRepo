"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { SIMON_BUTTONS } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/simon-station-panel.tsx
// Audio/sequence playback is intentionally not simulated (no audio in the preview).
export function SimonPreview(props: StationPreviewProps) {
  void props;
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <p className="text-center" style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
        Sekwencja dźwiękowa zostanie odtworzona na urządzeniu gracza.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SIMON_BUTTONS.map((button) => (
          <button
            key={button.id}
            type="button"
            onMouseDown={() => setPressed(button.id)}
            onMouseUp={() => setPressed(null)}
            onMouseLeave={() => setPressed(null)}
            className="aspect-square rounded-full border transition"
            style={{
              backgroundColor: button.color,
              borderColor: pressed === button.id ? "rgba(255,255,255,0.95)" : MOBILE_THEME.border,
              borderWidth: pressed === button.id ? 3 : 1,
              opacity: pressed === button.id ? 0.92 : 0.72,
              transform: pressed === button.id ? "scale(1.06)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
