"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import { resolvePreviewActionLabelColor } from "../preview-ui";
import type { StationPreviewProps } from "../types";

// Mirrors apps/mobile/.../station-panels/true-false-station-panel.tsx. The
// verdict travels beside each statement inside one answer slot (see
// TRUE_FALSE_DELIMITER in station.utils.ts), so the statement is what gets shown
// and the flag stays hidden from the team.
export function TrueFalsePreview({ quiz }: StationPreviewProps) {
  const [selections, setSelections] = useState<Record<number, boolean>>({});
  const statements = (quiz?.answers ?? []).map((answer) => {
    const trimmed = (answer ?? "").trim();
    const markerIndex = trimmed.lastIndexOf("::");
    if (markerIndex < 0) {
      return trimmed;
    }
    const flag = trimmed.slice(markerIndex + 2).trim();
    return flag === "T" || flag === "F" ? trimmed.slice(0, markerIndex).trim() : trimmed;
  });
  const rows = statements.length > 0 ? statements : ["Zdanie 1", "Zdanie 2", "Zdanie 3", "Zdanie 4"];

  return (
    <div className="mt-1 flex flex-col gap-2">
      {rows.map((statement, index) => {
        const selection = selections[index];
        return (
          <div
            key={index}
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong }}
          >
            <p className="text-[12px]" style={{ color: MOBILE_THEME.textPrimary }}>
              {statement || `Zdanie ${index + 1}`}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setSelections((prev) => ({ ...prev, [index]: true }))}
                className="flex-1 rounded-lg border py-1.5 text-[11px] font-semibold"
                style={{
                  borderColor: selection === true ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
                  color: selection === true ? MOBILE_THEME.accentStrong : MOBILE_THEME.textMuted,
                }}
              >
                Prawda
              </button>
              <button
                type="button"
                onClick={() => setSelections((prev) => ({ ...prev, [index]: false }))}
                className="flex-1 rounded-lg border py-1.5 text-[11px] font-semibold"
                style={{
                  borderColor: selection === false ? MOBILE_THEME.danger : MOBILE_THEME.border,
                  color: selection === false ? MOBILE_THEME.danger : MOBILE_THEME.textMuted,
                }}
              >
                Fałsz
              </button>
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="rounded-xl px-5 py-2.5 text-[11px] font-semibold"
        style={{
          backgroundColor: MOBILE_THEME.panelStrong,
          color: resolvePreviewActionLabelColor(true),
        }}
      >
        Sprawdź
      </button>
    </div>
  );
}

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

// The card a team gets for a reviewed-answer station: a roomy text box and a
// send button, with no verdict of its own — the Game Master decides later from
// the review queue.
export function ReviewedAnswerPreview(props: StationPreviewProps) {
  void props;
  const [value, setValue] = useState("");

  return (
    <div className="mt-1 flex flex-col gap-2">
      <textarea
        rows={4}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Wpiszcie odpowiedź"
        className="w-full resize-none rounded-xl border px-4 py-2.5 text-[12px] outline-none"
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
        Wyślij odpowiedź
      </button>
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
