"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { resolveBoggleBoard, resolveBoggleTarget } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/boggle-station-panel.tsx
export function BogglePreview(props: StationPreviewProps) {
  const view = toPuzzleView(props);
  const target = resolveBoggleTarget(view);
  const board = resolveBoggleBoard(view, target);
  const [selected, setSelected] = useState<number[]>([]);
  const [word, setWord] = useState("");

  function pressCell(index: number) {
    setSelected((prev) => [...prev, index]);
    setWord((prev) => `${prev}${board[index]}`);
  }

  return (
    <div className="mt-1">
      <p className="text-center font-semibold" style={{ color: MOBILE_THEME.textPrimary, fontSize: 13 }}>
        Ułóż słowo dotykając litery na planszy
      </p>
      <p className="mt-2 text-center uppercase tracking-widest" style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
        Długość hasła
      </p>
      <div className="mt-1 flex justify-center gap-1.5">
        {Array.from({ length: target.length }).map((_, index) => (
          <span
            key={index}
            className="rounded-full"
            style={{ width: 10, height: 10, backgroundColor: index < word.length ? MOBILE_THEME.accentStrong : "rgba(148,163,184,0.3)" }}
          />
        ))}
      </div>
      <div className="mx-auto mt-3 grid w-[92%] grid-cols-3 gap-1.5">
        {board.map((letter, index) => {
          const isSelected = selected.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => pressCell(index)}
              className="flex aspect-square items-center justify-center rounded-xl border text-xl font-extrabold transition"
              style={{
                borderColor: isSelected ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
                backgroundColor: isSelected ? "rgba(240,201,119,0.22)" : MOBILE_THEME.panelStrong,
                color: MOBILE_THEME.textPrimary,
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-1.5">
        <input
          value={word}
          onChange={(event) => setWord(event.target.value.toUpperCase())}
          placeholder="Wpisz słowo"
          maxLength={target.length}
          className="flex-1 rounded-xl border px-3 py-2 text-[12px] outline-none"
          style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
        />
        <button
          type="button"
          onClick={() => {
            setWord((current) => current.slice(0, -1));
            setSelected((current) => current.slice(0, -1));
          }}
          className="rounded-xl border px-3 text-sm font-semibold"
          style={{ borderColor: MOBILE_THEME.accent, backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background }}
        >
          ⌫
        </button>
        <button
          type="button"
          className="rounded-xl px-4 text-[11px] font-semibold"
          style={{ backgroundColor: word ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong, color: word ? MOBILE_THEME.background : MOBILE_THEME.textMuted }}
        >
          Sprawdź
        </button>
      </div>
    </div>
  );
}
