"use client";

import type { StationType } from "@/features/games/types/station";
import { stationTypeOptions } from "@/features/games/types/station";
import type { RealizationLanguage } from "../types/realization";
import type { StationPreviewProps } from "./types";
import { MOBILE_THEME } from "./mobile-preview-theme";
import { PreviewTaskWrapper } from "./preview-ui";
import { formatRemainingTimeLabel, resolvePuzzleSecret } from "./puzzle-helpers";
import { resolveStationPreviewPrompt } from "./prompt-text";
import { PREVIEW_LAYOUT } from "./layout-tokens";
import { toPuzzleView } from "./types";
import { OpenQuizPreview, QuizPreview } from "./panels/quiz-preview";
import { CodePreview } from "./panels/code-preview";
import { WordlePreview } from "./panels/wordle-preview";
import { HangmanPreview } from "./panels/hangman-preview";
import { MastermindPreview } from "./panels/mastermind-preview";
import { AnagramPreview } from "./panels/anagram-preview";
import { CaesarPreview } from "./panels/caesar-preview";
import { MemoryPreview } from "./panels/memory-preview";
import { SimonPreview } from "./panels/simon-preview";
import { RebusPreview } from "./panels/rebus-preview";
import { BogglePreview } from "./panels/boggle-preview";
import { MiniSudokuPreview } from "./panels/mini-sudoku-preview";
import { MatchingPreview } from "./panels/matching-preview";
import { StrongPasswordPreview } from "./panels/strong-password-preview";
import { CameraPlaceholderPreview } from "./panels/camera-placeholder-preview";

const TYPE_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  stationTypeOptions.map((option) => [option.value, option.label]),
);

// Types that get a top prompt line inside the task card, matching mobile's
// `isQuizStation && !isMatchingStation && !isBoggleStation && !isMastermindStation
// && !isMemoryStation && !isMiniSudokuStation && !isSimonStation` wrapper condition
// (plus mastermind/memory, which get the same prompt via their own dedicated
// section) in preview.tsx. Rebus computes a prompt too but hides it
// (`hidePrompt={isRebusStation}`); boggle/mini-sudoku/matching/simon never get one
// — those panels carry their own instructional copy inline instead.
const PROMPT_TYPES = new Set<StationType>([
  "quiz",
  "audio-quiz",
  "open-quiz",
  "wordle",
  "hangman",
  "anagram",
  "caesar-cipher",
  "strong-password",
  "mastermind",
  "memory",
]);

export type MobileStationPreviewProps = {
  stationKey: string;
  type: StationType;
  name: string;
  description: string;
  quiz?: StationPreviewProps["quiz"];
  points: number;
  timeLimitSeconds: number;
  completionCode?: string;
  completionStopwatchEnabled?: boolean;
  fastestCompletionBonusPoints?: number;
  challengeDifficulty?: StationPreviewProps["challengeDifficulty"];
  challengeDifficultyMode?: StationPreviewProps["challengeDifficultyMode"];
  imageUrl?: string;
  language: RealizationLanguage;
};

