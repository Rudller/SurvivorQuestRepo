"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { buildMastermindFeedback, resolveMastermindConfig, resolveMastermindSecret } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/mastermind-station-panel.tsx
export function MastermindPreview(props: StationPreviewProps) {
  const config = resolveMastermindConfig(props.challengeDifficulty ?? "medium");
  const secret = resolveMastermindSecret(toPuzzleView(props), props.challengeDifficulty ?? "medium");
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState<{ guess: string; exact: number; misplaced: number }[]>([]);
  const attemptsLeft = config.maxAttempts - attempts.length;

  function addSymbol(symbol: string) {
    setGuess((current) => (current.length < config.codeLength ? `${current}${symbol}` : current));
  }

  function submit() {
    if (guess.length !== config.codeLength || attemptsLeft <= 0) {
      return;
    }
    setAttempts((prev) => [...prev, { guess, ...buildMastermindFeedback(guess, secret) }]);
    setGuess("");
  }

  return (
    <div className="mt-1">
      <p style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
        Odgadnij kod używając poniższych symboli. Próby: {attempts.length}/{config.maxAttempts}
      </p>
      <div className="mt-2 rounded-xl border px-3 py-2" style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}>
        <p style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>● = symbol na dobrym miejscu</p>
        <p style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>◐ = symbol jest w kodzie, ale w innym miejscu</p>
        <p style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
          {config.symbols.join("")} • {config.codeLength} symboli
        </p>
      </div>

      <div className="mt-2 flex justify-center gap-2">
        {Array.from({ length: config.codeLength }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-center rounded-xl border text-sm font-semibold"
            style={{
              width: 34,
              height: 34,
              borderColor: MOBILE_THEME.border,
              backgroundColor: MOBILE_THEME.panelStrong,
              color: guess[index] ? MOBILE_THEME.textPrimary : MOBILE_THEME.textSubtle,
            }}
          >
            {guess[index] ?? "•"}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {config.symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => addSymbol(symbol)}
            disabled={attemptsLeft <= 0}
            className="flex items-center justify-center rounded-lg border text-sm font-semibold"
            style={{ width: 36, height: 36, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGuess((current) => current.slice(0, -1))}
          disabled={!guess.length}
          className="flex items-center justify-center rounded-lg border text-sm font-semibold"
          style={{ width: 36, height: 36, borderColor: MOBILE_THEME.accent, backgroundColor: MOBILE_THEME.accent, color: MOBILE_THEME.background, opacity: guess.length ? 1 : 0.45 }}
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={guess.length !== config.codeLength || attemptsLeft <= 0}
        className="mt-3 w-full rounded-xl py-2.5 text-[11px] font-semibold"
        style={{
          backgroundColor: guess.length === config.codeLength ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong,
          color: guess.length === config.codeLength ? MOBILE_THEME.background : MOBILE_THEME.textMuted,
        }}
      >
        Sprawdź
      </button>

      {attempts.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {[...attempts].reverse().map((attempt, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border px-3 py-2"
              style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong }}
            >
              <div className="flex gap-1">
                {Array.from(attempt.guess).map((symbol, symbolIndex) => (
                  <div
                    key={symbolIndex}
                    className="flex items-center justify-center rounded-lg border text-xs font-semibold"
                    style={{ width: 24, height: 24, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted, color: MOBILE_THEME.textPrimary }}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full border px-2 py-1" style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted, color: MOBILE_THEME.textMuted, fontSize: 10 }}>
                  ● {attempt.exact}
                </span>
                <span className="rounded-full border px-2 py-1" style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted, color: MOBILE_THEME.textMuted, fontSize: 10 }}>
                  ◐ {attempt.misplaced}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
