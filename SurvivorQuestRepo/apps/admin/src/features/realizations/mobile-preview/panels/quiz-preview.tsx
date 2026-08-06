"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import { resolvePreviewActionLabelColor } from "../preview-ui";
import type { StationPreviewProps } from "../types";

// Mirrors apps/mobile/.../station-panels/quiz-audio-station-panel.tsx
export function QuizPreview({ quiz, isAudioQuiz }: StationPreviewProps & { isAudioQuiz: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answers = quiz?.answers?.length ? quiz.answers : ["Odpowiedź A", "Odpowiedź B", "Odpowiedź C", "Odpowiedź D"];

  return (
    <div className="mt-1">
      {isAudioQuiz ? (
        <button
          type="button"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[11px] font-semibold"
          style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
        >
          <span>▶️</span>
          <span>Odtwórz / powtórz audio</span>
        </button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {answers.map((answer, index) => {
          const isSelected = selected === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              className="rounded-2xl border px-3 py-3 text-center text-sm font-semibold shadow-sm transition"
              style={{
                width: "48%",
                minHeight: 72,
                borderColor: isSelected ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
                backgroundColor: isSelected ? "rgba(240, 201, 119, 0.18)" : MOBILE_THEME.panelStrong,
                color: MOBILE_THEME.textPrimary,
              }}
            >
              {answer || `Odpowiedź ${index + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OpenQuizPreview(props: StationPreviewProps) {
  void props;
  const [value, setValue] = useState("");

  return (
    <div className="mt-1 flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Wpisz odpowiedź"
        className="flex-1 rounded-xl border px-4 py-2.5 text-[12px] outline-none"
        style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong, color: MOBILE_THEME.textPrimary }}
      />
      <button
        type="button"
        className="rounded-xl px-5 py-2.5 text-[11px] font-semibold"
        style={{
          backgroundColor: value ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong,
          color: resolvePreviewActionLabelColor(!value),
        }}
      >
        Sprawdź
      </button>
    </div>
  );
}
