"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { resolveMiniSudokuPuzzle } from "../puzzle-helpers";

const PINPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Mirrors apps/mobile/.../station-panels/mini-sudoku-station-panel.tsx
export function MiniSudokuPreview(props: StationPreviewProps) {
  const puzzle = resolveMiniSudokuPuzzle(toPuzzleView(props), props.challengeDifficulty ?? "medium");
  const [values, setValues] = useState<Record<number, string>>({});
  const editableIndexes = puzzle.given.map((value, index) => (value === null ? index : -1)).filter((index) => index >= 0);
  const [active, setActive] = useState<number | null>(editableIndexes[0] ?? null);

  return (
    <div className="mt-1">
      <div className="mx-auto grid w-full max-w-[260px] grid-cols-9 border" style={{ borderColor: "rgba(148,163,184,0.55)" }}>
        {puzzle.given.map((given, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const isBlockTop = row % 3 === 0;
          const isBlockLeft = col % 3 === 0;
          const value = given ?? values[index] ?? "";
          const isActive = active === index;
          return (
            <button
              key={index}
              type="button"
              disabled={Boolean(given)}
              onClick={() => setActive(index)}
              className="flex aspect-square items-center justify-center border text-[11px] font-black"
              style={{
                borderColor: "rgba(148,163,184,0.55)",
                borderTopWidth: isBlockTop ? 2 : 1,
                borderLeftWidth: isBlockLeft ? 2 : 1,
                backgroundColor: isActive && !given ? "rgba(96,165,250,0.16)" : "transparent",
                color: given ? MOBILE_THEME.textPrimary : value ? "#60a5fa" : MOBILE_THEME.textSubtle,
              }}
            >
              {value || "·"}
            </button>
          );
        })}
      </div>
      <div className="mx-auto mt-3 grid w-full max-w-[210px] grid-cols-3 gap-1.5">
        {PINPAD.map((key) => (
          <button
            key={key}
            type="button"
            disabled={active === null}
            onClick={() => {
              if (active === null) return;
              setValues((current) => ({ ...current, [active]: key }));
              const next = editableIndexes.find((index) => index > active) ?? editableIndexes[0] ?? active;
              setActive(next);
            }}
            className="flex aspect-square items-center justify-center rounded-full border text-base font-semibold"
            style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary, opacity: active === null ? 0.45 : 1 }}
          >
            {key}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-xl py-2.5 text-[11px] font-semibold"
        style={{ backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background }}
      >
        Sprawdź układ
      </button>
    </div>
  );
}
