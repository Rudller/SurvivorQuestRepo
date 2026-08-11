"use client";

import { useMemo, useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import type { RealizationLanguage } from "../../types/realization";
import { buildStrongPasswordRules, getDifficultyPointsMultiplier, type StrongPasswordLanguage } from "../strong-password-rules";

type StrongPasswordDifficulty = "easy" | "medium" | "hard";

type StrongPasswordPreviewText = {
  difficultyLabel: Record<StrongPasswordDifficulty, string>;
  pointsPercent: string;
  passwordPlaceholder: string;
  level: string;
  points: string;
};

const STRONG_PASSWORD_PREVIEW_TEXT_ENGLISH: StrongPasswordPreviewText = {
  difficultyLabel: { easy: "Easy", medium: "Medium", hard: "Hard" },
  pointsPercent: "% points",
  passwordPlaceholder: "Enter password",
  level: "Level",
  points: "Points",
};

const STRONG_PASSWORD_PREVIEW_TEXT: Record<StrongPasswordLanguage, StrongPasswordPreviewText> = {
  polish: {
    difficultyLabel: { easy: "Łatwy", medium: "Średni", hard: "Trudny" },
    pointsPercent: "% punktów",
    passwordPlaceholder: "Wprowadź hasło",
    level: "Poziom",
    points: "Punkty",
  },
  english: STRONG_PASSWORD_PREVIEW_TEXT_ENGLISH,
  ukrainian: {
    difficultyLabel: { easy: "Легкий", medium: "Середній", hard: "Важкий" },
    pointsPercent: "% балів",
    passwordPlaceholder: "Введіть пароль",
    level: "Рівень",
    points: "Бали",
  },
  russian: {
    difficultyLabel: { easy: "Лёгкий", medium: "Средний", hard: "Сложный" },
    pointsPercent: "% очков",
    passwordPlaceholder: "Введите пароль",
    level: "Уровень",
    points: "Очки",
  },
};

function resolveStrongPasswordLanguage(language: RealizationLanguage): StrongPasswordLanguage {
  return language === "other" ? "english" : language;
}

// Mirrors apps/mobile/.../station-panels/strong-password-station-panel.tsx
export function StrongPasswordPreview({
  stationKey,
  points,
  challengeDifficulty,
  challengeDifficultyMode,
  language,
}: StationPreviewProps) {
  const strongPasswordLanguage = resolveStrongPasswordLanguage(language);
  const text = STRONG_PASSWORD_PREVIEW_TEXT[strongPasswordLanguage];
  const isAdminDifficulty = (challengeDifficultyMode ?? "admin") === "admin";
  const [selectedDifficulty, setSelectedDifficulty] = useState<StrongPasswordDifficulty | null>(
    isAdminDifficulty ? (challengeDifficulty ?? "medium") : null,
  );
  const [password, setPassword] = useState("");
  const difficulty = selectedDifficulty ?? challengeDifficulty ?? "medium";
  const rules = useMemo(
    () => buildStrongPasswordRules(stationKey, difficulty, strongPasswordLanguage),
    [stationKey, difficulty, strongPasswordLanguage],
  );
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
              {text.difficultyLabel[option]}
            </p>
            <p style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
              {Math.round(getDifficultyPointsMultiplier(option) * 100)}
              {text.pointsPercent}
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
        placeholder={text.passwordPlaceholder}
        className="w-full rounded-2xl border px-4 py-3 text-[12px] outline-none"
        style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
      />
      <p className="mt-2" style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
        {text.level}: {text.difficultyLabel[difficulty]} • {text.points}: {awardedPoints}
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
