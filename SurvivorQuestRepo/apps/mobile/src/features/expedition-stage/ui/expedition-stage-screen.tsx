import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
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
  type StationTestType,
  type StationTestViewModel,
} from "../components/station-test-overlays";
import { TopRealizationPanel } from "../components/top-realization-panel";
import { useExpeditionSession, usePlayerLocation, useRealizationCountdown } from "../hooks";
import { DEFAULT_MAP_ANCHOR } from "../model/station-pin-layout";
import { DEFAULT_STATION_PIN_CUSTOMIZATION, resolveDefaultStationPoints, type MapCoordinate } from "../model/types";

type ExpeditionStageScreenProps = {
  session: OnboardingSession;
};

const LOCATION_SYNC_THROTTLE_MS = 10_000;

type TransientPopup = {
  id: number;
  message: string;
  tone: "error" | "success";
};
const POPUP_MIN_DURATION_MS = 6_500;
const POPUP_MAX_DURATION_MS = 12_000;
const POPUP_MS_PER_CHAR = 45;

const MOBILE_TEST_STATION_DEFINITIONS: Array<{
  stationId: string;
  stationType: StationTestType;
  name: string;
  description: string;
  points: number;
  timeLimitSeconds: number;
  quizQuestion?: string;
  quizAnswers?: [string, string, string, string];
  quizCorrectAnswerIndex?: number;
}> = [
  {
    stationId: "mobile-test-quiz",
    stationType: "quiz",
    name: "TEST: Quiz mobilny",
    description: "Przykładowe stanowisko quizowe do testu UI wyboru jednej z 4 odpowiedzi.",
    points: 100,
    timeLimitSeconds: 300,
    quizQuestion: "Jak powinna działać drużyna na stanowisku testowym?",
    quizAnswers: [
      "Sprawdzam komunikację i plan zespołu.",
      "Działam bez konsultacji z drużyną.",
      "Ignoruję zasady bezpieczeństwa.",
      "Rozdzielam zespół i tracę kontakt.",
    ],
    quizCorrectAnswerIndex: 0,
  },
  {
    stationId: "mobile-test-time",
    stationType: "time",
    name: "TEST: Time mobilny",
    description: "Przykładowe stanowisko time z potwierdzeniem przez wpisanie kodu.",
    points: 160,
    timeLimitSeconds: 420,
  },
  {
    stationId: "mobile-test-points",
    stationType: "points",
    name: "TEST: Points mobilny",
    description: "Przykładowe stanowisko points z potwierdzeniem przez wpisanie kodu.",
    points: 220,
    timeLimitSeconds: 0,
  },
];

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

function resolveStationVisual(stationType: string | undefined, status: "todo" | "in-progress" | "done") {
  if (status === "done") {
    return { icon: "✅", color: "#10b981" };
  }

  if (stationType === "time") {
    return { icon: "⏱️", color: "#3b82f6" };
  }

  if (stationType === "points") {
    return { icon: "🎯", color: "#a855f7" };
  }

  if (stationType === "quiz") {
    return { icon: "❓", color: "#f59e0b" };
  }

  return DEFAULT_STATION_PIN_CUSTOMIZATION;
}

function resolveStationLabel(stationId: string, stationName?: string) {
  return stationName?.trim() ? stationName : `Stanowisko ${stationId}`;
}

function resolveStationTypeLabel(stationType?: string) {
  if (stationType === "time") {
    return "Na czas";
  }

  if (stationType === "points") {
    return "Na punkty";
  }

  return "Quiz";
}

function normalizeStationType(stationType?: string): StationTestType {
  if (stationType === "time" || stationType === "points") {
    return stationType;
  }

  return "quiz";
}

function formatTimeLimitLabel(timeLimitSeconds: number) {
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    return "Brak limitu czasu";
  }

  const minutes = Math.floor(timeLimitSeconds / 60);
  const seconds = timeLimitSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

