"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import { PreviewKey, resolvePreviewActionLabelColor } from "../preview-ui";
import type { StationPreviewProps } from "../types";
import { NUMERIC_PINPAD_LAYOUT, NUMERIC_PINPAD_SUBLABELS } from "../puzzle-helpers";

const ALPHANUMERIC_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "-"],
];

// Mirrors apps/mobile/.../station-panels/code-station-panel.tsx
export function CodePreview({ completionCode, type }: StationPreviewProps & { type: "time" | "points" }) {
  const [value, setValue] = useState("");
  const isNumeric = /^\d+$/.test((completionCode ?? "").trim());
  const isInlineNumericPad = isNumeric && type === "points";

  return (
    <div className="mt-1 rounded-2xl border px-3 py-3" style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}>
      {isNumeric ? (
        <div>
          <div
            className="mx-auto w-full max-w-[320px] rounded-2xl border py-3 text-center font-semibold"
            style={{
              borderColor: MOBILE_THEME.border,
              backgroundColor: MOBILE_THEME.panelStrong,
              color: MOBILE_THEME.textPrimary,
              fontSize: 24,
              letterSpacing: "0.3em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value || "• • • •"}
          </div>
          {isInlineNumericPad ? (
            <div className="mx-auto mt-2 grid w-full max-w-[320px] grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "backspace", "0", "submit"].map((key) => {
                const isBackspace = key === "backspace";
                const isSubmit = key === "submit";
                const label = isBackspace ? "⌫" : isSubmit ? "OK" : key;
                const sublabel = /^\d$/.test(label) ? NUMERIC_PINPAD_SUBLABELS[label] : undefined;
                return (
                  <PreviewKey
                    key={key}
                    label={label}
                    sublabel={sublabel}
                    rounded="rounded-full"
                    variant={isSubmit ? "accent" : "default"}
                    onClick={() => {
                      if (isBackspace) setValue((current) => current.slice(0, -1));
                      else if (!isSubmit) setValue((current) => `${current}${key}`);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mx-auto mt-2 grid w-full max-w-[320px] grid-cols-3 gap-2">
              {NUMERIC_PINPAD_LAYOUT.map((key) => {
                const isBackspace = key === "backspace";
                const isSubmit = key === "submit";
                const label = isBackspace ? "⌫" : isSubmit ? "OK" : key;
                const sublabel = /^\d$/.test(label) ? NUMERIC_PINPAD_SUBLABELS[label] : undefined;
                return (
                  <PreviewKey
                    key={key}
                    label={label}
                    sublabel={sublabel}
                    rounded="rounded-full"
                    variant={isSubmit ? "accent" : "default"}
                    onClick={() => {
                      if (isBackspace) setValue((current) => current.slice(0, -1));
                      else if (!isSubmit) setValue((current) => `${current}${key}`);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-stretch gap-2">
            <div
              className="flex flex-1 items-center justify-center rounded-2xl border px-4 py-3 text-center font-semibold"
              style={{
                borderColor: MOBILE_THEME.border,
                backgroundColor: MOBILE_THEME.panelStrong,
                color: value ? MOBILE_THEME.textPrimary : MOBILE_THEME.textSubtle,
                letterSpacing: "0.18em",
                fontSize: 20,
              }}
            >
              {value || (type === "time" ? "np. TIME-2048" : "np. POINTS-2048")}
            </div>
            <button
              type="button"
              className="rounded-2xl px-4 text-[11px] font-semibold"
              style={{ backgroundColor: MOBILE_THEME.accent, color: resolvePreviewActionLabelColor(false) }}
            >
              Zatwierdź kod
            </button>
          </div>
          <div className="mt-3 space-y-1.5">
            {ALPHANUMERIC_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1.5">
                {row.map((key) => (
                  <PreviewKey key={key} label={key} size={34} onClick={() => setValue((current) => `${current}${key}`)} />
                ))}
                {rowIndex === 0 ? (
                  <PreviewKey label="⌫" size={34} variant="accent" onClick={() => setValue((current) => current.slice(0, -1))} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
