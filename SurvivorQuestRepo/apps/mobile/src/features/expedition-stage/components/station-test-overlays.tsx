import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../model/types";

export type StationTestType = "quiz" | "time" | "points";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  name: string;
  typeLabel: string;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  timeLimitLabel: string;
  quizQuestion?: string;
  quizAnswers?: [string, string, string, string];
  quizCorrectAnswerIndex?: number;
  status: ExpeditionTaskStatus;
  startedAt: string | null;
};

type StationTestMenuOverlayProps = {
  visible: boolean;
  stations: StationTestViewModel[];
  onClose: () => void;
  onEnterStation: (stationId: string) => void;
};

type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
  onStartTask?: (stationId: string) => Promise<string | null>;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string) => Promise<string | null>;
};

type QuizPrestartOverlayProps = {
  visible: boolean;
  stationName: string | null;
  isStarting?: boolean;
  onStart: () => void;
  onClose: () => void;
};

function getStatusLabel(status: ExpeditionTaskStatus) {
  if (status === "done") {
    return "Ukończone";
  }

  if (status === "in-progress") {
    return "W trakcie";
  }

  return "Do zrobienia";
}

function getStatusColor(status: ExpeditionTaskStatus) {
  if (status === "done") {
    return "#34d399";
  }

  if (status === "in-progress") {
    return "#fbbf24";
  }

  return EXPEDITION_THEME.textMuted;
}

function getCodePlaceholder(stationType: StationTestType) {
  return stationType === "time" ? "np. TIME-2048" : "np. POINTS-2048";
}

const QUIZ_BRAIN_ICON_URI = "https://cdn-icons-png.flaticon.com/512/5677/5677920.png";

export function StationTestMenuOverlay({ visible, stations, onClose, onEnterStation }: StationTestMenuOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-40 items-center justify-center px-4" style={{ backgroundColor: "rgba(15, 25, 20, 0.78)" }}>
      <View
        className="w-full max-w-[560px] rounded-3xl border p-4"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Menu testowe stanowisk
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Lista pobrana z panelu admina + dodatkowe stanowiska testowe mobile.
            </Text>
          </View>
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full border active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              ✕
            </Text>
          </Pressable>
        </View>

        <ScrollView className="mt-3" style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View className="gap-2">
            {stations.length === 0 ? (
              <View
                className="rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Brak stanowisk. Dodaj je w panelu admina.
                </Text>
              </View>
            ) : (
              stations.map((station) => (
                <View
                  key={station.stationId}
                  className="rounded-2xl border px-3 py-2"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {station.name}
                      </Text>
                      <Text className="mt-0.5 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        {station.typeLabel}
                      </Text>
                    </View>
                    <Pressable
                      className="rounded-full px-3 py-1.5 active:opacity-90"
                      style={{ backgroundColor: EXPEDITION_THEME.accent }}
                      onPress={() => onEnterStation(station.stationId)}
                    >
                      <Text className="text-xs font-semibold text-zinc-950">Wejdź</Text>
                    </Pressable>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status) }}>
                    Status: {getStatusLabel(station.status)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function formatRemainingTimeLabel(seconds: number) {
  if (seconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0] + normalized[0], 16);
    const g = Number.parseInt(normalized[1] + normalized[1], 16);
    const b = Number.parseInt(normalized[2] + normalized[2], 16);
    return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b };
  }

  if (normalized.length !== 6) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) ? null : { r, g, b };
}

