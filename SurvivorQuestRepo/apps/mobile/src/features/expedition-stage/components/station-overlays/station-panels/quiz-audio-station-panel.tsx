import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";

type QuizPromptArgs = {
  station: StationTestViewModel;
  wordleLength: number;
  uiLanguage: UiLanguage;
};

type QuizPromptText = {
  classicQuizFallback: string;
  audioQuizFallback: string;
  wordleFallback: (wordleLength: number) => string;
  hangmanFallback: string;
  mastermindFallback: string;
  anagramFallback: string;
  caesarFallback: string;
  memoryFallback: string;
  simonFallback: string;
  rebusFallback: string;
  boggleFallback: string;
  miniSudokuFallback: string;
  matchingFallback: string;
  playAudio: string;
  audioPlaying: string;
  loadingRecording: string;
};

const QUIZ_PROMPT_TEXT_ENGLISH: QuizPromptText = {
  classicQuizFallback: "Quiz: choose one of 4 answers",
  audioQuizFallback: "Audio quiz: play recording and choose the correct answer.",
  wordleFallback: (wordleLength: number) => `Wordle: guess the word (${wordleLength || 5} letters).`,
  hangmanFallback: "Hangman: guess the phrase letter by letter.",
  mastermindFallback: "Mastermind: guess a 4-symbol code using letters A-F.",
  anagramFallback: "Anagram: arrange the correct word from jumbled letters.",
  caesarFallback: "Caesar cipher: decode the text using the shown shift.",
  memoryFallback: "Memory: find all pairs.",
  simonFallback: "Simon: repeat the sequence.",
  rebusFallback: "Rebus: enter the answer.",
  boggleFallback: "Boggle: find the target word on the board.",
  miniSudokuFallback: "Mini Sudoku: fill the 2x2 grid.",
  matchingFallback: "Matching pairs: match the elements.",
  playAudio: "▶️ Play / replay audio",
  audioPlaying: "Playing...",
  loadingRecording: "Loading recording...",
};

const QUIZ_PROMPT_TEXT: Record<UiLanguage, QuizPromptText> = {
  polish: {
    classicQuizFallback: "Quiz: wybierz jedną z 4 odpowiedzi",
    audioQuizFallback: "Quiz audio: odtwórz nagranie i wybierz poprawną odpowiedź.",
    wordleFallback: (wordleLength: number) => `Wordle: odgadnij słowo (${wordleLength || 5} liter).`,
    hangmanFallback: "Wisielec: odgadnij hasło litera po literze.",
    mastermindFallback: "Mastermind: odgadnij 4-znakowy kod z liter A-F.",
    anagramFallback: "Anagram: ułóż poprawne słowo z rozsypanki.",
    caesarFallback: "Szyfr Cezara: odszyfruj tekst używając pokazanego przesunięcia.",
    memoryFallback: "Memory: znajdź wszystkie pary.",
    simonFallback: "Simon: odtwórz sekwencję.",
    rebusFallback: "Rebus: wpisz hasło.",
    boggleFallback: "Boggle: znajdź docelowe słowo na planszy.",
    miniSudokuFallback: "Mini Sudoku: uzupełnij siatkę 2x2.",
    matchingFallback: "Łączenie par: dopasuj elementy.",
    playAudio: "▶️ Odtwórz / odtwórz ponownie audio",
    audioPlaying: "Odtwarzanie...",
    loadingRecording: "Ładowanie nagrania...",
  },
  english: QUIZ_PROMPT_TEXT_ENGLISH,
  ukrainian: {
    classicQuizFallback: "Вікторина: виберіть одну з 4 відповідей",
    audioQuizFallback: "Аудіовікторина: відтворіть запис і виберіть правильну відповідь.",
    wordleFallback: (wordleLength: number) => `Wordle: вгадайте слово (${wordleLength || 5} літер).`,
    hangmanFallback: "Шибениця: вгадайте фразу літера за літерою.",
    mastermindFallback: "Mastermind: вгадайте 4-символьний код із літер A-F.",
    anagramFallback: "Анаграма: складіть правильне слово з перемішаних літер.",
    caesarFallback: "Шифр Цезаря: розшифруйте текст, використовуючи показаний зсув.",
    memoryFallback: "Memory: знайдіть усі пари.",
    simonFallback: "Simon: повторіть послідовність.",
    rebusFallback: "Ребус: введіть відповідь.",
    boggleFallback: "Boggle: знайдіть цільове слово на полі.",
    miniSudokuFallback: "Мінісудоку: заповніть сітку 2x2.",
    matchingFallback: "Підбір пар: зіставте елементи.",
    playAudio: "▶️ Відтворити / відтворити аудіо знову",
    audioPlaying: "Відтворення...",
    loadingRecording: "Завантаження запису...",
  },
  russian: {
    classicQuizFallback: "Викторина: выберите один из 4 ответов",
    audioQuizFallback: "Аудиовикторина: воспроизведите запись и выберите правильный ответ.",
    wordleFallback: (wordleLength: number) => `Wordle: угадайте слово (${wordleLength || 5} букв).`,
    hangmanFallback: "Виселица: угадайте фразу по буквам.",
    mastermindFallback: "Mastermind: угадайте 4-символьный код из букв A-F.",
    anagramFallback: "Анаграмма: составьте правильное слово из перемешанных букв.",
    caesarFallback: "Шифр Цезаря: расшифруйте текст, используя показанный сдвиг.",
    memoryFallback: "Memory: найдите все пары.",
    simonFallback: "Simon: повторите последовательность.",
    rebusFallback: "Ребус: введите ответ.",
    boggleFallback: "Boggle: найдите целевое слово на поле.",
    miniSudokuFallback: "Мини-судоку: заполните сетку 2x2.",
    matchingFallback: "Сопоставление пар: сопоставьте элементы.",
    playAudio: "▶️ Воспроизвести / воспроизвести аудио снова",
    audioPlaying: "Воспроизведение...",
    loadingRecording: "Загрузка записи...",
  },
};

