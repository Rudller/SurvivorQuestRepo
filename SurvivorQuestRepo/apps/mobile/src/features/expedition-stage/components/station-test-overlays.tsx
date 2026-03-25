import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../model/types";

export type StationTestType = "quiz" | "time" | "points";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  completionCodeInputMode?: "numeric" | "alphanumeric";
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
  quizFailed?: boolean;
  startedAt: string | null;
};

type StationTestMenuOverlayProps = {
  visible: boolean;
  stations: StationTestViewModel[];
  onClose: () => void;
  onEnterStation: (stationId: string) => void;
  onOpenWelcomeScreen: () => void;
};

type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
  onRequestClose?: () => void;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string) => Promise<string | null>;
  onQuizFailed?: (stationId: string) => void;
  onQuizPassed?: (stationId: string) => void;
};

type QuizPrestartOverlayProps = {
  visible: boolean;
  stationName: string | null;
  stationType?: StationTestType;
  isStarting?: boolean;
  onStart: () => void;
  onClose: () => void;
};

function getStatusLabel(status: ExpeditionTaskStatus, quizFailed = false) {
  if (quizFailed && status !== "done") {
    return "Niezaliczone";
  }

  if (status === "done") {
    return "Ukończone";
  }

  if (status === "in-progress") {
    return "W trakcie";
  }

  return "Do zrobienia";
}

function getStatusColor(status: ExpeditionTaskStatus, quizFailed = false) {
  if (quizFailed && status !== "done") {
    return "#fca5a5";
  }

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

const NUMERIC_PINPAD_LAYOUT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "backspace", "0", "submit"] as const;
const NUMERIC_PINPAD_SUBLABELS: Record<string, string> = {
  "0": "+",
  "1": "",
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

const QUIZ_BRAIN_ICON_URI = "https://cdn-icons-png.flaticon.com/512/5677/5677920.png";
const INVALID_COMPLETION_CODE_MARKERS = ["invalid completion code", "http 400"];

function isInvalidCompletionCodeErrorMessage(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return INVALID_COMPLETION_CODE_MARKERS.some((marker) => normalized.includes(marker));
}

export function StationTestMenuOverlay({
  visible,
  stations,
  onClose,
  onEnterStation,
  onOpenWelcomeScreen,
}: StationTestMenuOverlayProps) {
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
              Menu testowe
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Lista pobrana z panelu admina dla aktywnej realizacji.
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

        <Pressable
          className="mt-3 rounded-xl border px-3 py-2 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
          onPress={onOpenWelcomeScreen}
        >
          <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
            Pokaż Welcome Screen
          </Text>
        </Pressable>

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
                    <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status, Boolean(station.quizFailed)) }}>
                      Status: {getStatusLabel(station.status, Boolean(station.quizFailed))}
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

type WelcomePreviewOverlayProps = {
  visible: boolean;
  introText?: string;
  onClose: () => void;
};

