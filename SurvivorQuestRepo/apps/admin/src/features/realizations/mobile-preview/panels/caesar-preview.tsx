"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { caesarShift, resolveCaesarSecret, resolveCaesarShift } from "../puzzle-helpers";

const CAESAR_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

// Mirrors apps/mobile/.../station-panels/caesar-station-panel.tsx
export function CaesarPreview(props: StationPreviewProps) {
  const view = toPuzzleView(props);
  const secret = resolveCaesarSecret(view);
  const shift = resolveCaesarShift(view);
  const ciphertext = caesarShift(secret, shift);
  const [answer, setAnswer] = useState("");

  return (
    <div className="mt-1">
      <div
        className="mb-3 rounded-xl border px-3 py-3 text-center font-semibold"
        style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted, color: MOBILE_THEME.accent, letterSpacing: "0.12em", fontSize: 16 }}
      >
        {ciphertext}
      </div>
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value.toUpperCase())}
          placeholder="Wpisz odszyfrowaną frazę"
          maxLength={secret.length}
          className="flex-1 rounded-xl border px-4 py-2.5 text-[12px] outline-none"
          style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
        />
        <button
          type="button"
          className="rounded-xl px-5 text-[11px] font-semibold"
          style={{ backgroundColor: answer ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong, color: answer ? MOBILE_THEME.background : MOBILE_THEME.textMuted }}
        >
          Sprawdź
        </button>
      </div>
      <div className="mt-3 space-y-1.5">
        {CAESAR_KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setAnswer((current) => (current.length < secret.length ? `${current}${key}` : current))}
                className="flex items-center justify-center rounded-xl border text-sm font-semibold"
                style={{ width: 30, height: 34, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1">
          <button
            type="button"
            onClick={() => setAnswer((current) => `${current} `)}
            className="rounded-xl border px-6 text-sm font-semibold"
            style={{ height: 34, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
          >
            Spacja
          </button>
          <button
            type="button"
            onClick={() => setAnswer((current) => current.slice(0, -1))}
            className="flex items-center justify-center rounded-xl border px-4 text-sm font-semibold"
            style={{ height: 34, borderColor: MOBILE_THEME.accent, backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background }}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