export function resolveStationQuizPrompt({ station, wordleLength, uiLanguage }: QuizPromptArgs) {
  const text = QUIZ_PROMPT_TEXT[uiLanguage];

  if (station.stationType === "quiz") {
    return station.quizQuestion?.trim() || text.classicQuizFallback;
  }
  if (station.stationType === "audio-quiz") {
    return station.quizQuestion?.trim() || text.audioQuizFallback;
  }
  if (station.stationType === "wordle") {
    return text.wordleFallback(wordleLength);
  }
  if (station.stationType === "hangman") {
    return text.hangmanFallback;
  }
  if (station.stationType === "mastermind") {
    return station.quizQuestion?.trim() || text.mastermindFallback;
  }
  if (station.stationType === "anagram") {
    return text.anagramFallback;
  }
  if (station.stationType === "caesar-cipher") {
    return text.caesarFallback;
  }
  if (station.stationType === "memory") {
    return station.quizQuestion?.trim() || text.memoryFallback;
  }
  if (station.stationType === "simon") {
    return station.quizQuestion?.trim() || text.simonFallback;
  }
  if (station.stationType === "rebus") {
    return station.quizQuestion?.trim() || text.rebusFallback;
  }
  if (station.stationType === "boggle") {
    return station.quizQuestion?.trim() || text.boggleFallback;
  }
  if (station.stationType === "mini-sudoku") {
    return station.quizQuestion?.trim() || text.miniSudokuFallback;
  }
  return station.quizQuestion?.trim() || text.matchingFallback;
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
  const uiLanguage = useUiLanguage();
  const text = QUIZ_PROMPT_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
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
            className="items-center justify-center rounded-xl active:opacity-90"
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
              minHeight: layout.actionMinHeight,
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
              <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
                {isAudioPlaying ? text.audioPlaying : text.playAudio}
              </Text>
            </Pressable>
          {isAudioLoading ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator size="small" color={EXPEDITION_THEME.accentStrong} />
              <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
                {text.loadingRecording}
              </Text>
            </View>
          ) : null}
          {audioLoadError ? (
            <Text className="mt-2" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.infoFontSize }}>
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
                minHeight: layout.isTablet ? 110 : 92,
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
              hitSlop={4}
            >
              <Text
                className="text-center font-semibold"
                style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 18 : 14 }}
              >
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
            className="text-center font-semibold"
            style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.resultFontSize }}
          >
            {quizResult}
          </Text>
        </Animated.View>
      ) : null}
    </>
  );
}
