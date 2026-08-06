"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { HANGMAN_ALPHABET, HANGMAN_MAX_MISSES, resolvePuzzleSecret } from "../puzzle-helpers";

const HANGMAN_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
  ["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"],
];

// Mirrors apps/mobile/.../station-panels/hangman-station-panel.tsx
export function HangmanPreview(props: StationPreviewProps) {
  const secret = resolvePuzzleSecret(toPuzzleView(props), "hangman");
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const misses = Array.from(guessed).filter((letter) => !secret.includes(letter));
  const attemptsLeft = Math.max(0, HANGMAN_MAX_MISSES - misses.length);

  function guess(letter: string) {
    setGuessed((prev) => new Set(prev).add(letter));
  }

  return (
    <div className="mt-1">
      <div className="mb-2 flex flex-wrap justify-center gap-1.5">
        {Array.from(secret).map((letter, index) =>
          letter === " " ? (
            <span key={index} className="w-2" />
          ) : (
            <div
              key={index}
              className="flex items-center justify-center rounded border-b-2 text-sm font-bold"
              style={{ width: 20, height: 26, borderColor: MOBILE_THEME.textSubtle, color: MOBILE_THEME.textPrimary }}
            >
              {guessed.has(letter) ? letter : ""}
            </div>
          ),
        )}
      </div>
      <p className="text-center" style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
        Próby
      </p>
      <div className="mt-1 flex justify-center gap-2">
        {Array.from({ length: HANGMAN_MAX_MISSES }).map((_, index) => (
          <span
            key={index}
            className="rounded-full border"
            style={{
              width: 11,
              height: 11,
              borderColor: index < attemptsLeft ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
              backgroundColor: index < attemptsLeft ? MOBILE_THEME.accentStrong : "transparent",
            }}
          />
        ))}
      </div>
      {misses.length > 0 ? (
        <p className="mt-2 text-center" style={{ color: MOBILE_THEME.danger, fontSize: 10 }}>
          Błędne litery: {misses.join(", ")}
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        {HANGMAN_KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.map((letter) => {
              const used = guessed.has(letter);
              const isValid = HANGMAN_ALPHABET.includes(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={used || !isValid || attemptsLeft <= 0}
                  onClick={() => guess(letter)}
                  className="flex items-center justify-center rounded-2xl border text-sm font-semibold transition active:opacity-85"
                  style={{
                    width: 28,
                    height: 28,
                    borderColor: used ? "rgba(152,173,156,0.58)" : MOBILE_THEME.border,
                    backgroundColor: used ? "rgba(152,173,156,0.2)" : MOBILE_THEME.panelStrong,
                    color: MOBILE_THEME.textPrimary,
                    opacity: used || !isValid || attemptsLeft <= 0 ? 0.45 : 1,
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
