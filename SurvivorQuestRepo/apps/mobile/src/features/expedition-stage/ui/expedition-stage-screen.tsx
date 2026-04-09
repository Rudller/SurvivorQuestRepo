import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import type { OnboardingSession } from "../../onboarding/model/types";
import {
  getApiErrorMessage,
} from "../api/mobile-session.api";
import { BottomCountdownPanel } from "../components/bottom-countdown-panel";
import { ExpeditionMap } from "../components/expedition-map";
import { QrScannerOverlay } from "../components/qr-scanner-overlay";
import {
  QuizPrestartOverlay,
  StationPreviewOverlay,
  StationTestMenuOverlay,
  WelcomePreviewOverlay,
  type StationTestType,
  type StationTestViewModel,
} from "../components/station-overlays";
import { TopRealizationPanel } from "../components/top-realization-panel";
import { useExpeditionSession, usePlayerLocation, useRealizationCountdown } from "../hooks";
import { DEFAULT_MAP_ANCHOR } from "../model/station-pin-layout";
import {
  DEFAULT_STATION_PIN_CUSTOMIZATION,
  type ExpeditionStationType,
  resolveDefaultStationPoints,
  type ExpeditionTaskStatus,
  type MapCoordinate,
} from "../model/types";

type ExpeditionStageScreenProps = {
  session: OnboardingSession;
  onSessionInvalid?: (reason?: string) => void;
};

const LOCATION_SYNC_THROTTLE_MS = 10_000;

type TransientPopup = {
  id: number;
  message: string;
  tone: "error" | "success";
};

type DebugOutcomePreview = {
  id: number;
  variant: "success" | "failed";
  message: string;
};
const POPUP_MIN_DURATION_MS = 6_500;
const POPUP_MAX_DURATION_MS = 12_000;
const POPUP_MS_PER_CHAR = 45;

function toCoordinate(latitude: number, longitude: number): MapCoordinate {
  return { latitude, longitude };
}

function toStationCoordinate(latitude?: number, longitude?: number): MapCoordinate | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude: latitude as number,
    longitude: longitude as number,
  };
}

