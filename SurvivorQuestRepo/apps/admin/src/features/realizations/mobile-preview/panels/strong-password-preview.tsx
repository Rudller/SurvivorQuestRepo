"use client";

import { useMemo, useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { buildStrongPasswordRules, getDifficultyPointsMultiplier } from "../strong-password-rules";

// Mirrors apps/mobile/.../station-panels/strong-password-station-panel.tsx
export function StrongPasswordPreview({ stationKey, points, challengeDifficulty, challengeDifficultyMode }: StationPreviewProps) {
  const isAdminDifficulty = (challengeDifficultyMode ?? "admin") === "admin";
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "medium" | "hard" | null>(
    isAdminDifficulty ? (challengeDifficulty ?? "medium") : null,
  );
  const [password, setPassword] = useState("");
  const difficulty = selectedDifficulty ?? challengeDifficulty ?? "medium";
  const rules = useMemo(() => buildStrongPasswordRules(stationKey, difficulty), [stationKey, difficulty]);
  const firstFailingIndex = rules.findIndex((rule) => !rule.validate(password));
  const visibleCount = firstFailingIndex === -1 ? rules.length : firstFailingIndex + 1;
  const visibleRules = rules.slice(0, visibleCount);
  const awardedPoints = Math.round(points * getDifficultyPointsMultiplier(difficulty));

  if (!selectedDifficulty) {
    return (
      <div className="mt-1 space-y-2">
        {(["easy", "medium", "hard"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelectedDifficulty(option)}
            className="w-full rounded-2xl border px-4 py-3 text-left transition"
            style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong }}
          >
            <p className="font-bold" style={{ color: MOBILE_THEME.textPrimary, fontSize: 11 }}>
              {option === "easy" ? "Łatwy" : option === "hard" ? "Trudny" : "Średni"}
            </p>
            <p style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
              {Math.round(getDifficultyPointsMultiplier(option) * 100)}% punktów
            </p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1">
      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Wprowadź hasło"
        className="w-full rounded-2xl border px-4 py-3 text-[12px] outline-none"
        style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
      />
      <p className="mt-2" style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
        Poziom: {difficulty === "easy" ? "łatwy" : difficulty === "hard" ? "trudny" : "średni"} • Punkty: {awardedPoints}
      </p>
      <div className="mt-3 space-y-2">
        {[...visibleRules].reverse().map((rule) => {
          const passed = rule.validate(password);
          return (
            <div
              key={rule.id}
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: passed ? "#34d399" : MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}
            >
              <p style={{ color: passed ? "#86efac" : MOBILE_THEME.textPrimary, fontSize: 10 }}>
                {passed ? "✓" : "•"} {rule.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
