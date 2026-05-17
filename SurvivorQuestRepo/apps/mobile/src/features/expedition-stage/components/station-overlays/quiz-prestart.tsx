import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";
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
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
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
  const horizontalInset = adaptiveLayout.s(isTabletLayout ? 44 : 24, 18, 56);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 760 : 460, 340, 840);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 32 : 24, 18, 40);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 34);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 30 : 22, 18, 36);
  const badgeFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 16);
  const titleFontSize = adaptiveLayout.fs(isTabletLayout ? 34 : 24, 20, 40);
  const descriptionFontSize = adaptiveLayout.fs(isTabletLayout ? 20 : 14, 13, 24);
  const descriptionLineHeight = adaptiveLayout.s(isTabletLayout ? 30 : 22, 20, 36);
  const actionsGap = adaptiveLayout.s(isTabletLayout ? 14 : 8, 6, 18);
  const actionMinHeight = adaptiveLayout.hit(isTabletLayout ? 64 : 50);
  const actionFontSize = adaptiveLayout.fs(isTabletLayout ? 22 : 16, 14, 26);

  return (
    <Animated.View
      className="absolute inset-0 z-50 items-center justify-center"
      style={[
        {
          paddingHorizontal: horizontalInset,
          backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(15, 25, 20, 0.88)",
        },
        backdropStyle,
      ]}
    >
      <Animated.View
        className="w-full border"
        style={[
          {
            maxWidth: panelMaxWidth,
            borderRadius: panelRadius,
            paddingHorizontal: panelPaddingHorizontal,
            paddingVertical: panelPaddingVertical,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
          },
          panelStyle,
        ]}
      >
        <Text
          className="text-center uppercase tracking-widest"
          style={{ color: EXPEDITION_THEME.textSubtle, fontSize: badgeFontSize }}
        >
          {prestartBadge}
        </Text>
        <Text
          className="text-center font-bold"
          style={{ marginTop: adaptiveLayout.s(12, 8, 16), color: EXPEDITION_THEME.textPrimary, fontSize: titleFontSize }}
        >
          {prestartTitle}
        </Text>
        <Text
          className="text-center"
          style={{
            marginTop: adaptiveLayout.s(10, 8, 14),
            color: EXPEDITION_THEME.textMuted,
            fontSize: descriptionFontSize,
            lineHeight: descriptionLineHeight,
          }}
        >
          {prestartDescription}
          {displayStationName ? ` ${text.stationPrefix}: ${displayStationName}.` : ""}
        </Text>

        <View className="mt-4 flex-row" style={{ columnGap: actionsGap }}>
          <Pressable
            className="flex-1 items-center justify-center border active:opacity-90"
            style={{
              minHeight: actionMinHeight,
              borderRadius: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelMuted,
            }}
            onPress={onClose}
            disabled={isStarting}
          >
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textMuted, fontSize: actionFontSize }}>
              {text.close}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center justify-center active:opacity-90"
            style={{
              minHeight: actionMinHeight,
              borderRadius: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
              backgroundColor: EXPEDITION_THEME.accent,
              opacity: isStarting ? 0.7 : 1,
            }}
            onPress={onStart}
            disabled={isStarting}
          >
            <Text className="font-semibold" style={{ color: accentButtonTextColor, fontSize: actionFontSize }}>
              {isStarting ? text.starting : text.start}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