function resolveCoordinateCentroid(coordinates: MapCoordinate[]) {
  if (coordinates.length === 0) {
    return null;
  }

  const sums = coordinates.reduce(
    (accumulator, coordinate) => ({
      latitude: accumulator.latitude + coordinate.latitude,
      longitude: accumulator.longitude + coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: sums.latitude / coordinates.length,
    longitude: sums.longitude / coordinates.length,
  } satisfies MapCoordinate;
}

function resolveStationVisual(stationType: ExpeditionStationType | undefined, status: ExpeditionTaskStatus) {
  if (status === "done") {
    return { icon: "✅", color: "#10b981" };
  }

  if (status === "failed") {
    return { icon: "❌", color: "#ef4444" };
  }

  if (stationType === "time") {
    return { icon: "⏱️", color: "#3b82f6" };
  }

  if (stationType === "points") {
    return { icon: "🎯", color: "#a855f7" };
  }

  if (stationType === "wordle") {
    return { icon: "🔤", color: "#22c55e" };
  }

  if (stationType === "hangman") {
    return { icon: "🪢", color: "#f97316" };
  }

  if (stationType === "mastermind") {
    return { icon: "🧠", color: "#6366f1" };
  }

  if (stationType === "anagram") {
    return { icon: "🔀", color: "#14b8a6" };
  }

  if (stationType === "caesar-cipher") {
    return { icon: "🔐", color: "#0ea5e9" };
  }

  if (stationType === "memory") {
    return { icon: "🃏", color: "#8b5cf6" };
  }

  if (stationType === "simon") {
    return { icon: "🎛️", color: "#ec4899" };
  }

  if (stationType === "rebus") {
    return { icon: "🧩", color: "#f59e0b" };
  }

  if (stationType === "boggle") {
    return { icon: "🔠", color: "#10b981" };
  }

  if (stationType === "mini-sudoku") {
    return { icon: "🔢", color: "#ef4444" };
  }

  if (stationType === "matching") {
    return { icon: "🔗", color: "#22c55e" };
  }

  if (stationType === "audio-quiz") {
    return { icon: "🎧", color: "#06b6d4" };
  }

  if (
    stationType === "quiz" ||
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching"
  ) {
    return { icon: "❓", color: "#f59e0b" };
  }

  return DEFAULT_STATION_PIN_CUSTOMIZATION;
}

function resolveStationLabel(stationId: string, stationName?: string) {
  return stationName?.trim() ? stationName : `Stanowisko ${stationId}`;
}

function resolveStationTypeLabel(stationType?: ExpeditionStationType) {
  if (stationType === "time") {
    return "Na czas";
  }

  if (stationType === "points") {
    return "Na punkty";
  }

  if (stationType === "wordle") {
    return "Wordle";
  }

  if (stationType === "hangman") {
    return "Wisielec";
  }

  if (stationType === "audio-quiz") {
    return "Quiz audio";
  }

  if (stationType === "mastermind") {
    return "Mastermind";
  }

  if (stationType === "anagram") {
    return "Anagram";
  }

  if (stationType === "caesar-cipher") {
    return "Szyfr Cezara";
  }

  if (stationType === "memory") {
    return "Memory";
  }

  if (stationType === "simon") {
    return "Simon";
  }

  if (stationType === "rebus") {
    return "Rebus";
  }

  if (stationType === "boggle") {
    return "Boggle";
  }

  if (stationType === "mini-sudoku") {
    return "Mini Sudoku";
  }

  if (stationType === "matching") {
    return "Łączenie par";
  }

  return "Quiz";
}

function isInteractiveQuizStationType(stationType?: ExpeditionStationType) {
  return (
    stationType === "quiz" ||
    stationType === "audio-quiz" ||
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching"
  );
}

function normalizeStationType(stationType?: ExpeditionStationType): StationTestType {
  if (stationType && (isInteractiveQuizStationType(stationType) || stationType === "time" || stationType === "points")) {
    return stationType;
  }

  return "quiz";
}

function formatTimeLimitLabel(timeLimitSeconds: number) {
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    return "";
  }

  const minutes = Math.floor(timeLimitSeconds / 60);
  const seconds = timeLimitSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isInvalidCompletionCodeError(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return normalized.includes("invalid completion code") || normalized.includes("http 400");
}

function extractStationQrToken(rawValue: string) {
  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  const tokenFromQuery = normalized.match(/(?:^|[?&])token=([^&]+)/i)?.[1];
  if (tokenFromQuery?.trim()) {
    try {
      return decodeURIComponent(tokenFromQuery.trim());
    } catch {
      return tokenFromQuery.trim();
    }
  }

  return normalized;
}

export function ExpeditionStageScreen({ session, onSessionInvalid }: ExpeditionStageScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    sessionState,
    isLoading,
    errorMessage,
    isSessionInvalid,
    sessionInvalidReason,
    startStationTask,
    completeStationTask,
    failStationTask,
    syncTeamLocation,
    resolveStationQrToken,
  } = useExpeditionSession(session);

  const [mapAnchor, setMapAnchor] = useState<MapCoordinate | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isScannerOpening, setIsScannerOpening] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrResolving, setIsQrResolving] = useState(false);
  const [isStationTestMenuOpen, setIsStationTestMenuOpen] = useState(false);
  const [isWelcomePreviewOpen, setIsWelcomePreviewOpen] = useState(false);
  const [activeStationTestId, setActiveStationTestId] = useState<string | null>(null);
  const [pendingQuizStartStationId, setPendingQuizStartStationId] = useState<string | null>(null);
  const [pendingTimeStartStationId, setPendingTimeStartStationId] = useState<string | null>(null);
  const [isStartingPendingQuiz, setIsStartingPendingQuiz] = useState(false);
  const [isStartingPendingTime, setIsStartingPendingTime] = useState(false);
  const [localStartedAtByStationId, setLocalStartedAtByStationId] = useState<Record<string, string>>({});
  const [debugOutcomePreview, setDebugOutcomePreview] = useState<DebugOutcomePreview | null>(null);
  const autoLocationSyncTimestampRef = useRef(0);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transientPopup, setTransientPopup] = useState<TransientPopup | null>(null);
  const lastPopupSourceValuesRef = useRef<{
    errorMessage: string | null;
    locationError: string | null;
    actionError: string | null;
    actionMessage: string | null;
  }>({
    errorMessage: null,
    locationError: null,
    actionError: null,
    actionMessage: null,
  });

  const showTransientPopup = useCallback((message: string, tone: "error" | "success") => {
    const popupId = Date.now();
    setTransientPopup({ id: popupId, message, tone });

    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }

    const popupDurationMs = Math.max(
      POPUP_MIN_DURATION_MS,
      Math.min(POPUP_MAX_DURATION_MS, message.length * POPUP_MS_PER_CHAR),
    );

    popupTimeoutRef.current = setTimeout(() => {
      setTransientPopup((current) => (current?.id === popupId ? null : current));
    }, popupDurationMs);
  }, []);

  const { playerLocation, locationError, requestCurrentLocation } = usePlayerLocation(
    sessionState.team.lastLocation ? toCoordinate(sessionState.team.lastLocation.latitude, sessionState.team.lastLocation.longitude) : null,
  );
  const mapPlayerLocation = useMemo(() => {
    const localLocation = playerLocation ?? null;
    const syncedLocation = sessionState.team.lastLocation ?? null;

    if (!localLocation) {
      return syncedLocation;
    }

    if (!syncedLocation) {
      return localLocation;
    }

    const localAt = new Date(localLocation.at).getTime();
    const syncedAt = new Date(syncedLocation.at).getTime();

    if (!Number.isFinite(localAt)) {
      return syncedLocation;
    }
    if (!Number.isFinite(syncedAt)) {
      return localLocation;
    }

    return localAt >= syncedAt ? localLocation : syncedLocation;
  }, [playerLocation, sessionState.team.lastLocation]);

  const stationMetadataMap = useMemo(
    () =>
      sessionState.realization.stations.reduce<
        Record<string, { name: string; type: ExpeditionStationType; coordinate: MapCoordinate | null }>
      >((accumulator, station) => {
        accumulator[station.id] = {
          name: station.name,
          type: station.type,
          coordinate: toStationCoordinate(station.latitude, station.longitude),
        };
        return accumulator;
      }, {}),
    [sessionState.realization.stations],
  );

  const realStationCoordinates = useMemo(
    () =>
      Object.entries(stationMetadataMap).reduce<Record<string, MapCoordinate>>((accumulator, [stationId, metadata]) => {
        if (metadata.coordinate) {
          accumulator[stationId] = metadata.coordinate;
        }

        return accumulator;
      }, {}),
    [stationMetadataMap],
  );

  const stationCoordinateAnchor = useMemo(
    () => resolveCoordinateCentroid(Object.values(realStationCoordinates)),
    [realStationCoordinates],
  );

  useEffect(() => {
    const shouldResolveAnchorFromData =
      !mapAnchor ||
      (mapAnchor.latitude === DEFAULT_MAP_ANCHOR.latitude && mapAnchor.longitude === DEFAULT_MAP_ANCHOR.longitude);

    if (!shouldResolveAnchorFromData) {
      return;
    }

    if (playerLocation) {
      setMapAnchor(toCoordinate(playerLocation.latitude, playerLocation.longitude));
      return;
    }

    if (sessionState.team.lastLocation) {
      setMapAnchor(toCoordinate(sessionState.team.lastLocation.latitude, sessionState.team.lastLocation.longitude));
      return;
    }

    if (stationCoordinateAnchor) {
      setMapAnchor(stationCoordinateAnchor);
      return;
    }

    if (!isLoading) {
      setMapAnchor(DEFAULT_MAP_ANCHOR);
    }
  }, [isLoading, mapAnchor, playerLocation, sessionState.team.lastLocation, stationCoordinateAnchor]);

  const stationIds = useMemo(
    () => sessionState.tasks.map((task) => task.stationId).filter((stationId) => stationId.trim().length > 0),
    [sessionState.tasks],
  );

  useEffect(() => {
    if (selectedStationId && stationIds.includes(selectedStationId)) {
      return;
    }

    setSelectedStationId(stationIds[0] ?? null);
  }, [selectedStationId, stationIds]);

  useEffect(() => {
    if (!playerLocation) {
      return;
    }

    const nowTimestamp = Date.now();

    if (nowTimestamp - autoLocationSyncTimestampRef.current < LOCATION_SYNC_THROTTLE_MS) {
      return;
    }

    autoLocationSyncTimestampRef.current = nowTimestamp;

    void syncTeamLocation(playerLocation).then((message) => {
      if (message) {
        setActionError(message);
      }
    });
  }, [playerLocation, syncTeamLocation]);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSessionInvalid) {
      return;
    }

    onSessionInvalid?.(sessionInvalidReason ?? undefined);
  }, [isSessionInvalid, onSessionInvalid, sessionInvalidReason]);

  useEffect(() => {
    if (!errorMessage) {
      lastPopupSourceValuesRef.current.errorMessage = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.errorMessage === errorMessage) {
      return;
    }

    lastPopupSourceValuesRef.current.errorMessage = errorMessage;
    showTransientPopup(errorMessage, "error");
  }, [errorMessage, showTransientPopup]);

  useEffect(() => {
    if (!locationError) {
      lastPopupSourceValuesRef.current.locationError = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.locationError === locationError) {
      return;
    }

    lastPopupSourceValuesRef.current.locationError = locationError;
    showTransientPopup(locationError, "error");
  }, [locationError, showTransientPopup]);

  useEffect(() => {
    if (!actionError) {
      lastPopupSourceValuesRef.current.actionError = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.actionError === actionError) {
      return;
    }

    lastPopupSourceValuesRef.current.actionError = actionError;
    showTransientPopup(actionError, "error");
  }, [actionError, showTransientPopup]);

  useEffect(() => {
    if (!actionMessage) {
      lastPopupSourceValuesRef.current.actionMessage = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.actionMessage === actionMessage) {
      return;
    }

    lastPopupSourceValuesRef.current.actionMessage = actionMessage;
    showTransientPopup(actionMessage, "success");
  }, [actionMessage, showTransientPopup]);

  const mappableStationIds = useMemo(
    () => stationIds.filter((stationId) => Boolean(realStationCoordinates[stationId])),
    [realStationCoordinates, stationIds],
  );

  const failedTaskIds = useMemo(
    () =>
      new Set(
        sessionState.tasks
          .filter((task) => task.status === "failed")
          .map((task) => task.stationId),
      ),
    [sessionState.tasks],
  );
  const stationPins = useMemo(
    () =>
      mappableStationIds.map((stationId) => {
        const task = sessionState.tasks.find((item) => item.stationId === stationId);
        const metadata = stationMetadataMap[stationId];
        const visual = resolveStationVisual(metadata?.type, task?.status ?? "todo");
        const isFailed = task ? failedTaskIds.has(task.stationId) : false;

        return {
          stationId,
          label: resolveStationLabel(stationId, metadata?.name),
          coordinate: realStationCoordinates[stationId] ?? (mapAnchor ?? DEFAULT_MAP_ANCHOR),
          status: task?.status ?? "todo",
          failed: isFailed,
          pointsAwarded: task?.pointsAwarded ?? 0,
          customization: visual,
        };
      }),
    [
      failedTaskIds,
      mapAnchor,
      mappableStationIds,
      realStationCoordinates,
      sessionState.tasks,
      stationMetadataMap,
    ],
  );

  const selectedStationLabel = selectedStationId
    ? resolveStationLabel(selectedStationId, stationMetadataMap[selectedStationId]?.name)
    : null;
  const completedTasks = sessionState.tasks.filter(
    (task) => task.status === "done" || failedTaskIds.has(task.stationId),
  ).length;
  const taskTotal = sessionState.tasks.length;
  const taskByStationId = useMemo(
    () =>
      sessionState.tasks.reduce<Record<string, (typeof sessionState.tasks)[number]>>((accumulator, task) => {
        accumulator[task.stationId] = task;
        return accumulator;
      }, {}),
    [sessionState.tasks],
  );
  const checklistItems = useMemo(
    () =>
      sessionState.tasks.map((task) => ({
        stationId: task.stationId,
        label: resolveStationLabel(task.stationId, stationMetadataMap[task.stationId]?.name),
        done: task.status === "done",
        failed: task.status !== "done" && failedTaskIds.has(task.stationId),
      })),
    [failedTaskIds, sessionState.tasks, stationMetadataMap],
  );
  const stationTestEntries = useMemo<StationTestViewModel[]>(
    () => {
      const catalogStations = sessionState.realization.stations;
      const baseEntries =
        catalogStations.length > 0
          ? catalogStations.map((stationCatalog) => {
              const task = taskByStationId[stationCatalog.id];
              const stationName = resolveStationLabel(stationCatalog.id, stationCatalog.name);
              const stationType = stationCatalog.type || "quiz";

              return {
                stationId: stationCatalog.id,
                stationType: normalizeStationType(stationType),
                name: stationName,
                typeLabel: resolveStationTypeLabel(stationType),
                description: stationCatalog.description?.trim() || "",
                imageUrl:
                  stationCatalog.imageUrl?.trim() ||
                  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationName)}`,
                points: stationCatalog.points ?? resolveDefaultStationPoints(stationCatalog.id),
                timeLimitSeconds: stationCatalog.timeLimitSeconds ?? 0,
                completionCodeInputMode: stationCatalog.completionCodeInputMode ?? "alphanumeric",
                timeLimitLabel: formatTimeLimitLabel(stationCatalog.timeLimitSeconds ?? 0),
                quizQuestion: stationCatalog.quiz?.question,
                quizAnswers: stationCatalog.quiz?.answers,
                quizCorrectAnswerIndex: stationCatalog.quiz?.correctAnswerIndex,
                quizAudioUrl: stationCatalog.quiz?.audioUrl,
                status: task?.status ?? "todo",
                quizFailed: (task?.status ?? "todo") === "failed",
                startedAt: task?.startedAt ?? null,
              } satisfies StationTestViewModel;
            })
          : sessionState.tasks.map((task) => {
              const stationId = task.stationId;
              const metadata = stationMetadataMap[stationId];
              const stationName = resolveStationLabel(stationId, metadata?.name);
              const stationType = metadata?.type || "quiz";

              return {
                stationId,
                stationType: normalizeStationType(stationType),
                name: stationName,
                typeLabel: resolveStationTypeLabel(stationType),
                description: "",
                imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationName)}`,
                points: resolveDefaultStationPoints(stationId),
                timeLimitSeconds: 0,
                completionCodeInputMode: "alphanumeric",
                timeLimitLabel: formatTimeLimitLabel(0),
                quizQuestion: undefined,
                quizAnswers: undefined,
                quizCorrectAnswerIndex: undefined,
                quizAudioUrl: undefined,
                status: task.status,
                quizFailed: task.status === "failed",
                startedAt: task.startedAt,
              } satisfies StationTestViewModel;
            });

      return [...baseEntries].sort((left, right) => left.name.localeCompare(right.name, "pl"));
    },
    [
      sessionState.realization.stations,
      sessionState.tasks,
      stationMetadataMap,
      taskByStationId,
    ],
  );

  const activeStationTest = useMemo(
    () => stationTestEntries.find((item) => item.stationId === activeStationTestId) ?? null,
    [activeStationTestId, stationTestEntries],
  );
  const pendingQuizStartStation = useMemo(
    () => stationTestEntries.find((item) => item.stationId === pendingQuizStartStationId) ?? null,
    [pendingQuizStartStationId, stationTestEntries],
  );
  const pendingTimeStartStation = useMemo(
    () => stationTestEntries.find((item) => item.stationId === pendingTimeStartStationId) ?? null,
    [pendingTimeStartStationId, stationTestEntries],
  );

  useEffect(() => {
    if (!activeStationTestId) {
      return;
    }

    if (stationTestEntries.some((item) => item.stationId === activeStationTestId)) {
      return;
    }

    setActiveStationTestId(null);
  }, [activeStationTestId, stationTestEntries]);

  useEffect(() => {
    if (!pendingQuizStartStationId) {
      return;
    }

    if (stationTestEntries.some((item) => item.stationId === pendingQuizStartStationId)) {
      return;
    }

    setPendingQuizStartStationId(null);
  }, [pendingQuizStartStationId, stationTestEntries]);

  useEffect(() => {
    if (!pendingTimeStartStationId) {
      return;
    }

    if (stationTestEntries.some((item) => item.stationId === pendingTimeStartStationId)) {
      return;
    }

    setPendingTimeStartStationId(null);
  }, [pendingTimeStartStationId, stationTestEntries]);

  useEffect(() => {
    if (!pendingQuizStartStationId) {
      setIsStartingPendingQuiz(false);
    }
  }, [pendingQuizStartStationId]);

  useEffect(() => {
    if (!pendingTimeStartStationId) {
      setIsStartingPendingTime(false);
    }
  }, [pendingTimeStartStationId]);

  useEffect(() => {
    if (!activeStationTestId) {
      return;
    }

    const activeTask = taskByStationId[activeStationTestId];
    if (!activeTask?.startedAt) {
      return;
    }

    setLocalStartedAtByStationId((current) => {
      if (!current[activeStationTestId]) {
        return current;
      }

      const next = { ...current };
      delete next[activeStationTestId];
      return next;
    });
  }, [activeStationTestId, taskByStationId]);

  const teamColor = TEAM_COLORS.find((color) => color.key === sessionState.team.color) ?? null;
  const teamColorHex = teamColor?.hex ?? session.team.colorHex;
  const teamColorLabel = teamColor?.label ?? session.team.colorLabel;
  const teamName = sessionState.team.name?.trim() || session.team.name || "Drużyna";
  const teamIcon = session.team.icon.trim().length > 0 ? session.team.icon : "🏁";
  const countdown = useRealizationCountdown(
    sessionState.realization.scheduledAt,
    sessionState.realization.durationMinutes,
  );

  async function handleOpenQrScanner() {
    setActionError(null);
    setActionMessage(null);
    setIsScannerOpening(true);

    try {
      const currentLocation = playerLocation ?? (await requestCurrentLocation().catch(() => null));

      if (currentLocation) {
        const syncError = await syncTeamLocation(currentLocation);

        if (syncError) {
          setActionError(syncError);
        }
      }
      setIsQrScannerOpen(true);
      setActionMessage("Skaner QR gotowy.");
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Nie udało się otworzyć skanera."));
    } finally {
      setIsScannerOpening(false);
    }
  }

  const handleQrDetected = useCallback(
    async (rawValue: string) => {
      if (isQrResolving) {
        return;
      }

      setActionError(null);
      setActionMessage(null);
      setIsQrResolving(true);

      try {
        const token = extractStationQrToken(rawValue);
        if (!token) {
          setActionError("Nie udało się odczytać tokenu z kodu QR.");
          return;
        }

        const result = await resolveStationQrToken(token);
        if (typeof result === "string") {
          setActionError(result);
          return;
        }

        const scannedStationId = result.station.id;
        setSelectedStationId(scannedStationId);
        if (isInteractiveQuizStationType(result.station.type)) {
          setPendingQuizStartStationId(scannedStationId);
          setPendingTimeStartStationId(null);
          setActiveStationTestId(null);
        } else if (result.station.type === "time") {
          setPendingQuizStartStationId(null);
          setPendingTimeStartStationId(scannedStationId);
          setActiveStationTestId(null);
        } else {
          setPendingQuizStartStationId(null);
          setPendingTimeStartStationId(null);
          setActiveStationTestId(scannedStationId);
        }
        setIsQrScannerOpen(false);
        setActionMessage(`Zeskanowano stanowisko: ${result.station.name}`);
      } catch (error) {
        setActionError(getApiErrorMessage(error, "Nie udało się przetworzyć kodu QR."));
      } finally {
        setIsQrResolving(false);
      }
    },
    [isQrResolving, resolveStationQrToken],
  );

  function handleSelectStationFromMap(stationId: string) {
    setSelectedStationId(stationId);
  }

  function handleEnterStationTest(stationId: string) {
    const selectedStation = stationTestEntries.find((item) => item.stationId === stationId) ?? null;
    if (stationIds.includes(stationId)) {
      setSelectedStationId(stationId);
    }
    if (isInteractiveQuizStationType(selectedStation?.stationType)) {
      setPendingQuizStartStationId(stationId);
      setPendingTimeStartStationId(null);
      setActiveStationTestId(null);
    } else if (selectedStation?.timeLimitSeconds && selectedStation.timeLimitSeconds > 0) {
      setPendingQuizStartStationId(null);
      setPendingTimeStartStationId(stationId);
      setActiveStationTestId(null);
    } else if (selectedStation?.stationType === "time") {
      setPendingQuizStartStationId(null);
      setPendingTimeStartStationId(stationId);
      setActiveStationTestId(null);
    } else {
      setPendingQuizStartStationId(null);
      setPendingTimeStartStationId(null);
      setActiveStationTestId(stationId);
    }
    setIsStationTestMenuOpen(false);
  }

  const handlePreviewOutcomePopup = useCallback(
    (variant: "success" | "failed") => {
      const previewStationId = stationTestEntries[0]?.stationId ?? null;
      if (!previewStationId) {
        setActionError("Brak stanowisk do podglądu popupu.");
        return;
      }

      setPendingQuizStartStationId(null);
      setPendingTimeStartStationId(null);
      setSelectedStationId(previewStationId);
      setActiveStationTestId(previewStationId);
      setIsStationTestMenuOpen(false);
      setDebugOutcomePreview({
        id: Date.now(),
        variant,
        message:
          variant === "success"
            ? "Podgląd popupu zaliczonego zadania."
            : "Podgląd popupu niezaliczonego zadania.",
      });
    },
    [stationTestEntries],
  );

  const handleStartStationTestTask = useCallback(
    async (stationId: string) => {
      setActionError(null);
      setActionMessage(null);
      const startedAtIso = new Date().toISOString();

      setLocalStartedAtByStationId((current) => ({
        ...current,
        [stationId]: startedAtIso,
      }));

      const result = await startStationTask(stationId, startedAtIso);
      if (result) {
        setLocalStartedAtByStationId((current) => {
          if (!current[stationId]) {
            return current;
          }

          const next = { ...current };
          delete next[stationId];
          return next;
        });
        setActionError(result);
        return result;
      }

      setActionMessage("Licznik zadania uruchomiony.");
      return null;
    },
    [startStationTask],
  );

  const handleCompleteStationTestTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string) => {
      setActionError(null);
      setActionMessage(null);

      if (taskByStationId[stationId]?.status === "failed") {
        return "To zadanie zostało oznaczone jako niezaliczone po zamknięciu stanowiska.";
      }

      const result = await completeStationTask(stationId, completionCode, startedAt);
      if (result) {
        if (!isInvalidCompletionCodeError(result)) {
          setActionError(result);
        }
        return result;
      }

      setActionMessage("Zadanie zaliczone.");
      return null;
    },
    [completeStationTask, taskByStationId],
  );

  const handleRequestCloseActiveStation = useCallback(() => {
    if (!activeStationTest) {
      setActiveStationTestId(null);
      return;
    }

    const isAlreadyDone = activeStationTest.status === "done" || activeStationTest.status === "failed";
    const hasTimeLimit = activeStationTest.timeLimitSeconds > 0;
    if (isAlreadyDone || !hasTimeLimit) {
      setActiveStationTestId(null);
      return;
    }

    Alert.alert(
      "Uwaga: zadanie na czas",
      "Jeśli zamkniesz stanowisko bez ukończenia, zadanie zostanie automatycznie oznaczone jako niezaliczone.",
      [
        { text: "Wróć", style: "cancel" },
        {
          text: "Zamknij i nie zaliczaj",
          style: "destructive",
          onPress: () => {
            const stationId = activeStationTest.stationId;
            const startedAt = activeStationTest.startedAt ?? localStartedAtByStationId[stationId];
            void failStationTask(
              stationId,
              "task_closed_before_completion",
              startedAt,
            ).then((error) => {
              if (error) {
                setActionError(error);
              } else {
                setActionMessage("Zadanie zostało oznaczone jako niezaliczone.");
              }
              setActiveStationTestId(null);
            });
          },
        },
      ],
    );
  }, [activeStationTest, failStationTask, localStartedAtByStationId]);

  const handleTimeStationExpired = useCallback(
    (stationId: string) => {
      const startedAt = taskByStationId[stationId]?.startedAt ?? localStartedAtByStationId[stationId];
      void failStationTask(stationId, "time_limit_expired", startedAt).then((error) => {
        if (error) {
          setActionError(error);
          return;
        }
        setActionError("Czas na ukończenie zadania się skończył. Zadanie nie zostało zaliczone.");
      });
    },
    [failStationTask, localStartedAtByStationId, taskByStationId],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <View className="absolute inset-0">
        {isLoading ? (
          <View className="flex-1 items-center justify-center gap-3" style={{ backgroundColor: EXPEDITION_THEME.panelMuted }}>
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
            <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
              Ładowanie mapy...
            </Text>
          </View>
        ) : (
          <ExpeditionMap
            centerCoordinate={mapAnchor ?? DEFAULT_MAP_ANCHOR}
            playerLocation={mapPlayerLocation}
            pins={stationPins}
            selectedStationId={selectedStationId}
            focusCoordinate={null}
            onSelectStation={handleSelectStationFromMap}
          />
        )}
      </View>

      <View className="absolute left-3 right-3" style={{ top: insets.top + 12 }}>
        <TopRealizationPanel
          companyName={sessionState.realization.companyName || session.realization?.companyName || `Realizacja ${session.realizationCode}`}
          logoUrl={sessionState.realization.logoUrl}
          teamName={teamName}
          teamSlot={sessionState.team.slotNumber ?? session.team.slotNumber}
          teamColorHex={teamColorHex}
          teamColorLabel={teamColorLabel}
          teamIcon={teamIcon}
          points={sessionState.team.points}
        />

        <View className="mt-2 items-end">
          <View
            className="w-56 rounded-2xl border px-3 py-2"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.9)" }}
          >
            <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
              Zadania
            </Text>
            <View className="mt-2 gap-1.5">
              {checklistItems.map((item) => (
                <View key={item.stationId} className="flex-row items-center gap-2">
                  <View
                    className="h-4 w-4 items-center justify-center rounded border"
                    style={{
                      borderColor: item.done ? "#34d399" : item.failed ? "#ef4444" : EXPEDITION_THEME.border,
                      backgroundColor: item.done
                        ? "rgba(52, 211, 153, 0.2)"
                        : item.failed
                          ? "rgba(127, 29, 29, 0.3)"
                          : "rgba(15, 23, 42, 0.2)",
                    }}
                  >
                    {item.done ? (
                      <Text
                        className="text-[10px] font-bold text-emerald-300"
                        style={{ lineHeight: 10, includeFontPadding: false, transform: [{ translateY: -1 }] }}
                      >
                        ✓
                      </Text>
                    ) : item.failed ? (
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: "#fecaca", lineHeight: 10, includeFontPadding: false, transform: [{ translateY: -1 }] }}
                      >
                        ✕
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className="flex-1 text-xs"
                    style={{ color: item.failed ? "#fecaca" : EXPEDITION_THEME.textPrimary }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            className="mt-2 rounded-full border px-3 py-1.5 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.9)" }}
            onPress={() => setIsStationTestMenuOpen(true)}
          >
            <Text className="text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Menu testowe
            </Text>
          </Pressable>

        </View>
      </View>

      <View className="absolute left-3 right-3 items-center" style={{ bottom: insets.bottom + 12 }}>
        {selectedStationLabel ? (
          <View
            className="mb-2 rounded-full border px-3 py-1"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.88)" }}
          >
            <Text className="text-xs" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {selectedStationLabel}
            </Text>
          </View>
        ) : null}

        <View className="w-full max-w-[560px]">
          <BottomCountdownPanel
            remainingLabel={countdown.remainingLabel}
            isCompleted={countdown.isCompleted}
            progressLabel={`${completedTasks}/${taskTotal}`}
            onOpenQrScanner={() => void handleOpenQrScanner()}
            isScannerOpening={isScannerOpening}
          />
        </View>
      </View>

      {transientPopup ? (
        <View pointerEvents="none" className="absolute left-3 right-3 items-center" style={{ bottom: insets.bottom + 114 }}>
          <View
            className="w-full max-w-[560px] rounded-2xl border px-3 py-2"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: transientPopup.tone === "error" ? "rgba(127, 29, 29, 0.9)" : "rgba(22, 41, 33, 0.94)",
            }}
          >
            <Text
              className="text-center text-xs font-semibold"
              style={{ color: transientPopup.tone === "error" ? "#fecaca" : EXPEDITION_THEME.accentStrong }}
            >
              {transientPopup.message}
            </Text>
          </View>
        </View>
      ) : null}

      <StationTestMenuOverlay
        visible={isStationTestMenuOpen}
        stations={stationTestEntries}
        onClose={() => setIsStationTestMenuOpen(false)}
        onEnterStation={handleEnterStationTest}
        onPreviewSuccessPopup={() => handlePreviewOutcomePopup("success")}
        onPreviewFailedPopup={() => handlePreviewOutcomePopup("failed")}
        onOpenWelcomeScreen={() => {
          setIsStationTestMenuOpen(false);
          setIsWelcomePreviewOpen(true);
        }}
      />

      <WelcomePreviewOverlay
        visible={isWelcomePreviewOpen}
        introText={sessionState.realization.introText ?? session.realization?.introText}
        onClose={() => setIsWelcomePreviewOpen(false)}
      />

      <StationPreviewOverlay
        station={
          activeStationTest
            ? {
                ...activeStationTest,
                startedAt: activeStationTest.startedAt ?? localStartedAtByStationId[activeStationTest.stationId] ?? null,
              }
            : null
        }
        onClose={() => setActiveStationTestId(null)}
        onRequestClose={handleRequestCloseActiveStation}
        onCompleteTask={handleCompleteStationTestTask}
        onQuizFailed={(stationId, reason) => {
          const startedAt = taskByStationId[stationId]?.startedAt ?? localStartedAtByStationId[stationId];
          void failStationTask(stationId, reason ?? "quiz_incorrect_answer", startedAt).then((error) => {
            if (error) {
              setActionError(error);
            }
          });
        }}
        onTimeExpired={handleTimeStationExpired}
        debugOutcomePreview={debugOutcomePreview}
        onDebugOutcomePreviewConsumed={() => setDebugOutcomePreview(null)}
      />

      <QuizPrestartOverlay
        visible={Boolean(pendingQuizStartStation)}
        stationName={pendingQuizStartStation?.name ?? null}
        stationType={pendingQuizStartStation?.stationType ?? "quiz"}
        isStarting={isStartingPendingQuiz}
        onClose={() => {
          setPendingQuizStartStationId(null);
          setIsStartingPendingQuiz(false);
        }}
        onStart={async () => {
          if (!pendingQuizStartStationId) {
            return;
          }
          const startedAtIso = new Date().toISOString();
          setIsStartingPendingQuiz(true);
          setLocalStartedAtByStationId((current) => ({
            ...current,
            [pendingQuizStartStationId]: startedAtIso,
          }));
          setActionError(null);
          setActionMessage(null);

          const startError = await startStationTask(pendingQuizStartStationId, startedAtIso);
          if (startError) {
            setActionError(startError);
            setIsStartingPendingQuiz(false);
            return;
          }

          setActiveStationTestId(pendingQuizStartStationId);
          setPendingQuizStartStationId(null);
          setIsStartingPendingQuiz(false);
        }}
      />

      <QuizPrestartOverlay
        visible={Boolean(pendingTimeStartStation)}
        stationName={pendingTimeStartStation?.name ?? null}
        stationType="time"
        isStarting={isStartingPendingTime}
        onClose={() => {
          setPendingTimeStartStationId(null);
          setIsStartingPendingTime(false);
        }}
        onStart={async () => {
          if (!pendingTimeStartStationId) {
            return;
          }

          setIsStartingPendingTime(true);
          const startError = await handleStartStationTestTask(pendingTimeStartStationId);
          if (startError) {
            setIsStartingPendingTime(false);
            return;
          }

          setActiveStationTestId(pendingTimeStartStationId);
          setPendingTimeStartStationId(null);
          setIsStartingPendingTime(false);
        }}
      />

      <QrScannerOverlay
        visible={isQrScannerOpen}
        isResolving={isQrResolving}
        onDetected={(value) => void handleQrDetected(value)}
        onClose={() => {
          setIsQrScannerOpen(false);
          setActionMessage((current) => current || "Skanowanie QR anulowane.");
        }}
      />

    </View>
  );
}