export function MobileStationPreview({
  stationKey,
  type,
  name,
  description,
  quiz,
  points,
  timeLimitSeconds,
  completionCode,
  completionStopwatchEnabled,
  fastestCompletionBonusPoints,
  challengeDifficulty,
  challengeDifficultyMode,
  imageUrl,
  language,
}: MobileStationPreviewProps) {
  const typeLabel = TYPE_LABEL_BY_VALUE[type] ?? type;
  const headerLabel = type === "caesar-cipher" ? typeLabel : `${name || "Nowe stanowisko"} • ${typeLabel}`;
  const requiresCode = type === "time" || type === "points";
  const isNumericCodeStation = requiresCode && /^\d+$/.test((completionCode ?? "").trim());
  const isStopwatchActive = completionStopwatchEnabled && timeLimitSeconds === 0;
  const showTimer = timeLimitSeconds > 0 || isStopwatchActive;
  const timerFontSize = isNumericCodeStation ? 30 : 36;
  const pointsValueFontSize = isNumericCodeStation ? 20 : 24;

  const panelProps: StationPreviewProps = {
    stationKey,
    name,
    quiz,
    points,
    timeLimitSeconds,
    completionCode,
    challengeDifficulty,
    challengeDifficultyMode,
    language,
    imageUrl,
  };

  const wordleLength =
    type === "wordle" ? resolvePuzzleSecret(toPuzzleView({ stationKey, name, quiz }), "wordle").length : 0;
  const prompt = resolveStationPreviewPrompt(type, quiz?.question, language, wordleLength, description);

  return (
    <div className="mx-auto w-full max-w-[380px]">
    <div
      className="flex aspect-[3/4] flex-col overflow-hidden rounded-3xl border"
      style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panel }}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 px-4 pb-2 pt-4">
        <p className="min-w-0 flex-1 truncate uppercase tracking-widest" style={{ color: MOBILE_THEME.textSubtle, fontSize: 9 }}>
          {headerLabel}
        </p>
        <span
          className="flex shrink-0 items-center justify-center rounded-full border font-semibold"
          style={{ width: 26, height: 26, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted, color: MOBILE_THEME.textPrimary, fontSize: 12 }}
        >
          ✕
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        {description ? (
          <p
            className={`mb-2 ${requiresCode ? "text-justify" : "line-clamp-2"}`}
            style={{ color: MOBILE_THEME.textMuted, fontSize: PREVIEW_LAYOUT.descriptionFontSize, lineHeight: 1.4 }}
          >
            {description}
          </p>
        ) : null}

        {type === "photo-task" ? (
          <>
            <p className="mb-2 text-center" style={{ color: MOBILE_THEME.textPrimary, fontSize: PREVIEW_LAYOUT.promptFontSize }}>
              {prompt}
            </p>
            <CameraPlaceholderPreview kind={type} />
          </>
        ) : type === "qr-hunt" ? (
          <CameraPlaceholderPreview kind={type} />
        ) : requiresCode ? (
          <CodePreview {...panelProps} type={type} />
        ) : (
          <PreviewTaskWrapper prompt={PROMPT_TYPES.has(type) ? prompt : undefined}>
            {renderPreviewBody(type, panelProps)}
          </PreviewTaskWrapper>
        )}
      </div>

      <div className="flex shrink-0 items-end justify-between px-4 pb-4 pt-2">
        <div className="flex-1" />
        {showTimer ? (
          <div className="px-2 text-center">
            <p className="font-extrabold" style={{ color: MOBILE_THEME.textPrimary, fontSize: timerFontSize }}>
              {isStopwatchActive ? "00:00" : formatRemainingTimeLabel(timeLimitSeconds)}
            </p>
            <p className="mt-1 uppercase tracking-widest" style={{ color: MOBILE_THEME.textSubtle, fontSize: 10 }}>
              {isStopwatchActive ? "Czas wykonania zadania" : "Pozostały czas"}
            </p>
            {isStopwatchActive && (fastestCompletionBonusPoints ?? 0) > 0 ? (
              <p className="mt-0.5 font-semibold" style={{ color: MOBILE_THEME.accent, fontSize: 10 }}>
                Bonus za najszybsze: +{fastestCompletionBonusPoints}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-1 justify-end">
          <div
            className="rounded-2xl border px-4 py-2 text-center"
            style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}
          >
            <p className="uppercase tracking-widest" style={{ color: MOBILE_THEME.accent, fontSize: 9 }}>
              Punkty
            </p>
            <p className="mt-0.5 font-extrabold" style={{ color: MOBILE_THEME.accent, fontSize: pointsValueFontSize }}>
              {points}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function renderPreviewBody(type: StationType, props: StationPreviewProps) {
  switch (type) {
    case "quiz":
      return <QuizPreview {...props} isAudioQuiz={false} />;
    case "audio-quiz":
      return <QuizPreview {...props} isAudioQuiz />;
    case "open-quiz":
      return <OpenQuizPreview {...props} />;
    case "wordle":
      return <WordlePreview {...props} />;
    case "hangman":
      return <HangmanPreview {...props} />;
    case "mastermind":
      return <MastermindPreview {...props} />;
    case "anagram":
      return <AnagramPreview {...props} />;
    case "caesar-cipher":
      return <CaesarPreview {...props} />;
    case "memory":
      return <MemoryPreview {...props} />;
    case "simon":
      return <SimonPreview {...props} />;
    case "rebus":
      return <RebusPreview {...props} />;
    case "boggle":
      return <BogglePreview {...props} />;
    case "mini-sudoku":
      return <MiniSudokuPreview {...props} />;
    case "matching":
      return <MatchingPreview {...props} />;
    case "strong-password":
      return <StrongPasswordPreview {...props} />;
    default:
      return null;
  }
}
