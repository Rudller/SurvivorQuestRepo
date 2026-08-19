import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";
import type { ChallengeDifficulty, QuizPrestartOverlayProps } from "./types";

function formatTimeLimit(timeLimitSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(timeLimitSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const QUIZ_PRESTART_TEXT: Record<
  UiLanguage,
  {
    badgeTimed: string;
    badgeAudioQuiz: string;
    badgeWordle: string;
    badgeHangman: string;
    badgeLogicChallenge: string;
    badgeQrHunt: string;
    badgeQuiz: string;
    badgePhotoTask: string;
    titleTimed: string;
    titleAudioQuiz: string;
    titleWordle: string;
    titleHangman: string;
    titleLogicChallenge: string;
    titleQrHunt: string;
    titleQuiz: string;
    titlePhotoTask: string;
    descriptionTimed: string;
    descriptionAudioQuiz: string;
    descriptionWordle: string;
    descriptionHangman: string;
    descriptionLogicChallenge: string;
    descriptionQrHunt: string;
    descriptionQuiz: string;
    descriptionPhotoTask: string;
    pointsDecayWarning: (timeLimit: string, points: number) => string;
    chooseDifficulty: string;
    selectedDifficulty: (difficulty: string) => string;
    difficultyEasy: string;
    difficultyMedium: string;
    difficultyHard: string;
    difficultyEasyDescription: string;
    difficultyMediumDescription: string;
    difficultyHardDescription: string;
    mastermindEasyDescription: string;
    mastermindMediumDescription: string;
    mastermindHardDescription: string;
    miniSudokuEasyDescription: string;
    miniSudokuMediumDescription: string;
    miniSudokuHardDescription: string;
    strongPasswordEasyDescription: string;
    strongPasswordMediumDescription: string;
    strongPasswordHardDescription: string;
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
    badgeQrHunt: "Skanowanie QR",
    badgeQuiz: "Quiz",
    badgePhotoTask: "Zadanie foto",
    titleTimed: "Za chwilę zostanie uruchomione zadanie czasowe",
    titleAudioQuiz: "Za chwilę zostanie uruchomiony quiz audio",
    titleWordle: "Za chwilę zostanie uruchomiony Wordle",
    titleHangman: "Za chwilę zostanie uruchomiony Wisielec",
    titleLogicChallenge: "Za chwilę zostanie uruchomione wyzwanie",
    titleQrHunt: "Za chwilę rozpocznie się skanowanie kodów QR",
    titleQuiz: "Za chwilę zostanie uruchomiony quiz",
    titlePhotoTask: "Za chwilę rozpocznie się zadanie fotograficzne",
    descriptionTimed: "Przygotuj się. Po starcie od razu ruszy licznik czasu.",
    descriptionAudioQuiz: "Przygotuj się na odsłuchanie nagrania i wybór poprawnej odpowiedzi.",
    descriptionWordle: "Przygotuj się na odgadnięcie słowa.",
    descriptionHangman: "Przygotuj się na odgadnięcie hasła.",
    descriptionLogicChallenge: "Przygotuj się na krótkie zadanie interaktywne.",
    descriptionQrHunt: "Znajdź i zeskanuj wszystkie kody QR ukryte w terenie.",
    descriptionQuiz: "Przygotuj się na odpowiedzenie na pytania.",
    descriptionPhotoTask: "Przygotuj się na wykonanie i przesłanie zdjęcia.",
    pointsDecayWarning: (timeLimit, points) =>
      `Macie ${timeLimit} na wykonanie zadania. Każda sekunda odejmuje punkty z puli ${points}. Koniec czasu oznacza niezaliczone zadanie.`,
    chooseDifficulty: "Wybierz poziom trudności przed startem.",
    selectedDifficulty: (difficulty) => `Poziom trudności: ${difficulty}.`,
    difficultyEasy: "Łatwy",
    difficultyMedium: "Średni",
    difficultyHard: "Trudny",
    difficultyEasyDescription: "Prostsza wersja zadania",
    difficultyMediumDescription: "Standardowa wersja zadania",
    difficultyHardDescription: "Trudniejsza wersja zadania",
    mastermindEasyDescription: "4 znaki z A-D, bez powtórzeń, 10 prób, 50% punktów",
    mastermindMediumDescription: "4 znaki z A-F, powtórzenia możliwe, 8 prób, 100% punktów",
    mastermindHardDescription: "5 znaków z A-F, powtórzenia możliwe, 6 prób, 150% punktów",
    miniSudokuEasyDescription: "45 podpowiedzi na planszy, 50% punktów",
    miniSudokuMediumDescription: "35 podpowiedzi na planszy, 100% punktów",
    miniSudokuHardDescription: "25 podpowiedzi na planszy, 150% punktów",
    strongPasswordEasyDescription: "10 reguł hasła, 50% punktów",
    strongPasswordMediumDescription: "20 reguł hasła, 100% punktów",
    strongPasswordHardDescription: "30 reguł hasła, 150% punktów",
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
    badgeQrHunt: "QR scan hunt",
    badgeQuiz: "Quiz",
    badgePhotoTask: "Photo task",
    titleTimed: "A timed task will start in a moment",
    titleAudioQuiz: "An audio quiz will start in a moment",
    titleWordle: "Wordle will start in a moment",
    titleHangman: "Hangman will start in a moment",
    titleLogicChallenge: "A challenge will start in a moment",
    titleQrHunt: "QR code scanning will start in a moment",
    titleQuiz: "A quiz will start in a moment",
    titlePhotoTask: "A photo task will start in a moment",
    descriptionTimed: "Get ready. The timer starts immediately after launch.",
    descriptionAudioQuiz: "Get ready to listen to a recording and choose the correct answer.",
    descriptionWordle: "Get ready to guess the word.",
    descriptionHangman: "Get ready to guess the phrase.",
    descriptionLogicChallenge: "Get ready for a short interactive task.",
    descriptionQrHunt: "Find and scan all the QR codes hidden around the area.",
    descriptionQuiz: "Get ready to answer the questions.",
    descriptionPhotoTask: "Get ready to take and submit a photo.",
    pointsDecayWarning: (timeLimit, points) =>
      `You have ${timeLimit} to complete the task. Every second reduces the available ${points} points. Time running out means the task is failed.`,
    chooseDifficulty: "Choose difficulty before starting.",
    selectedDifficulty: (difficulty) => `Difficulty: ${difficulty}.`,
    difficultyEasy: "Easy",
    difficultyMedium: "Medium",
    difficultyHard: "Hard",
    difficultyEasyDescription: "Simpler task version",
    difficultyMediumDescription: "Standard task version",
    difficultyHardDescription: "Harder task version",
    mastermindEasyDescription: "4 symbols from A-D, no repeats, 10 attempts, 50% points",
    mastermindMediumDescription: "4 symbols from A-F, repeats allowed, 8 attempts, 100% points",
    mastermindHardDescription: "5 symbols from A-F, repeats allowed, 6 attempts, 150% points",
    miniSudokuEasyDescription: "45 pre-filled cells, 50% points",
    miniSudokuMediumDescription: "35 pre-filled cells, 100% points",
    miniSudokuHardDescription: "25 pre-filled cells, 150% points",
    strongPasswordEasyDescription: "10 password rules, 50% points",
    strongPasswordMediumDescription: "20 password rules, 100% points",
    strongPasswordHardDescription: "30 password rules, 150% points",
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
    badgeQrHunt: "Пошук QR-кодів",
    badgeQuiz: "Вікторина",
    badgePhotoTask: "Фотозавдання",
    titleTimed: "Незабаром запуститься завдання на час",
    titleAudioQuiz: "Незабаром запуститься аудіо-вікторина",
    titleWordle: "Незабаром запуститься Wordle",
    titleHangman: "Незабаром запуститься Шибениця",
    titleLogicChallenge: "Незабаром запуститься випробування",
    titleQrHunt: "Незабаром розпочнеться сканування QR-кодів",
    titleQuiz: "Незабаром запуститься вікторина",
    titlePhotoTask: "Незабаром розпочнеться фотозавдання",
    descriptionTimed: "Підготуйтеся. Після старту таймер запуститься одразу.",
    descriptionAudioQuiz: "Підготуйтеся прослухати запис і вибрати правильну відповідь.",
    descriptionWordle: "Підготуйтеся відгадати слово.",
    descriptionHangman: "Підготуйтеся відгадати фразу.",
    descriptionLogicChallenge: "Підготуйтеся до короткого інтерактивного завдання.",
    descriptionQrHunt: "Знайдіть і відскануйте всі QR-коди, сховані на місцевості.",
    descriptionQuiz: "Підготуйтеся відповісти на запитання.",
    descriptionPhotoTask: "Підготуйтеся зробити та надіслати фото.",
    pointsDecayWarning: (timeLimit, points) =>
      `У вас є ${timeLimit} на виконання завдання. Кожна секунда зменшує пул у ${points} балів. Завершення часу означає незараховане завдання.`,
    chooseDifficulty: "Оберіть складність перед стартом.",
    selectedDifficulty: (difficulty) => `Складність: ${difficulty}.`,
    difficultyEasy: "Легко",
    difficultyMedium: "Середньо",
    difficultyHard: "Складно",
    difficultyEasyDescription: "Простіша версія завдання",
    difficultyMediumDescription: "Стандартна версія завдання",
    difficultyHardDescription: "Складніша версія завдання",
    mastermindEasyDescription: "4 символи з A-D, без повторів, 10 спроб, 50% балів",
    mastermindMediumDescription: "4 символи з A-F, повтори дозволені, 8 спроб, 100% балів",
    mastermindHardDescription: "5 символів з A-F, повтори дозволені, 6 спроб, 150% балів",
    miniSudokuEasyDescription: "45 підказок на полі, 50% балів",
    miniSudokuMediumDescription: "35 підказок на полі, 100% балів",
    miniSudokuHardDescription: "25 підказок на полі, 150% балів",
    strongPasswordEasyDescription: "10 правил пароля, 50% балів",
    strongPasswordMediumDescription: "20 правил пароля, 100% балів",
    strongPasswordHardDescription: "30 правил пароля, 150% балів",
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
    badgeQrHunt: "Поиск QR-кодов",
    badgeQuiz: "Викторина",
    badgePhotoTask: "Фотозадание",
    titleTimed: "Скоро запустится задание на время",
    titleAudioQuiz: "Скоро запустится аудиовикторина",
    titleWordle: "Скоро запустится Wordle",
    titleHangman: "Скоро запустится Виселица",
    titleLogicChallenge: "Скоро запустится испытание",
    titleQrHunt: "Скоро начнётся сканирование QR-кодов",
    titleQuiz: "Скоро запустится викторина",
    titlePhotoTask: "Скоро начнётся фотозадание",
    descriptionTimed: "Подготовьтесь. После старта таймер запустится сразу.",
    descriptionAudioQuiz: "Подготовьтесь прослушать запись и выбрать правильный ответ.",
    descriptionWordle: "Подготовьтесь отгадать слово.",
    descriptionHangman: "Подготовьтесь отгадать фразу.",
    descriptionLogicChallenge: "Подготовьтесь к короткому интерактивному заданию.",
    descriptionQrHunt: "Найдите и отсканируйте все QR-коды, спрятанные на местности.",
    descriptionQuiz: "Подготовьтесь ответить на вопросы.",
    descriptionPhotoTask: "Подготовьтесь сделать и отправить фото.",
    pointsDecayWarning: (timeLimit, points) =>
      `У вас есть ${timeLimit} на выполнение задания. Каждая секунда уменьшает пул в ${points} баллов. Истечение времени означает незачтенное задание.`,
    chooseDifficulty: "Выберите сложность перед стартом.",
    selectedDifficulty: (difficulty) => `Сложность: ${difficulty}.`,
    difficultyEasy: "Легко",
    difficultyMedium: "Средне",
    difficultyHard: "Сложно",
    difficultyEasyDescription: "Более простая версия задания",
    difficultyMediumDescription: "Стандартная версия задания",
    difficultyHardDescription: "Более сложная версия задания",
    mastermindEasyDescription: "4 символа из A-D, без повторов, 10 попыток, 50% баллов",
    mastermindMediumDescription: "4 символа из A-F, повторы разрешены, 8 попыток, 100% баллов",
    mastermindHardDescription: "5 символов из A-F, повторы разрешены, 6 попыток, 150% баллов",
    miniSudokuEasyDescription: "45 подсказок на поле, 50% баллов",
    miniSudokuMediumDescription: "35 подсказок на поле, 100% баллов",
    miniSudokuHardDescription: "25 подсказок на поле, 150% баллов",
    strongPasswordEasyDescription: "10 правил пароля, 50% баллов",
    strongPasswordMediumDescription: "20 правил пароля, 100% баллов",
    strongPasswordHardDescription: "30 правил пароля, 150% баллов",
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
  timeLimitSeconds = 0,
  points = 0,
  timedStationPointsDecayEnabled = false,
  challengeDifficultyMode = "admin",
  challengeDifficulty = "medium",
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
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty | null>(
    challengeDifficultyMode === "player" ? null : challengeDifficulty,
  );

  useEffect(() => {
    if (visible) {
      setDisplayStationName(stationName);
      setSelectedDifficulty(challengeDifficultyMode === "player" ? null : challengeDifficulty);
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
  }, [challengeDifficulty, challengeDifficultyMode, slideAnimation, stationName, visible]);

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
    stationType === "strong-password" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching";
  const isTimedStationType = stationType === "time" || stationType === "points";
  const prestartBadge =
    isTimedStationType
      ? text.badgeTimed
      : stationType === "audio-quiz"
        ? text.badgeAudioQuiz
      : stationType === "wordle"
        ? text.badgeWordle
      : stationType === "hangman"
          ? text.badgeHangman
          : stationType === "qr-hunt"
            ? text.badgeQrHunt
          : stationType === "photo-task"
            ? text.badgePhotoTask
          : isLogicChallenge
            ? text.badgeLogicChallenge
          : text.badgeQuiz;
  const prestartTitle =
    isTimedStationType
      ? text.titleTimed
      : stationType === "audio-quiz"
        ? text.titleAudioQuiz
      : stationType === "wordle"
        ? text.titleWordle
      : stationType === "hangman"
          ? text.titleHangman
          : stationType === "qr-hunt"
            ? text.titleQrHunt
          : stationType === "photo-task"
            ? text.titlePhotoTask
          : isLogicChallenge
            ? text.titleLogicChallenge
          : text.titleQuiz;
  const prestartDescription =
    isTimedStationType
      ? text.descriptionTimed
      : stationType === "audio-quiz"
        ? text.descriptionAudioQuiz
      : stationType === "wordle"
        ? text.descriptionWordle
      : stationType === "hangman"
          ? text.descriptionHangman
          : stationType === "qr-hunt"
            ? text.descriptionQrHunt
          : stationType === "photo-task"
            ? text.descriptionPhotoTask
          : isLogicChallenge
            ? text.descriptionLogicChallenge
           : text.descriptionQuiz;
  const safePoints = Math.max(0, Math.round(points));
  const pointsDecayWarning =
    timedStationPointsDecayEnabled && timeLimitSeconds > 0 && safePoints > 0
      ? text.pointsDecayWarning(formatTimeLimit(timeLimitSeconds), safePoints)
      : null;
  const pointsDecayWarningColor = isLightTheme ? "#92400e" : "#fde68a";
  const pointsDecayWarningBorderColor = isLightTheme ? "rgba(146, 64, 14, 0.38)" : "rgba(251, 191, 36, 0.35)";
  const pointsDecayWarningBackgroundColor = isLightTheme ? "rgba(146, 64, 14, 0.12)" : "rgba(251, 191, 36, 0.1)";
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
  const supportsDifficulty =
    stationType === "mastermind" || stationType === "strong-password" || stationType === "mini-sudoku";
  const shouldChooseDifficulty = supportsDifficulty && challengeDifficultyMode === "player";
  const resolveDifficultyDescription = (difficulty: ChallengeDifficulty) => {
    if (stationType === "mastermind") {
      if (difficulty === "easy") {
        return text.mastermindEasyDescription;
      }
      if (difficulty === "hard") {
        return text.mastermindHardDescription;
      }
      return text.mastermindMediumDescription;
    }
    if (stationType === "mini-sudoku") {
      if (difficulty === "easy") {
        return text.miniSudokuEasyDescription;
      }
      if (difficulty === "hard") {
        return text.miniSudokuHardDescription;
      }
      return text.miniSudokuMediumDescription;
    }
    if (stationType === "strong-password") {
      if (difficulty === "easy") {
        return text.strongPasswordEasyDescription;
      }
      if (difficulty === "hard") {
        return text.strongPasswordHardDescription;
      }
      return text.strongPasswordMediumDescription;
    }
    if (difficulty === "easy") {
      return text.difficultyEasyDescription;
    }
    if (difficulty === "hard") {
      return text.difficultyHardDescription;
    }
    return text.difficultyMediumDescription;
  };
  const effectiveDifficulty = selectedDifficulty ?? challengeDifficulty;
  const difficultyLabel =
    effectiveDifficulty === "easy"
      ? text.difficultyEasy
      : effectiveDifficulty === "hard"
        ? text.difficultyHard
        : text.difficultyMedium;
  const difficultyDescription = resolveDifficultyDescription(effectiveDifficulty);
  const difficultyOptions: ChallengeDifficulty[] = ["easy", "medium", "hard"];
  const canStart = !isStarting && (!shouldChooseDifficulty || Boolean(selectedDifficulty));

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
        {pointsDecayWarning ? (
          <Text
            className="text-center font-semibold"
            style={{
              marginTop: adaptiveLayout.s(12, 8, 16),
              borderRadius: adaptiveLayout.s(18, 14, 24),
              borderWidth: 1,
              borderColor: pointsDecayWarningBorderColor,
              backgroundColor: pointsDecayWarningBackgroundColor,
              paddingHorizontal: adaptiveLayout.s(14, 12, 18),
              paddingVertical: adaptiveLayout.s(10, 8, 14),
              color: pointsDecayWarningColor,
              fontSize: adaptiveLayout.fs(isTabletLayout ? 16 : 13, 12, 20),
              lineHeight: adaptiveLayout.s(isTabletLayout ? 24 : 19, 18, 28),
            }}
          >
            {pointsDecayWarning}
          </Text>
        ) : null}

        {supportsDifficulty ? (
          <View
            className="border"
            style={{
              marginTop: adaptiveLayout.s(12, 8, 16),
              borderRadius: adaptiveLayout.s(18, 14, 24),
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelMuted,
              paddingHorizontal: adaptiveLayout.s(14, 12, 18),
              paddingVertical: adaptiveLayout.s(10, 8, 14),
            }}
          >
            <Text
              className="text-center font-semibold"
              style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 16 : 13, 12, 20) }}
            >
              {shouldChooseDifficulty ? text.chooseDifficulty : text.selectedDifficulty(difficultyLabel)}
            </Text>
            {!shouldChooseDifficulty ? (
              <Text
                className="mt-1 text-center"
                style={{
                  color: EXPEDITION_THEME.textMuted,
                  fontSize: adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 16),
                  lineHeight: adaptiveLayout.s(isTabletLayout ? 20 : 16, 15, 24),
                }}
              >
                {difficultyDescription}
              </Text>
            ) : null}
            {shouldChooseDifficulty ? (
              <View className="mt-3 gap-2">
                {difficultyOptions.map((difficulty) => {
                  const isSelected = selectedDifficulty === difficulty;
                  const optionLabel =
                    difficulty === "easy"
                      ? text.difficultyEasy
                      : difficulty === "hard"
                        ? text.difficultyHard
                        : text.difficultyMedium;
                  const optionDescription =
                    resolveDifficultyDescription(difficulty);

                  return (
                    <Pressable
                      key={`prestart-difficulty-${difficulty}`}
                      className="rounded-xl border px-3 py-2 active:opacity-90"
                      style={{
                        borderColor: isSelected ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                        backgroundColor: isSelected ? EXPEDITION_THEME.accent : EXPEDITION_THEME.panelStrong,
                      }}
                      onPress={() => setSelectedDifficulty(difficulty)}
                      disabled={isStarting}
                    >
                      <Text
                        className="font-semibold"
                        style={{
                          color: isSelected ? accentButtonTextColor : EXPEDITION_THEME.textPrimary,
                          fontSize: adaptiveLayout.fs(isTabletLayout ? 16 : 13, 12, 20),
                        }}
                      >
                        {optionLabel}
                      </Text>
                      <Text
                        style={{
                          color: isSelected ? accentButtonTextColor : EXPEDITION_THEME.textMuted,
                          fontSize: adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 16),
                        }}
                      >
                        {optionDescription}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

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
              opacity: canStart ? 1 : 0.55,
            }}
            onPress={() => onStart(supportsDifficulty ? effectiveDifficulty : undefined)}
            disabled={!canStart}
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