export function WelcomePreviewOverlay({ visible, introText, onClose }: WelcomePreviewOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 items-center justify-center px-4" style={{ backgroundColor: "rgba(15, 25, 20, 0.78)" }}>
      <View
        className="w-full max-w-[560px] rounded-3xl border p-5"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
          Tekst wstępu
        </Text>
        <Text className="mt-3 text-sm leading-6" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {introText?.trim() || "Brak tekstu wstępu dla tej realizacji."}
        </Text>

        <Pressable
          className="mt-4 rounded-xl border px-3 py-2 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
          onPress={onClose}
        >
          <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            Zamknij
          </Text>
        </Pressable>
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

export function QuizPrestartOverlay({
  visible,
  stationName,
  stationType = "quiz",
  isStarting = false,
  onStart,
  onClose,
}: QuizPrestartOverlayProps) {
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
  const prestartBadge = stationType === "time" ? "Na czas" : "Quiz";
  const prestartTitle =
    stationType === "time"
      ? "Za chwilę zostanie uruchomione zadanie czasowe"
      : "Za chwilę zostanie uruchomiony quiz";
  const prestartDescription =
    stationType === "time"
      ? "Przygotuj się. Po starcie od razu ruszy licznik czasu."
      : "Przygotuj się na odpowiedzenie na pytania.";

  return (
    <Animated.View className="absolute inset-0 z-50 items-center justify-center px-3" style={[{ backgroundColor: "rgba(15, 25, 20, 0.88)" }, backdropStyle]}>
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

export function StationPreviewOverlay({
  station: stationProp,
  onClose,
  onRequestClose,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
}: StationPreviewOverlayProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [quizIconLoadFailed, setQuizIconLoadFailed] = useState(false);
  const [isSubmittingQuizAnswer, setIsSubmittingQuizAnswer] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isCodeInputInvalid, setIsCodeInputInvalid] = useState(false);
  const [isCodeInputSuccess, setIsCodeInputSuccess] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayedStation, setDisplayedStation] = useState<StationTestViewModel | null>(stationProp);
  const [isOverlayMounted, setIsOverlayMounted] = useState(Boolean(stationProp));
  const overlaySlideAnimation = useRef(new Animated.Value(stationProp ? 1 : 0)).current;
  const quizFeedbackAnimation = useRef(new Animated.Value(0)).current;
  const timerPulseAnimation = useRef(new Animated.Value(0)).current;
  const codeInputShakeAnimation = useRef(new Animated.Value(0)).current;
  const codeInputResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutPopupShownRef = useRef(false);
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
    setQuizSubmitError(null);
    setImageLoadFailed(false);
    setQuizIconLoadFailed(false);
    setIsSubmittingQuizAnswer(false);
    setIsSubmittingCode(false);
    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(false);
    setNowMs(Date.now());
    quizFeedbackAnimation.setValue(0);
    timerPulseAnimation.setValue(0);
    codeInputShakeAnimation.setValue(0);
    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
      codeInputResetTimeoutRef.current = null;
    }
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
      codeInputSuccessTimeoutRef.current = null;
    }
    timerPulseLoopRef.current?.stop();
    timeoutPopupShownRef.current = false;
  }, [codeInputShakeAnimation, displayedStation?.stationId, quizFeedbackAnimation, timerPulseAnimation]);

  useEffect(() => {
    return () => {
      if (codeInputResetTimeoutRef.current) {
        clearTimeout(codeInputResetTimeoutRef.current);
        codeInputResetTimeoutRef.current = null;
      }
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
        codeInputSuccessTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done"
    ) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      const msToNextSecond = 1000 - (now % 1000);
      timeout = setTimeout(tick, Math.max(40, msToNextSecond + 12));
    };

    tick();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [displayedStation]);

  const remainingTimeSeconds = (() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0
    ) {
      return null;
    }

    const startedMs = new Date(displayedStation.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const endsAtMs = startedMs + displayedStation.timeLimitSeconds * 1000;
    const remainingMs = Math.max(0, endsAtMs - nowMs);
    return Math.max(0, Math.ceil(remainingMs / 1000));
  })();
  const finalTenSecondsProgress =
    remainingTimeSeconds !== null && remainingTimeSeconds <= 10 ? clamp01((10 - remainingTimeSeconds) / 10) : 0;
  const isUrgentPulse = remainingTimeSeconds !== null && remainingTimeSeconds <= 10;
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

    const pulseDuration = isUrgentPulse ? 220 : 620;
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
    hasCountdownForPulse,
    hasTimerStartedForPulse,
    isUrgentPulse,
    isOverlayMounted,
    stationStatusForPulse,
    timerPulseAnimation,
  ]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "quiz") {
      return;
    }

    if (!displayedStation.startedAt || displayedStation.timeLimitSeconds <= 0 || displayedStation.status === "done") {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    if (selectedQuizOption !== null || isSubmittingQuizAnswer || timeoutPopupShownRef.current) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onQuizFailed?.(displayedStation.stationId);
    Alert.alert("Nieodpowiedziano na pytanie", "Czas na quiz minął. Zadanie nie zostało zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  }, [
    displayedStation,
    isSubmittingQuizAnswer,
    onClose,
    onQuizFailed,
    remainingTimeSeconds,
    selectedQuizOption,
  ]);

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;

  const isQuizStation = station.stationType === "quiz";
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const isTimeStation = station.stationType === "time";
  const isNumericCodeStation =
    requiresCode && station.completionCodeInputMode === "numeric";
  const normalizedImageUrl = station.imageUrl?.trim() || "";
  const isDicebearFallback = normalizedImageUrl.includes("api.dicebear.com/9.x/shapes/svg");
  const shouldShowQuizFallbackGraphic =
    isQuizStation && (imageLoadFailed || !normalizedImageUrl || isDicebearFallback);
  const stationImageUri = shouldShowQuizFallbackGraphic ? undefined : normalizedImageUrl || undefined;
  const stationDescription = station.description.trim();
  const stationMediaHeight = (() => {
    if (isNumericCodeStation) {
      return Math.max(104, Math.round(viewportHeight * 0.14));
    }
    if (requiresCode) {
      return Math.max(128, Math.round(viewportHeight * 0.2));
    }
    return Math.max(190, Math.round(viewportHeight * 0.33));
  })();
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
  const shouldShowExecutionTimer = executionTimeLabel.trim().length > 0;
  const isCodeActionDisabled =
    station.status === "done" || isSubmittingCode || isCodeInputSuccess || (isTimeStation && !hasTimerStarted);
  const codeInputShakeStyle = {
    transform: [{ translateX: codeInputShakeAnimation }],
  } as const;
  const triggerInvalidCodeFeedback = () => {
    setIsCodeInputInvalid(true);
    codeInputShakeAnimation.stopAnimation();
    codeInputShakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(codeInputShakeAnimation, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();

    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
    }
    codeInputResetTimeoutRef.current = setTimeout(() => {
      setIsCodeInputInvalid(false);
      codeInputResetTimeoutRef.current = null;
    }, 1000);
  };
  const submitVerificationCode = async () => {
    if (!verificationCode.trim()) {
      setCodeResult("Wpisz kod, aby zatwierdzić stanowisko.");
      return;
    }

    if (!onCompleteTask) {
      setIsCodeInputInvalid(false);
      setIsCodeInputSuccess(true);
      setCodeResult("Kod zatwierdzony (tryb testowy).");
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
      }
      codeInputSuccessTimeoutRef.current = setTimeout(() => {
        codeInputSuccessTimeoutRef.current = null;
        onClose();
      }, 5000);
      return;
    }

    setIsSubmittingCode(true);
    const error = await onCompleteTask(station.stationId, verificationCode, station.startedAt ?? undefined);
    setIsSubmittingCode(false);

    if (error) {
      if (isInvalidCompletionCodeErrorMessage(error)) {
        setCodeResult(null);
        triggerInvalidCodeFeedback();
        return;
      }
      setCodeResult(error);
      return;
    }

    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(true);
    setCodeResult("Kod zatwierdzony.");
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
    }
    codeInputSuccessTimeoutRef.current = setTimeout(() => {
      codeInputSuccessTimeoutRef.current = null;
      onClose();
    }, 5000);
  };
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
                <Text
                  className="text-[11px] uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {`${station.name} • ${station.typeLabel}`}
                </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={onRequestClose ?? onClose}
            >
              <Text
                className="text-base font-semibold text-center"
                style={{ color: EXPEDITION_THEME.textPrimary, lineHeight: 16, includeFontPadding: false }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 px-4">
            <View className="flex-1">
              <View
                className={`${isNumericCodeStation ? "mt-0.5" : "mt-1"} w-full overflow-hidden rounded-2xl border`}
                style={{
                  ...(requiresCode
                    ? { flex: 1, minHeight: Math.max(140, Math.round(viewportHeight * 0.24)) }
                    : { height: stationMediaHeight }),
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

              {requiresCode ? (
                <View
                  className="my-3 px-1"
                >
                  <Text
                    className="text-base leading-6"
                    style={{ color: EXPEDITION_THEME.textMuted, textAlign: "justify" }}
                  >
                    {stationDescription.length > 0
                      ? stationDescription
                      : "Opis zadania nie został jeszcze dodany."}
                  </Text>
                </View>
              ) : stationDescription.length > 0 ? (
                <Text
                  className={`${isNumericCodeStation ? "mt-2" : "mt-3"} text-sm leading-5`}
                  style={{ color: EXPEDITION_THEME.textMuted }}
                >
                  {stationDescription}
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
                          if (selectedQuizOption !== null || isSubmittingQuizAnswer) {
                            return;
                          }

                          setSelectedQuizOption(index);
                          setQuizSubmitError(null);
                          const correct = station.quizCorrectAnswerIndex === index;
                          setQuizResult(correct ? "Dobra odpowiedź" : "Zła odpowiedź");
                          quizFeedbackAnimation.setValue(0);
                          Animated.timing(quizFeedbackAnimation, {
                            toValue: 1,
                            duration: 260,
                            useNativeDriver: true,
                          }).start();
                          if (!correct) {
                            onQuizFailed?.(station.stationId);
                            Alert.alert("Nie zaliczono", "Wybrano nieprawidłową odpowiedź.", [
                              {
                                text: "Wróć do mapy",
                                onPress: onClose,
                              },
                            ]);
                            return;
                          }

                          if (!onCompleteTask) {
                            onQuizPassed?.(station.stationId);
                            Alert.alert("Zaliczono", "Poprawna odpowiedź. Zadanie zaliczone.", [
                              {
                                text: "Wróć do mapy",
                                onPress: onClose,
                              },
                            ]);
                            return;
                          }

                          setIsSubmittingQuizAnswer(true);
                          void onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined)
                            .then((error) => {
                              if (error) {
                                setQuizSubmitError(error);
                                Alert.alert("Błąd", error);
                                return;
                              }
                              onQuizPassed?.(station.stationId);
                              Alert.alert("Zaliczono", "Poprawna odpowiedź. Zadanie zaliczone.", [
                                {
                                  text: "Wróć do mapy",
                                  onPress: onClose,
                                },
                              ]);
                            })
                            .finally(() => {
                              setIsSubmittingQuizAnswer(false);
                            });
                        }}
                        disabled={selectedQuizOption !== null || isSubmittingQuizAnswer}
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

                {quizSubmitError ? (
                  <Text className="mt-2 text-center text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                    {quizSubmitError}
                  </Text>
                ) : null}
                </View>
              ) : null}
            </View>

            {requiresCode ? (
              <View
                className={`${isNumericCodeStation ? "mt-2" : "mt-3"} rounded-2xl border px-3 ${isNumericCodeStation ? "py-2" : "py-3"}`}
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                {station.completionCodeInputMode === "numeric" ? (
                  <View className={isNumericCodeStation ? "mt-1" : "mt-2"}>
                    <View className="items-center">
                      <Animated.View
                        className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} w-full max-w-[320px] rounded-2xl border px-4 ${isNumericCodeStation ? "py-2.5" : "py-3"}`}
                        style={[
                          codeInputShakeStyle,
                            {
                             borderColor: isCodeInputSuccess
                               ? "#34d399"
                               : isCodeInputInvalid
                                 ? EXPEDITION_THEME.danger
                                 : EXPEDITION_THEME.border,
                             backgroundColor: isCodeInputSuccess
                               ? "rgba(52, 211, 153, 0.2)"
                               : isCodeInputInvalid
                                 ? "rgba(239, 111, 108, 0.16)"
                                 : EXPEDITION_THEME.panelStrong,
                           },
                         ]}
                       >
                        <Text
                          className="text-center text-2xl font-semibold tracking-[0.35em]"
                          style={{ color: EXPEDITION_THEME.textPrimary }}
                          numberOfLines={1}
                        >
                          {verificationCode || "• • • •"}
                        </Text>
                      </Animated.View>
                    </View>

                    <View className={`mx-auto ${isNumericCodeStation ? "mt-2" : "mt-3"} w-full max-w-[320px] flex-row flex-wrap justify-between gap-y-2`}>
                      {NUMERIC_PINPAD_LAYOUT.map((key) => {
                        const isBackspaceKey = key === "backspace";
                        const isSubmitKey = key === "submit";
                        const isDisabled =
                          isCodeActionDisabled ||
                          (isBackspaceKey && verificationCode.length === 0);
                        const label = isBackspaceKey ? "⌫" : isSubmitKey ? "OK" : key;
                        const isDigitKey = /^\d$/.test(label);
                        const sublabel = isDigitKey ? NUMERIC_PINPAD_SUBLABELS[label] : "";

                        return (
                          <Pressable
                            key={`${station.stationId}-pin-${key}`}
                            className="items-center justify-center rounded-full active:opacity-85"
                            style={{
                              width: "31%",
                              aspectRatio: 1,
                              borderWidth: 1,
                              borderColor: EXPEDITION_THEME.border,
                              backgroundColor: isSubmitKey
                                ? isDisabled
                                  ? EXPEDITION_THEME.panelStrong
                                  : EXPEDITION_THEME.accent
                                : EXPEDITION_THEME.panelStrong,
                              opacity: isDisabled ? 0.45 : 1,
                            }}
                            disabled={isDisabled}
                        onPress={() => {
                          if (isBackspaceKey) {
                            setVerificationCode((current) => current.slice(0, -1));
                            setIsCodeInputInvalid(false);
                            setIsCodeInputSuccess(false);
                            setCodeResult(null);
                            return;
                          }
                              if (isSubmitKey) {
                                void submitVerificationCode();
                                return;
                              }

                              setVerificationCode((current) => {
                                const nextValue = `${current}${key}`;
                                return nextValue.slice(0, 32);
                              });
                              setIsCodeInputInvalid(false);
                              setIsCodeInputSuccess(false);
                              setCodeResult(null);
                            }}
                          >
                            {isDigitKey ? (
                              <View className="h-full w-full items-center justify-center">
                                <Text
                                  className="text-[30px] font-medium text-center"
                                  style={{
                                    color: EXPEDITION_THEME.textPrimary,
                                    textAlign: "center",
                                    fontVariant: ["tabular-nums"],
                                  }}
                                >
                                  {label}
                                </Text>
                                <Text
                                  className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                                  style={{ color: EXPEDITION_THEME.textSubtle }}
                                >
                                  {sublabel}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                className={`${isSubmitKey ? "text-xl" : "text-base"} font-semibold text-center`}
                                style={{
                                  color: isSubmitKey ? "#09090b" : EXPEDITION_THEME.textPrimary,
                                  width: "100%",
                                  textAlign: "center",
                                  textAlignVertical: "center",
                                }}
                              >
                                {label}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Animated.View style={codeInputShakeStyle}>
                    <TextInput
                      className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} rounded-xl border px-3 py-2 text-sm`}
                      style={{
                         borderColor: isCodeInputSuccess
                           ? "#34d399"
                           : isCodeInputInvalid
                             ? EXPEDITION_THEME.danger
                             : EXPEDITION_THEME.border,
                         backgroundColor: isCodeInputSuccess
                           ? "rgba(52, 211, 153, 0.2)"
                           : isCodeInputInvalid
                             ? "rgba(239, 111, 108, 0.16)"
                             : EXPEDITION_THEME.panelStrong,
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
                        setIsCodeInputInvalid(false);
                        setIsCodeInputSuccess(false);
                        setCodeResult(null);
                      }}
                    />
                  </Animated.View>
                )}

                {station.completionCodeInputMode !== "numeric" ? (
                  <Pressable
                    className={`${isNumericCodeStation ? "mt-2" : "mt-3"} items-center rounded-xl py-2.5 active:opacity-90`}
                    style={{
                      backgroundColor: isCodeActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
                    }}
                    disabled={isCodeActionDisabled}
                    onPress={() => {
                      void submitVerificationCode();
                    }}
                  >
                    <Text className="text-sm font-semibold text-zinc-950">
                      {isSubmittingCode ? "Zatwierdzanie..." : "Zatwierdź kod"}
                    </Text>
                  </Pressable>
                ) : null}

                {codeResult && !isInvalidCompletionCodeErrorMessage(codeResult) ? (
                  <Text className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} text-xs`} style={{ color: EXPEDITION_THEME.textMuted }}>
                    {codeResult}
                  </Text>
                ) : null}
              </View>
            ) : null}

          </View>

          <View className={`px-4 ${isNumericCodeStation ? "pb-3 pt-1" : "pb-4 pt-2"}`}>
            <View className="flex-row items-end">
              <View className="flex-1" />

              {shouldShowExecutionTimer ? (
                <View className="items-center px-4 py-2">
                  <Animated.Text
                    className={`text-center ${isNumericCodeStation ? "text-5xl" : "text-6xl"} font-extrabold`}
                    style={[{ color: timerTextColor }, timerPulseStyle]}
                  >
                    {executionTimeLabel}
                  </Animated.Text>
                  <Text
                    className="mt-1 text-center text-[10px] uppercase tracking-widest"
                    style={{ color: EXPEDITION_THEME.textSubtle }}
                  >
                    Czas do ukończenia zadania
                  </Text>
                </View>
              ) : null}

              <View className="flex-1 items-end">
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
          </View>

        </View>
      </Animated.View>
    </Animated.View>
  );
}
