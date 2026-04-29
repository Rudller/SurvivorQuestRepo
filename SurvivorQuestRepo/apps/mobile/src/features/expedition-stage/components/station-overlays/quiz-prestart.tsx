import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import type { QuizPrestartOverlayProps } from "./types";

const QUIZ_PRESTART_TEXT: Record<
  UiLanguage,
  {
    badgeTimed: string;
    badgeAudioQuiz: string;
    badgeWordle: string;
    badgeHangman: string;
    badgeLogicChallenge: string;
    badgeQuiz: string;
    titleTimed: string;
    titleAudioQuiz: string;
    titleWordle: string;
    titleHangman: string;
    titleLogicChallenge: string;
    titleQuiz: string;
    descriptionTimed: string;
    descriptionAudioQuiz: string;
    descriptionWordle: string;
    descriptionHangman: string;
    descriptionLogicChallenge: string;
    descriptionQuiz: string;
    stationPrefix: string;
    close: string;
    start: string;
    starting: string;
  }
> = {
  polish: {
    badgeTimed: "Na czas",
    badgeAudioQuiz: "Quiz audio",
    badgeWordle: "Wordle",
    badgeHangman: "Wisielec",
    badgeLogicChallenge: "Wyzwanie logiczne",
    badgeQuiz: "Quiz",
    titleTimed: "Za chwilę zostanie uruchomione zadanie czasowe",
    titleAudioQuiz: "Za chwilę zostanie uruchomiony quiz audio",
    titleWordle: "Za chwilę zostanie uruchomiony Wordle",
    titleHangman: "Za chwilę zostanie uruchomiony Wisielec",
    titleLogicChallenge: "Za chwilę zostanie uruchomione wyzwanie",
    titleQuiz: "Za chwilę zostanie uruchomiony quiz",
    descriptionTimed: "Przygotuj się. Po starcie od razu ruszy licznik czasu.",
    descriptionAudioQuiz: "Przygotuj się na odsłuchanie nagrania i wybór poprawnej odpowiedzi.",
    descriptionWordle: "Przygotuj się na odgadnięcie słowa.",
    descriptionHangman: "Przygotuj się na odgadnięcie hasła.",
    descriptionLogicChallenge: "Przygotuj się na krótkie zadanie interaktywne.",
    descriptionQuiz: "Przygotuj się na odpowiedzenie na pytania.",
    stationPrefix: "Stanowisko",
    close: "Zamknij",
    start: "Start",
    starting: "Uruchamianie...",
  },
  english: {
    badgeTimed: "Timed",
    badgeAudioQuiz: "Audio quiz",
    badgeWordle: "Wordle",
    badgeHangman: "Hangman",
    badgeLogicChallenge: "Logic challenge",
    badgeQuiz: "Quiz",
    titleTimed: "A timed task will start in a moment",
    titleAudioQuiz: "An audio quiz will start in a moment",
    titleWordle: "Wordle will start in a moment",
    titleHangman: "Hangman will start in a moment",
    titleLogicChallenge: "A challenge will start in a moment",
    titleQuiz: "A quiz will start in a moment",
    descriptionTimed: "Get ready. The timer starts immediately after launch.",
    descriptionAudioQuiz: "Get ready to listen to a recording and choose the correct answer.",
    descriptionWordle: "Get ready to guess the word.",
    descriptionHangman: "Get ready to guess the phrase.",
    descriptionLogicChallenge: "Get ready for a short interactive task.",
    descriptionQuiz: "Get ready to answer the questions.",
    stationPrefix: "Station",
    close: "Close",
    start: "Start",
    starting: "Starting...",
  },
  ukrainian: {
    badgeTimed: "На час",
    badgeAudioQuiz: "Аудіо-вікторина",
    badgeWordle: "Wordle",
    badgeHangman: "Шибениця",
    badgeLogicChallenge: "Логічний виклик",
    badgeQuiz: "Вікторина",
    titleTimed: "Незабаром запуститься завдання на час",
    titleAudioQuiz: "Незабаром запуститься аудіо-вікторина",
    titleWordle: "Незабаром запуститься Wordle",
    titleHangman: "Незабаром запуститься Шибениця",
    titleLogicChallenge: "Незабаром запуститься випробування",
    titleQuiz: "Незабаром запуститься вікторина",
    descriptionTimed: "Підготуйтеся. Після старту таймер запуститься одразу.",
    descriptionAudioQuiz: "Підготуйтеся прослухати запис і вибрати правильну відповідь.",
    descriptionWordle: "Підготуйтеся відгадати слово.",
    descriptionHangman: "Підготуйтеся відгадати фразу.",
    descriptionLogicChallenge: "Підготуйтеся до короткого інтерактивного завдання.",
    descriptionQuiz: "Підготуйтеся відповісти на запитання.",
    stationPrefix: "Станція",
    close: "Закрити",
    start: "Старт",
    starting: "Запуск...",
  },
  russian: {
    badgeTimed: "На время",
    badgeAudioQuiz: "Аудиовикторина",
    badgeWordle: "Wordle",
    badgeHangman: "Виселица",
    badgeLogicChallenge: "Логическое испытание",
    badgeQuiz: "Викторина",
    titleTimed: "Скоро запустится задание на время",
    titleAudioQuiz: "Скоро запустится аудиовикторина",
    titleWordle: "Скоро запустится Wordle",
    titleHangman: "Скоро запустится Виселица",
    titleLogicChallenge: "Скоро запустится испытание",
    titleQuiz: "Скоро запустится викторина",
    descriptionTimed: "Подготовьтесь. После старта таймер запустится сразу.",
    descriptionAudioQuiz: "Подготовьтесь прослушать запись и выбрать правильный ответ.",
    descriptionWordle: "Подготовьтесь отгадать слово.",
    descriptionHangman: "Подготовьтесь отгадать фразу.",
    descriptionLogicChallenge: "Подготовьтесь к короткому интерактивному заданию.",
    descriptionQuiz: "Подготовьтесь ответить на вопросы.",
    stationPrefix: "Станция",
    close: "Закрыть",
    start: "Старт",
    starting: "Запуск...",
  },
};