function blendHexColors(from: string, to: string, ratio: number) {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  const t = clamp01(ratio);

  if (!fromRgb || !toRgb) {
    return t >= 0.5 ? to : from;
  }

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * t);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * t);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function QuizPrestartOverlay({ visible, stationName, isStarting = false, onStart, onClose }: QuizPrestartOverlayProps) {
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

  return (
    <Animated.View className="absolute inset-0 z-50 items-center justify-end px-3 pb-5" style={[{ backgroundColor: "rgba(15, 25, 20, 0.88)" }, backdropStyle]}>
      <Animated.View
        className="w-full max-w-[560px] rounded-3xl border px-4 py-4"
        style={[{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }, panelStyle]}
      >
        <Text className="text-center text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          Quiz
        </Text>
        <Text className="mt-2 text-center text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          Za chwilę zostanie uruchomiony quiz
        </Text>
        <Text className="mt-2 text-center text-sm leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
          Przygotuj się na odpowiedzenie na pytania.
          {displayStationName ? ` Stanowisko: ${displayStationName}.` : ""}
        </Text>

        <View className="mt-4 flex-row gap-2">
          <Pressable
            className="flex-1 items-center rounded-xl border px-3 py-2.5 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textMuted }}>
              Zamknij
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-xl px-3 py-2.5 active:opacity-90"
            style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: isStarting ? 0.7 : 1 }}
            onPress={onStart}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold text-zinc-950">{isStarting ? "Uruchamianie..." : "Start"}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function StationPreviewOverlay({ station: stationProp, onClose, onStartTask, onCompleteTask }: StationPreviewOverlayProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [quizIconLoadFailed, setQuizIconLoadFailed] = useState(false);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayedStation, setDisplayedStation] = useState<StationTestViewModel | null>(stationProp);
  const [isOverlayMounted, setIsOverlayMounted] = useState(Boolean(stationProp));
  const overlaySlideAnimation = useRef(new Animated.Value(stationProp ? 1 : 0)).current;
  const quizFeedbackAnimation = useRef(new Animated.Value(0)).current;
  const timerPulseAnimation = useRef(new Animated.Value(0)).current;
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const quizOptions = useMemo(
    () =>
      displayedStation?.quizAnswers ?? [
        "Sprawdzam komunikację i plan zespołu.",
        "Działam bez konsultacji z drużyną.",
        "Ignoruję zasady bezpieczeństwa.",
        "Rozdzielam zespół i tracę kontakt.",
      ],
    [displayedStation?.quizAnswers],
  );

  useEffect(() => {
    if (stationProp) {
      setDisplayedStation(stationProp);
      setIsOverlayMounted(true);
      overlaySlideAnimation.stopAnimation();
      Animated.timing(overlaySlideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    overlaySlideAnimation.stopAnimation();
    Animated.timing(overlaySlideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsOverlayMounted(false);
        setDisplayedStation(null);
      }
    });
  }, [overlaySlideAnimation, stationProp]);

  useEffect(() => {
    setSelectedQuizOption(null);
    setQuizResult(null);
    setVerificationCode("");
    setCodeResult(null);
    setImageLoadFailed(false);
    setQuizIconLoadFailed(false);
    setIsStartingTask(false);
    setIsSubmittingCode(false);
    setNowMs(Date.now());
    quizFeedbackAnimation.setValue(0);
    timerPulseAnimation.setValue(0);
    timerPulseLoopRef.current?.stop();
  }, [displayedStation?.stationId, quizFeedbackAnimation, timerPulseAnimation]);

  useEffect(() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done"
    ) {
      return;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [displayedStation]);

  const remainingTimeSeconds = (() => {
    if (
      !displayedStation ||
      displayedStation.stationType !== "time" ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0
    ) {
      return null;
    }

    const startedMs = new Date(displayedStation.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const elapsedSeconds = Math.max(0, Math.round((nowMs - startedMs) / 1000));
    return Math.max(0, displayedStation.timeLimitSeconds - elapsedSeconds);
  })();
  const finalTenSecondsProgress =
    remainingTimeSeconds !== null && remainingTimeSeconds <= 10 ? clamp01((10 - remainingTimeSeconds) / 10) : 0;
  const hasCountdownForPulse = Boolean(
    displayedStation?.startedAt &&
      displayedStation.timeLimitSeconds > 0 &&
      displayedStation.status !== "done",
  );
  const hasTimerStartedForPulse = Boolean(displayedStation?.startedAt);
  const stationStatusForPulse = displayedStation?.status;

  useEffect(() => {
    timerPulseLoopRef.current?.stop();
    timerPulseAnimation.setValue(0);

    if (
      !isOverlayMounted ||
      !hasCountdownForPulse ||
      !hasTimerStartedForPulse ||
      stationStatusForPulse === "done" ||
      remainingTimeSeconds === null
    ) {
      return;
    }

    const pulseDuration =
      remainingTimeSeconds <= 10
        ? Math.max(160, 340 - Math.round(finalTenSecondsProgress * 180))
        : 620;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulseAnimation, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulseAnimation, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ]),
    );

    timerPulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    finalTenSecondsProgress,
    hasCountdownForPulse,
    hasTimerStartedForPulse,
    isOverlayMounted,
    remainingTimeSeconds,
    stationStatusForPulse,
    timerPulseAnimation,
  ]);

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;

  const isQuizStation = station.stationType === "quiz";
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const isTimeStation = station.stationType === "time";
  const normalizedImageUrl = station.imageUrl?.trim() || "";
  const isDicebearFallback = normalizedImageUrl.includes("api.dicebear.com/9.x/shapes/svg");
  const shouldShowQuizFallbackGraphic =
    isQuizStation && (imageLoadFailed || !normalizedImageUrl || isDicebearFallback);
  const stationImageUri = shouldShowQuizFallbackGraphic ? undefined : normalizedImageUrl || undefined;
  const stationMediaHeight = Math.max(190, Math.round(viewportHeight * 0.33));
  const hasTimerStarted = Boolean(station.startedAt);
  const hasQuizAnswer = selectedQuizOption !== null;
  const feedbackTone =
    hasQuizAnswer && station.quizCorrectAnswerIndex === selectedQuizOption ? "success" : hasQuizAnswer ? "error" : null;
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
  const remainingTimeLabel = remainingTimeSeconds !== null ? formatRemainingTimeLabel(remainingTimeSeconds) : null;
  const timerScalePeak = 1.04 + finalTenSecondsProgress * 0.14;
  const timerMinOpacity = 0.94 - finalTenSecondsProgress * 0.18;
  const timerTextColor =
    hasTimerStarted && station.timeLimitSeconds > 0
      ? blendHexColors(EXPEDITION_THEME.textPrimary, EXPEDITION_THEME.danger, finalTenSecondsProgress)
      : EXPEDITION_THEME.textPrimary;
  const timerPulseStyle =
    hasTimerStarted && station.timeLimitSeconds > 0 && remainingTimeSeconds !== null
      ? ({
          opacity: timerPulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [timerMinOpacity, 1],
          }),
          transform: [
            {
              scale: timerPulseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, timerScalePeak],
              }),
            },
          ],
        } as const)
      : undefined;
  const executionTimeLabel = remainingTimeLabel ?? station.timeLimitLabel;
  const overlayBackdropStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const overlayPanelStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        translateY: overlaySlideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [160, 0],
        }),
      },
    ],
  } as const;

  return (
    <Animated.View className="absolute inset-0 z-50" style={[{ backgroundColor: "rgba(15, 25, 20, 0.9)" }, overlayBackdropStyle]}>
      <Animated.View className="flex-1 px-3 pb-5 pt-9" style={overlayPanelStyle}>
        <View className="flex-1 rounded-3xl border" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}>
          <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                {isQuizStation ? "Quiz" : "Stanowisko"}
              </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={onClose}
            >
              <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 132 }} showsVerticalScrollIndicator={false}>
            <View
              className="mt-1 w-full overflow-hidden rounded-2xl border"
              style={{
                height: stationMediaHeight,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelMuted,
              }}
            >
              {shouldShowQuizFallbackGraphic ? (
                <View className="flex-1 items-center justify-center">
                  {!quizIconLoadFailed ? (
                    <Image
                      source={{ uri: QUIZ_BRAIN_ICON_URI }}
                      style={{ width: "62%", height: "62%", tintColor: "#ffffff" }}
                      resizeMode="contain"
                      onError={() => setQuizIconLoadFailed(true)}
                    />
                  ) : (
                    <Text className="text-4xl">🧠</Text>
                  )}
                </View>
              ) : stationImageUri ? (
                <Image
                  source={{ uri: stationImageUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-3xl">📍</Text>
                </View>
              )}
            </View>

            <View className="mt-3 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {station.name}
              </Text>
              <View className="rounded-full border px-3 py-1" style={{ borderColor: EXPEDITION_THEME.border }}>
                <Text className="text-[11px]" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {station.typeLabel}
                </Text>
              </View>
            </View>

            {station.description.trim().length > 0 ? (
              <Text className="mt-2 text-sm leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
                {station.description}
              </Text>
            ) : null}

            {isQuizStation ? (
              <View
                className="mt-3 rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {station.quizQuestion?.trim() || "Quiz: wybierz jedną z 4 odpowiedzi"}
                </Text>
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
                          if (selectedQuizOption !== null) {
                            return;
                          }

                          setSelectedQuizOption(index);
                          const correct = station.quizCorrectAnswerIndex === index;
                          setQuizResult(correct ? "Dobra odpowiedź" : "Zła odpowiedź");
                          quizFeedbackAnimation.setValue(0);
                          Animated.timing(quizFeedbackAnimation, {
                            toValue: 1,
                            duration: 260,
                            useNativeDriver: true,
                          }).start();
                        }}
                        disabled={selectedQuizOption !== null}
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
              </View>
            ) : null}

            {requiresCode ? (
              <View
                className="mt-3 rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {station.stationType === "time" ? "Time: potwierdź wykonanie kodem" : "Points: potwierdź wynik kodem"}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Wpisz kod i zatwierdź stanowisko.
                </Text>

                {isTimeStation && station.status !== "done" ? (
                  <Pressable
                    className="mt-2 items-center rounded-xl py-2.5 active:opacity-90"
                    style={{ backgroundColor: hasTimerStarted ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent }}
                    disabled={hasTimerStarted || isStartingTask}
                    onPress={async () => {
                      if (!onStartTask) {
                        setCodeResult("Start timera dostępny po podpięciu API.");
                        return;
                      }

                      setIsStartingTask(true);
                      const error = await onStartTask(station.stationId);
                      setIsStartingTask(false);

                      if (error) {
                        setCodeResult(error);
                        return;
                      }

                      setCodeResult("Licznik zadania uruchomiony.");
                    }}
                  >
                    <Text className="text-sm font-semibold text-zinc-950">
                      {hasTimerStarted ? "Licznik uruchomiony" : isStartingTask ? "Uruchamianie..." : "Start zadania"}
                    </Text>
                  </Pressable>
                ) : null}

                <TextInput
                  className="mt-2 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelStrong,
                    color: EXPEDITION_THEME.textPrimary,
                  }}
                  placeholder={getCodePlaceholder(station.stationType)}
                  placeholderTextColor={EXPEDITION_THEME.textSubtle}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={verificationCode}
                  editable={station.status !== "done" && (!isTimeStation || hasTimerStarted)}
                  onChangeText={(value) => {
                    setVerificationCode(value);
                    setCodeResult(null);
                  }}
                />

                <Pressable
                  className="mt-3 items-center rounded-xl py-2.5 active:opacity-90"
                  style={{
                    backgroundColor:
                      station.status === "done" || (isTimeStation && !hasTimerStarted)
                        ? EXPEDITION_THEME.panelStrong
                        : EXPEDITION_THEME.accent,
                  }}
                  disabled={station.status === "done" || isSubmittingCode || (isTimeStation && !hasTimerStarted)}
                  onPress={async () => {
                    if (!verificationCode.trim()) {
                      setCodeResult("Wpisz kod, aby zatwierdzić stanowisko.");
                      return;
                    }

                    if (!onCompleteTask) {
                      setCodeResult("Kod zatwierdzony (tryb testowy).");
                      return;
                    }

                    setIsSubmittingCode(true);
                    const error = await onCompleteTask(station.stationId, verificationCode, station.startedAt ?? undefined);
                    setIsSubmittingCode(false);

                    if (error) {
                      setCodeResult(error);
                      return;
                    }

                    setCodeResult("Kod zatwierdzony.");
                  }}
                >
                  <Text className="text-sm font-semibold text-zinc-950">
                    {isSubmittingCode ? "Zatwierdzanie..." : "Zatwierdź kod"}
                  </Text>
                </Pressable>

                {codeResult ? (
                  <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                    {codeResult}
                  </Text>
                ) : null}
              </View>
            ) : null}

          </ScrollView>

          <View
            pointerEvents="none"
            style={{ position: "absolute", left: 16, right: 16, bottom: 16, alignItems: "center" }}
          >
            <View className="items-center px-4 py-2">
              <Animated.Text
                className="text-center text-6xl font-extrabold"
                style={[{ color: timerTextColor }, timerPulseStyle]}
              >
                {executionTimeLabel}
              </Animated.Text>
              <Text className="mt-1 text-center text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                Czas do ukończenia zadania
              </Text>
            </View>
          </View>

          <View
            pointerEvents="none"
            style={{ position: "absolute", right: 16, bottom: 16 }}
          >
            <View
              className="rounded-2xl border px-3 py-2"
              style={{ borderColor: "rgba(252, 211, 77, 0.4)", backgroundColor: "rgba(252, 211, 77, 0.1)" }}
            >
              <Text className="text-[10px] uppercase tracking-widest" style={{ color: "#fcd34d" }}>
                Punkty
              </Text>
              <Text className="mt-0.5 text-right text-lg font-extrabold" style={{ color: "#fcd34d" }}>
                {station.points}
              </Text>
            </View>
          </View>

        </View>
      </Animated.View>
    </Animated.View>
  );
}