export function ExpeditionStageScreen({ session }: ExpeditionStageScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    sessionState,
    isLoading,
    errorMessage,
    startStationTask,
    completeStationTask,
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
  const [activeStationTestId, setActiveStationTestId] = useState<string | null>(null);
  const [pendingQuizStartStationId, setPendingQuizStartStationId] = useState<string | null>(null);
  const [isStartingPendingQuiz, setIsStartingPendingQuiz] = useState(false);
  const [localStartedAtByStationId, setLocalStartedAtByStationId] = useState<Record<string, string>>({});
  const [failedQuizStationIds, setFailedQuizStationIds] = useState<string[]>([]);
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
        Record<string, { name: string; type: string; coordinate: MapCoordinate | null }>
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

  const stationPins = useMemo(
    () =>
      mappableStationIds.map((stationId) => {
        const task = sessionState.tasks.find((item) => item.stationId === stationId);
        const metadata = stationMetadataMap[stationId];
        const visual = resolveStationVisual(metadata?.type, task?.status ?? "todo");

        return {
          stationId,
          label: resolveStationLabel(stationId, metadata?.name),
          coordinate: realStationCoordinates[stationId] ?? (mapAnchor ?? DEFAULT_MAP_ANCHOR),
          status: task?.status ?? "todo",
          pointsAwarded: task?.pointsAwarded ?? 0,
          customization: visual,
        };
      }),
    [mapAnchor, mappableStationIds, realStationCoordinates, sessionState.tasks, stationMetadataMap],
  );

  const selectedStationLabel = selectedStationId
    ? resolveStationLabel(selectedStationId, stationMetadataMap[selectedStationId]?.name)
    : null;

  const completedTasks = sessionState.tasks.filter((task) => task.status === "done").length;
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
        failed: task.status !== "done" && failedQuizStationIds.includes(task.stationId),
      })),
    [failedQuizStationIds, sessionState.tasks, stationMetadataMap],
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
                timeLimitLabel: formatTimeLimitLabel(stationCatalog.timeLimitSeconds ?? 0),
                quizQuestion: stationCatalog.quiz?.question,
                quizAnswers: stationCatalog.quiz?.answers,
                quizCorrectAnswerIndex: stationCatalog.quiz?.correctAnswerIndex,
                status: task?.status ?? "todo",
                quizFailed: (task?.status ?? "todo") !== "done" && failedQuizStationIds.includes(stationCatalog.id),
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
                timeLimitLabel: "Brak limitu czasu",
                quizQuestion: undefined,
                quizAnswers: undefined,
                quizCorrectAnswerIndex: undefined,
                status: task.status,
                quizFailed: task.status !== "done" && failedQuizStationIds.includes(stationId),
                startedAt: task.startedAt,
              } satisfies StationTestViewModel;
            });

      const stationIds = new Set(baseEntries.map((entry) => entry.stationId));
      const mobileTestEntries = MOBILE_TEST_STATION_DEFINITIONS.filter((definition) => !stationIds.has(definition.stationId)).map(
        (definition) =>
          ({
            stationId: definition.stationId,
            stationType: definition.stationType,
            name: definition.name,
            typeLabel: resolveStationTypeLabel(definition.stationType),
            description: definition.description,
            imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(definition.name)}`,
            points: definition.points,
            timeLimitSeconds: definition.timeLimitSeconds,
            timeLimitLabel: formatTimeLimitLabel(definition.timeLimitSeconds),
            quizQuestion: definition.quizQuestion,
            quizAnswers: definition.quizAnswers,
            quizCorrectAnswerIndex: definition.quizCorrectAnswerIndex,
            status: "todo",
            quizFailed: false,
            startedAt: null,
          }) satisfies StationTestViewModel,
      );

      return [...baseEntries, ...mobileTestEntries].sort((left, right) => left.name.localeCompare(right.name, "pl"));
    },
    [failedQuizStationIds, sessionState.realization.stations, sessionState.tasks, stationMetadataMap, taskByStationId],
  );

  useEffect(() => {
    setFailedQuizStationIds((current) => {
      if (current.length === 0) {
        return current;
      }

      const activeFailedInProgress = new Set(
        sessionState.tasks
          .filter((task) => task.status === "in-progress")
          .map((task) => task.stationId),
      );
      const next = current.filter((stationId) => activeFailedInProgress.has(stationId));
      return next.length === current.length ? current : next;
    });
  }, [sessionState.tasks]);

  const activeStationTest = useMemo(
    () => stationTestEntries.find((item) => item.stationId === activeStationTestId) ?? null,
    [activeStationTestId, stationTestEntries],
  );
  const pendingQuizStartStation = useMemo(
    () => stationTestEntries.find((item) => item.stationId === pendingQuizStartStationId) ?? null,
    [pendingQuizStartStationId, stationTestEntries],
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
    if (!pendingQuizStartStationId) {
      setIsStartingPendingQuiz(false);
    }
  }, [pendingQuizStartStationId]);

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
        if (result.station.type === "quiz") {
          setPendingQuizStartStationId(scannedStationId);
          setActiveStationTestId(null);
        } else {
          setPendingQuizStartStationId(null);
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
    if (selectedStation?.stationType === "quiz") {
      setPendingQuizStartStationId(stationId);
      setActiveStationTestId(null);
    } else {
      setPendingQuizStartStationId(null);
      setActiveStationTestId(stationId);
    }
    setIsStationTestMenuOpen(false);
  }

  const handleStartStationTestTask = useCallback(
    async (stationId: string) => {
      setActionError(null);
      setActionMessage(null);

      const result = await startStationTask(stationId, new Date().toISOString());
      if (result) {
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

      const result = await completeStationTask(stationId, completionCode, startedAt);
      if (result) {
        setActionError(result);
        return result;
      }

      setActionMessage("Zadanie zaliczone.");
      return null;
    },
    [completeStationTask],
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
            <ScrollView className="mt-2" style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
              <View className="gap-1.5">
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
            </ScrollView>
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
        onStartTask={handleStartStationTestTask}
        onCompleteTask={handleCompleteStationTestTask}
        onQuizFailed={(stationId) => {
          setFailedQuizStationIds((current) => (current.includes(stationId) ? current : [...current, stationId]));
        }}
        onQuizPassed={(stationId) => {
          setFailedQuizStationIds((current) => current.filter((id) => id !== stationId));
        }}
      />

      <QuizPrestartOverlay
        visible={Boolean(pendingQuizStartStation)}
        stationName={pendingQuizStartStation?.name ?? null}
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
