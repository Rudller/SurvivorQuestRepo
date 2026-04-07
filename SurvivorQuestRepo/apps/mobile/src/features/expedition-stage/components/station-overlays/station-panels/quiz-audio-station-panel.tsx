import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { StationTestViewModel } from "../types";

type QuizPromptArgs = {
  station: StationTestViewModel;
  wordleLength: number;
};

export function resolveStationQuizPrompt({ station, wordleLength }: QuizPromptArgs) {
  if (station.stationType === "quiz") {
    return station.quizQuestion?.trim() || "Quiz: wybierz jedną z 4 odpowiedzi";
  }
  if (station.stationType === "audio-quiz") {
    return station.quizQuestion?.trim() || "Quiz audio: odtwórz nagranie i wybierz poprawną odpowiedź.";
  }
  if (station.stationType === "wordle") {
    return `Wordle: odgadnij słowo (${wordleLength || 5} liter).`;
  }
  if (station.stationType === "hangman") {
    return station.quizQuestion?.trim() || "Wisielec: odgadnij hasło litera po literze.";
  }
  if (station.stationType === "mastermind") {
    return station.quizQuestion?.trim() || "Mastermind: odgadnij 4-znakowy kod z liter A-F.";
  }
  if (station.stationType === "anagram") {
    return "Anagram: ułóż poprawne słowo z rozsypanki.";
  }
  if (station.stationType === "caesar-cipher") {
    return station.quizQuestion?.trim() || "Szyfr Cezara: odszyfruj tekst (przesunięcie +3).";
  }
  if (station.stationType === "memory") {
    return station.quizQuestion?.trim() || "Memory: znajdź wszystkie pary.";
  }
  if (station.stationType === "simon") {
    return station.quizQuestion?.trim() || "Simon: odtwórz sekwencję.";
  }
  if (station.stationType === "rebus") {
    return station.quizQuestion?.trim() || "Rebus: wpisz hasło.";
  }
  if (station.stationType === "boggle") {
    return station.quizQuestion?.trim() || "Boggle: znajdź docelowe słowo na planszy.";
  }
  if (station.stationType === "mini-sudoku") {
    return station.quizQuestion?.trim() || "Mini Sudoku: uzupełnij siatkę 2x2.";
  }
  return station.quizQuestion?.trim() || "Łączenie par: dopasuj elementy.";
}

type QuizAudioPanelProps = {
  station: StationTestViewModel;
  isAudioQuizStation: boolean;
  quizOptions: string[];
  selectedQuizOption: number | null;
  isSubmittingQuizAnswer: boolean;
  hasTimedLimit: boolean;
  hasTimerStarted: boolean;
  isTimeExpired: boolean;
  hasAudioSource: boolean;
  isAudioLoading: boolean;
  isAudioPlaying: boolean;
  audioLoadError: string | null;
  quizResult: string | null;
  feedbackTone: "success" | "error" | null;
  quizFeedbackAnimation: Animated.Value;
  onPlayAudio: () => void;
  onSubmitQuizAnswer: (index: number) => void;
};

export function QuizAudioPanel({
  station,
  isAudioQuizStation,
  quizOptions,
  selectedQuizOption,
  isSubmittingQuizAnswer,
  hasTimedLimit,
  hasTimerStarted,
  isTimeExpired,
  hasAudioSource,
  isAudioLoading,
  isAudioPlaying,
  audioLoadError,
  quizResult,
  feedbackTone,
  quizFeedbackAnimation,
  onPlayAudio,
  onSubmitQuizAnswer,
}: QuizAudioPanelProps) {
  const quizFeedbackStyle = {
    opacity: quizFeedbackAnimation,
    transform: [
      {
        translateY: quizFeedbackAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  } as const;

  return (
    <>
      {isAudioQuizStation ? (
        <View className="mt-3 rounded-xl border px-3 py-3" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}>
          <Pressable
            className="items-center rounded-xl py-2.5 active:opacity-90"
            style={{
              backgroundColor:
                station.status === "done" ||
                station.status === "failed" ||
                isSubmittingQuizAnswer ||
                isAudioLoading ||
                (hasTimedLimit && !hasTimerStarted) ||
                isTimeExpired ||
                !hasAudioSource
                  ? EXPEDITION_THEME.panelMuted
                  : EXPEDITION_THEME.accent,
            }}
            onPress={() => {
              onPlayAudio();
            }}
            disabled={
              station.status === "done" ||
              station.status === "failed" ||
              isSubmittingQuizAnswer ||
              isAudioLoading ||
              (hasTimedLimit && !hasTimerStarted) ||
              isTimeExpired ||
              !hasAudioSource
            }
          >
            <Text className="text-sm font-semibold text-zinc-950">
              {isAudioPlaying ? "Odtwarzanie..." : "▶️ Odtwórz / odtwórz ponownie audio"}
            </Text>
          </Pressable>
          {isAudioLoading ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator size="small" color={EXPEDITION_THEME.accentStrong} />
              <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                Ładowanie nagrania...
              </Text>
            </View>
          ) : null}
          {audioLoadError ? (
            <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
              {audioLoadError}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
        {quizOptions.map((option, index) => {
          const isSelected = selectedQuizOption === index;
          const isCorrect = station.quizCorrectAnswerIndex === index;
          const showCorrect = isSelected && isCorrect;
          const showWrong = isSelected && !isCorrect;

          return (
            <Pressable
              key={`${station.stationId}-quiz-${index}`}
              className="rounded-2xl border px-3 py-3 active:opacity-90"
              style={{
                width: "49%",
                minHeight: 92,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000000",
                shadowOpacity: 0.22,
                shadowRadius: 7,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
                borderColor: showCorrect
                  ? "rgba(52, 211, 153, 0.8)"
                  : showWrong
                    ? EXPEDITION_THEME.danger
                    : isSelected
                      ? EXPEDITION_THEME.accentStrong
                      : EXPEDITION_THEME.border,
                backgroundColor: showCorrect
                  ? "rgba(22, 163, 74, 0.24)"
                  : showWrong
                    ? "rgba(239, 111, 108, 0.22)"
                    : EXPEDITION_THEME.panelStrong,
              }}
              onPress={() => {
                onSubmitQuizAnswer(index);
              }}
              disabled={
                selectedQuizOption !== null ||
                isSubmittingQuizAnswer ||
                station.status === "done" ||
                station.status === "failed" ||
                (hasTimedLimit && !hasTimerStarted) ||
                isTimeExpired
              }
            >
              <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {quizResult && feedbackTone ? (
        <Animated.View
          className="mt-3 rounded-2xl border px-3 py-2"
          style={[
            {
              borderColor: feedbackTone === "success" ? "rgba(52, 211, 153, 0.82)" : EXPEDITION_THEME.danger,
              backgroundColor: feedbackTone === "success" ? "rgba(52, 211, 153, 0.18)" : "rgba(239, 111, 108, 0.18)",
            },
            quizFeedbackStyle,
          ]}
        >
          <Text
            className="text-center text-xs font-semibold"
            style={{ color: EXPEDITION_THEME.textPrimary }}
          >
            {quizResult}
          </Text>
        </Animated.View>
      ) : null}
    </>
  );
}
