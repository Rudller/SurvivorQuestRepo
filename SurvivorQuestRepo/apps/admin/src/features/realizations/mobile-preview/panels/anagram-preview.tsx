"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { resolveCorrectAnswerText, scrambleWord } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/anagram-station-panel.tsx
export function AnagramPreview(props: StationPreviewProps) {
  const view = toPuzzleView(props);
  const source = resolveCorrectAnswerText(view) || props.name || "PRZYGODA";
  const words = source.split(" ").filter(Boolean);
  const scrambledWords = words.map((word) => scrambleWord(word, `${props.stationKey}-${word}`));
  const [answer, setAnswer] = useState("");

  const pool: Record<string, number> = {};
  scrambledWords.forEach((word) => {
    Array.from(word).forEach((char) => {
      pool[char] = (pool[char] ?? 0) + 1;
    });
  });
  const used: Record<string, number> = {};
  Array.from(answer.toUpperCase()).forEach((char) => {
    used[char] = (used[char] ?? 0) + 1;
  });

  return (
    <div className="mt-1">
      <div className="flex flex-wrap justify-center gap-3">
        {scrambledWords.map((word, wordIndex) => (
          <div key={wordIndex} className="flex flex-wrap justify-center gap-1">
            {Array.from(word).map((letter, letterIndex) => {
              const isAvailable = (pool[letter] ?? 0) - (used[letter] ?? 0) > 0;
              return (
                <button
                  key={letterIndex}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => setAnswer((current) => `${current}${letter}`)}
                  className="flex items-center justify-center rounded-lg border text-sm font-bold transition active:opacity-70"
                  style={{
                    width: 32,
                    height: 32,
                    borderColor: MOBILE_THEME.border,
                    backgroundColor: MOBILE_THEME.panelStrong,
                    color: MOBILE_THEME.textPrimary,
                    opacity: isAvailable ? 1 : 0.3,
                  }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center" style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
        Wyrazy: {words.length} • Litery: {scrambledWords.map((w) => w.length).join("-")}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div
          className="flex min-h-[50px] flex-1 flex-wrap gap-1 rounded-xl border p-2"
          style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong }}
        >
          {answer.length === 0 ? (
            <span style={{ color: MOBILE_THEME.textSubtle, fontSize: 13 }}>_</span>
          ) : (
            Array.from(answer).map((char, index) => (
              <div
                key={index}
                className="flex items-center justify-center rounded-lg border text-sm font-bold"
                style={{ width: 32, height: 32, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panel, color: MOBILE_THEME.textPrimary }}
              >
                {char}
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          disabled={!answer.length}
          onClick={() => setAnswer((current) => current.slice(0, -1))}
          className="flex items-center justify-center rounded-xl border text-sm font-semibold"
          style={{ width: 44, height: 44, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary, opacity: answer.length ? 1 : 0.35 }}
        >
          ⌫
        </button>
      </div>
      <button
        type="button"
        className="mt-2 w-full rounded-xl py-2.5 text-[11px] font-semibold"
        style={{ backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background }}
      >
        Sprawdź
      </button>
    </div>
  );
}