export function QuizPrestartOverlay({
  visible,
  stationName,
  stationType = "quiz",
  isStarting = false,
  onStart,
  onClose,
}: QuizPrestartOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = QUIZ_PRESTART_TEXT[uiLanguage];
  const isLightTheme = getExpeditionThemeMode() === "light";
  const accentButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;
  const slideAnimation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const [displayStationName, setDisplayStationName] = useState(stationName);

  useEffect(() => {
    if (visible) {
      setDisplayStationName(stationName);
      setIsMounted(true);
      slideAnimation.stopAnimation();
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    slideAnimation.stopAnimation();
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [slideAnimation, stationName, visible]);

  if (!isMounted) {
    return null;
  }

  const backdropStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const panelStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [140, 0],
        }),
      },
    ],
  } as const;
  const isLogicChallenge =
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching";
  const prestartBadge =
    stationType === "time"
      ? text.badgeTimed
      : stationType === "audio-quiz"
        ? text.badgeAudioQuiz
      : stationType === "wordle"
        ? text.badgeWordle
      : stationType === "hangman"
          ? text.badgeHangman
          : isLogicChallenge
            ? text.badgeLogicChallenge
          : text.badgeQuiz;
  const prestartTitle =
    stationType === "time"
      ? text.titleTimed
      : stationType === "audio-quiz"
        ? text.titleAudioQuiz
      : stationType === "wordle"
        ? text.titleWordle
      : stationType === "hangman"
          ? text.titleHangman
          : isLogicChallenge
            ? text.titleLogicChallenge
          : text.titleQuiz;
  const prestartDescription =
    stationType === "time"
      ? text.descriptionTimed
      : stationType === "audio-quiz"
        ? text.descriptionAudioQuiz
      : stationType === "wordle"
        ? text.descriptionWordle
      : stationType === "hangman"
          ? text.descriptionHangman
          : isLogicChallenge
            ? text.descriptionLogicChallenge
          : text.descriptionQuiz;

  return (
    <Animated.View
      className="absolute inset-0 z-50 items-center justify-center px-3"
      style={[
        { backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(15, 25, 20, 0.88)" },
        backdropStyle,
      ]}
    >
      <Animated.View
        className="w-full max-w-[560px] rounded-3xl border px-4 py-4"
        style={[{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }, panelStyle]}
      >
        <Text className="text-center text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          {prestartBadge}
        </Text>
        <Text className="mt-2 text-center text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {prestartTitle}
        </Text>
        <Text className="mt-2 text-center text-sm leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
          {prestartDescription}
          {displayStationName ? ` ${text.stationPrefix}: ${displayStationName}.` : ""}
        </Text>

        <View className="mt-4 flex-row gap-2">
          <Pressable
            className="flex-1 items-center rounded-xl border px-3 py-2.5 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.close}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-xl px-3 py-2.5 active:opacity-90"
            style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: isStarting ? 0.7 : 1 }}
            onPress={onStart}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold" style={{ color: accentButtonTextColor }}>
              {isStarting ? text.starting : text.start}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
