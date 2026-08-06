"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { WORDLE_MAX_ATTEMPTS, buildWordleEvaluation, resolvePuzzleSecret, type WordleCellState } from "../puzzle-helpers";

const WORDLE_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const WORDLE_TILE_COLORS: Record<WordleCellState, string> = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
};

// Mirrors apps/mobile/.../station-panels/wordle-station-panel.tsx
export function WordlePreview(props: StationPreviewProps) {
  const secret = resolvePuzzleSecret(toPuzzleView(props), "wordle");
  const displayLength = secret.length;
  const [attempts, setAttempts] = useState<{ guess: string; evaluation: WordleCellState[] }[]>([]);
  const [current, setCurrent] = useState("");

  const stateRank: Record<WordleCellState, number> = { absent: 0, present: 1, correct: 2 };
  const keyState = new Map<string, WordleCellState>();
  attempts.forEach(({ guess, evaluation }) => {
    Array.from(guess).forEach((letter, index) => {
      const state = evaluation[index];
      const existing = keyState.get(letter);
      if (!existing || stateRank[state] > stateRank[existing]) {
        keyState.set(letter, state);
      }
    });
  });

  function submit() {
    if (current.length !== displayLength || attempts.length >= WORDLE_MAX_ATTEMPTS) {
      return;
    }
    setAttempts((prev) => [...prev, { guess: current, evaluation: buildWordleEvaluation(current, secret) }]);
    setCurrent("");
  }

  return (
    <div className="mt-1">
      <div className="flex flex-col items-center gap-1.5">
        {Array.from({ length: WORDLE_MAX_ATTEMPTS }).map((_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const rowLetters = attempt ? Array.from(attempt.guess) : rowIndex === attempts.length ? Array.from(current) : [];
          return (
            <div key={rowIndex} className="flex gap-1.5">
              {Array.from({ length: displayLength }).map((_, colIndex) => {
                const letter = rowLetters[colIndex] ?? "";
                const state = attempt?.evaluation[colIndex];
                return (
                  <div
                    key={colIndex}
                    className="flex items-center justify-center rounded-lg border font-bold"
                    style={{
                      width: 34,
                      height: 34,
                      fontSize: 19,
                      borderColor: state ? WORDLE_TILE_COLORS[state] : MOBILE_THEME.border,
                      backgroundColor: state ? WORDLE_TILE_COLORS[state] : MOBILE_THEME.panelStrong,
                      color: MOBILE_THEME.textPrimary,
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5">
        {WORDLE_KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => {
              const state = keyState.get(key);
              const isDisabled = attempts.length >= WORDLE_MAX_ATTEMPTS || current.length >= displayLength;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setCurrent((value) => `${value}${key}`.slice(0, displayLength))}
                  className="flex items-center justify-center rounded-xl border text-sm font-semibold transition active:opacity-85"
                  style={{
                    width: 28,
                    height: 35,
                    borderColor: state ? WORDLE_TILE_COLORS[state] : MOBILE_THEME.border,
                    backgroundColor: state ? WORDLE_TILE_COLORS[state] : MOBILE_THEME.panelStrong,
                    color: MOBILE_THEME.textPrimary,
                    opacity: isDisabled ? 0.45 : 1,
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setCurrent((value) => value.slice(0, -1))}
          className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
          style={{ borderColor: MOBILE_THEME.accent, backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background }}
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={current.length !== displayLength || attempts.length >= WORDLE_MAX_ATTEMPTS}
          className="rounded-xl px-5 py-2 text-[11px] font-semibold"
          style={{
            backgroundColor: current.length === displayLength ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong,
            color: current.length === displayLength ? MOBILE_THEME.background : MOBILE_THEME.textMuted,
          }}
        >
          Sprawdź słowo
        </button>
      </div>
    </div>
  );
}
