import { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import type { OnboardingSession } from "../../onboarding/model/types";
import {
  fetchMobileRealizationClientDetails,
  fetchMobileStationCatalog,
  getApiErrorMessage,
  type MobileRealizationClientDetails,
  type MobileStationCatalogItem,
} from "../api/mobile-session.api";
import { BottomCountdownPanel } from "../components/bottom-countdown-panel";
import { ExpeditionMap } from "../components/expedition-map";
import {
  StationPreviewOverlay,
  StationTestMenuOverlay,
  type StationTestType,
  type StationTestViewModel,
} from "../components/station-test-overlays";
import { TopRealizationPanel } from "../components/top-realization-panel";
import { useExpeditionSession } from "../hooks/use-expedition-session";
import { usePlayerLocation } from "../hooks/use-player-location";
import { useRealizationCountdown } from "../hooks/use-realization-countdown";
import { buildStationPinCoordinates, DEFAULT_MAP_ANCHOR } from "../model/station-pin-layout";
import { DEFAULT_STATION_PIN_CUSTOMIZATION, resolveDefaultStationPoints, type MapCoordinate } from "../model/types";

type ExpeditionStageScreenProps = {
  session: OnboardingSession;
  onRestart?: () => void;
};

const MOBILE_TEST_STATION_DEFINITIONS: Array<{
  stationId: string;
  stationType: StationTestType;
  name: string;
  description: string;
  points: number;
  timeLimitSeconds: number;
}> = [
  {
    stationId: "mobile-test-quiz",
    stationType: "quiz",
    name: "TEST: Quiz mobilny",
    description: "Przykładowe stanowisko quizowe do testu UI wyboru jednej z 4 odpowiedzi.",
    points: 100,
    timeLimitSeconds: 300,
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

export function ExpeditionStageScreen({ session, onRestart }: ExpeditionStageScreenProps) {
  const {
    sessionState,
    isLoading,
    errorMessage,
    syncTeamLocation,
  } = useExpeditionSession(session);

  const [mapAnchor, setMapAnchor] = useState<MapCoordinate | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [clientInfoError, setClientInfoError] = useState<string | null>(null);
  const [stationCatalogError, setStationCatalogError] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<MobileRealizationClientDetails | null>(null);
  const [stationCatalogMap, setStationCatalogMap] = useState<Record<string, MobileStationCatalogItem>>({});
  const [isClientDetailsLoading, setIsClientDetailsLoading] = useState(false);
  const [isCameraActivating, setIsCameraActivating] = useState(false);
  const [isStationTestMenuOpen, setIsStationTestMenuOpen] = useState(false);
  const [activeStationTestId, setActiveStationTestId] = useState<string | null>(null);
  const autoLocationSyncTimestampRef = useRef(0);

  const { playerLocation, locationError, requestCurrentLocation } = usePlayerLocation(
    sessionState.team.lastLocation ? toCoordinate(sessionState.team.lastLocation.latitude, sessionState.team.lastLocation.longitude) : null,
  );

  const realizationId = sessionState.realization.id || session.realizationId || "";

  useEffect(() => {
    let isMounted = true;

    async function loadClientDetails() {
      if (!session.apiBaseUrl?.trim() || !realizationId.trim()) {
        setClientDetails(null);
        setClientInfoError(null);
        return;
      }

      setIsClientDetailsLoading(true);
      setClientInfoError(null);

      try {
        const result = await fetchMobileRealizationClientDetails(session.apiBaseUrl, realizationId);

        if (!isMounted) {
          return;
        }

        setClientDetails(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setClientDetails(null);
        setClientInfoError(getApiErrorMessage(error, "Nie udało się pobrać szczegółów klienta."));
      } finally {
        if (isMounted) {
          setIsClientDetailsLoading(false);
        }
      }
    }

    void loadClientDetails();

    return () => {
      isMounted = false;
    };
  }, [realizationId, session.apiBaseUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadStationCatalog() {
      if (!session.apiBaseUrl?.trim()) {
        setStationCatalogMap({});
        setStationCatalogError(null);
        return;
      }

      setStationCatalogError(null);

      try {
        const stationCatalog = await fetchMobileStationCatalog(session.apiBaseUrl);

        if (!isMounted) {
          return;
        }

        setStationCatalogMap(
          stationCatalog.reduce<Record<string, MobileStationCatalogItem>>((accumulator, station) => {
            accumulator[station.id] = station;
            return accumulator;
          }, {}),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStationCatalogMap({});
        setStationCatalogError(getApiErrorMessage(error, "Nie udało się pobrać stanowisk do menu testowego."));
      }
    }

    void loadStationCatalog();

    return () => {
      isMounted = false;
    };
  }, [session.apiBaseUrl]);

  useEffect(() => {
    if (mapAnchor) {
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

    if (!isLoading) {
      setMapAnchor(DEFAULT_MAP_ANCHOR);
    }
  }, [isLoading, mapAnchor, playerLocation, sessionState.team.lastLocation]);

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

  const stationCoordinates = useMemo(
    () => buildStationPinCoordinates(stationIds, mapAnchor ?? DEFAULT_MAP_ANCHOR),
    [mapAnchor, stationIds],
  );

  useEffect(() => {
    if (!playerLocation) {
      return;
    }

    const nowTimestamp = Date.now();

    if (nowTimestamp - autoLocationSyncTimestampRef.current < 15_000) {
      return;
    }

    autoLocationSyncTimestampRef.current = nowTimestamp;

    void syncTeamLocation(playerLocation).then((message) => {
      if (message) {
        setActionError(message);
      }
    });
  }, [playerLocation, syncTeamLocation]);

  const stationMetadataMap = useMemo(
    () =>
      (clientDetails?.stations ?? []).reduce<Record<string, { name: string; type: string }>>((accumulator, station) => {
        accumulator[station.id] = {
          name: station.name,
          type: station.type,
        };
        return accumulator;
      }, {}),
    [clientDetails?.stations],
  );

  const stationPins = useMemo(
    () =>
      stationIds.map((stationId) => {
        const task = sessionState.tasks.find((item) => item.stationId === stationId);
        const metadata = stationMetadataMap[stationId];
        const visual = resolveStationVisual(metadata?.type, task?.status ?? "todo");

        return {
          stationId,
          label: resolveStationLabel(stationId, metadata?.name),
          coordinate: stationCoordinates[stationId] ?? (mapAnchor ?? DEFAULT_MAP_ANCHOR),
          status: task?.status ?? "todo",
          pointsAwarded: task?.pointsAwarded ?? 0,
          customization: visual,
        };
      }),
    [mapAnchor, sessionState.tasks, stationCoordinates, stationIds, stationMetadataMap],
  );

  const selectedStationLabel = selectedStationId
    ? stationPins.find((pin) => pin.stationId === selectedStationId)?.label ?? `Stanowisko ${selectedStationId}`
    : null;
  const selectedStationCoordinate =
    selectedStationId && stationCoordinates[selectedStationId] ? stationCoordinates[selectedStationId] : null;

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
      })),
    [sessionState.tasks, stationMetadataMap],
  );
  const stationTestEntries = useMemo<StationTestViewModel[]>(
    () => {
      const catalogStations = Object.values(stationCatalogMap);
      const baseEntries =
        catalogStations.length > 0
          ? catalogStations.map((stationCatalog) => {
              const metadata = stationMetadataMap[stationCatalog.id];
              const task = taskByStationId[stationCatalog.id];
              const stationName = resolveStationLabel(stationCatalog.id, stationCatalog.name || metadata?.name);
              const stationType = stationCatalog.type || metadata?.type || "quiz";

              return {
                stationId: stationCatalog.id,
                stationType: normalizeStationType(stationType),
                name: stationName,
                typeLabel: resolveStationTypeLabel(stationType),
                description:
                  stationCatalog.description?.trim() ||
                  "Docelowo szczegóły stanowiska będą odczytywane po skanie kodu QR.",
                imageUrl:
                  stationCatalog.imageUrl?.trim() ||
                  `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationName)}`,
                points: stationCatalog.points ?? resolveDefaultStationPoints(stationCatalog.id),
                timeLimitLabel: formatTimeLimitLabel(stationCatalog.timeLimitSeconds ?? 0),
                status: task?.status ?? "todo",
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
                description: "Docelowo szczegóły stanowiska będą odczytywane po skanie kodu QR.",
                imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationName)}`,
                points: resolveDefaultStationPoints(stationId),
                timeLimitLabel: "Brak limitu czasu",
                status: task.status,
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
            timeLimitLabel: formatTimeLimitLabel(definition.timeLimitSeconds),
            status: "todo",
          }) satisfies StationTestViewModel,
      );

      return [...baseEntries, ...mobileTestEntries].sort((left, right) => left.name.localeCompare(right.name, "pl"));
    },
    [sessionState.tasks, stationCatalogMap, stationMetadataMap, taskByStationId],
  );

  const activeStationTest = useMemo(
    () => stationTestEntries.find((item) => item.stationId === activeStationTestId) ?? null,
    [activeStationTestId, stationTestEntries],
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

  const teamColor = TEAM_COLORS.find((color) => color.key === sessionState.team.color) ?? null;
  const teamColorHex = teamColor?.hex ?? session.team.colorHex;
  const teamColorLabel = teamColor?.label ?? session.team.colorLabel;
  const teamName = sessionState.team.name?.trim() || session.team.name || "Drużyna";
  const teamIcon = session.team.icon.trim().length > 0 ? session.team.icon : "🏁";
  const countdown = useRealizationCountdown(sessionState.realization.scheduledAt);

  async function handleCameraActivation() {
    setActionError(null);
    setActionMessage(null);
    setIsCameraActivating(true);

    try {
      const currentLocation = playerLocation ?? (await requestCurrentLocation().catch(() => null));

      if (currentLocation) {
        const syncError = await syncTeamLocation(currentLocation);

        if (syncError) {
          setActionError(syncError);
        }
      }

      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();

      if (!cameraPermission.granted) {
        setActionError("Brak dostępu do kamery. Włącz uprawnienie kamery w ustawieniach systemu.");
        return;
      }

      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });

      if (cameraResult.canceled) {
        setActionMessage("Uruchomienie kamery anulowane.");
        return;
      }

      setActionMessage("Zdjęcie wykonane.");
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Nie udało się uruchomić kamery."));
    } finally {
      setIsCameraActivating(false);
    }
  }

  function handleEnterStationTest(stationId: string) {
    if (stationIds.includes(stationId)) {
      setSelectedStationId(stationId);
    }
    setActiveStationTestId(stationId);
    setIsStationTestMenuOpen(false);
  }

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
            playerLocation={playerLocation}
            pins={stationPins}
            selectedStationId={selectedStationId}
            focusCoordinate={selectedStationCoordinate}
            onSelectStation={setSelectedStationId}
          />
        )}
      </View>

      <View className="absolute left-3 right-3 top-3">
        <TopRealizationPanel
          companyName={clientDetails?.companyName || session.realization?.companyName || `Realizacja ${session.realizationCode}`}
          scheduledAt={sessionState.realization.scheduledAt}
          logoUrl={clientDetails?.logoUrl || undefined}
          clientType={clientDetails?.type || undefined}
          teamCount={clientDetails?.teamCount ?? session.realization?.teamCount}
          peopleCount={clientDetails?.peopleCount || undefined}
          locationRequired={sessionState.realization.locationRequired}
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
                        borderColor: item.done ? "#34d399" : EXPEDITION_THEME.border,
                        backgroundColor: item.done ? "rgba(52, 211, 153, 0.2)" : "rgba(15, 23, 42, 0.2)",
                      }}
                    >
                      {item.done ? <Text className="text-[10px] font-bold text-emerald-300">✓</Text> : null}
                    </View>
                    <Text className="flex-1 text-xs" style={{ color: EXPEDITION_THEME.textPrimary }} numberOfLines={1}>
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

      <View className="absolute bottom-4 left-3 right-3 items-center">
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
            onActivateCamera={() => void handleCameraActivation()}
            isCameraActivating={isCameraActivating}
          />
        </View>

        {(errorMessage || locationError || actionError || clientInfoError || stationCatalogError || actionMessage || isClientDetailsLoading) && (
          <View
            className="mt-2 w-full max-w-[560px] rounded-2xl border px-3 py-2"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.88)" }}
          >
            {isClientDetailsLoading && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.textMuted }}>
                Pobieranie szczegółów klienta...
              </Text>
            )}
            {errorMessage && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.danger }}>
                {errorMessage}
              </Text>
            )}
            {locationError && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.danger }}>
                {locationError}
              </Text>
            )}
            {clientInfoError && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.danger }}>
                {clientInfoError}
              </Text>
            )}
            {stationCatalogError && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.danger }}>
                {stationCatalogError}
              </Text>
            )}
            {actionError && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.danger }}>
                {actionError}
              </Text>
            )}
            {actionMessage && (
              <Text className="text-xs text-center" style={{ color: EXPEDITION_THEME.accentStrong }}>
                {actionMessage}
              </Text>
            )}
          </View>
        )}
      </View>

      <StationTestMenuOverlay
        visible={isStationTestMenuOpen}
        stations={stationTestEntries}
        onClose={() => setIsStationTestMenuOpen(false)}
        onEnterStation={handleEnterStationTest}
      />

      <StationPreviewOverlay station={activeStationTest} onClose={() => setActiveStationTestId(null)} />

      {onRestart ? (
        <Pressable
          className="absolute right-3 top-3 rounded-full border px-3 py-2 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.88)" }}
          onPress={onRestart}
        >
          <Text className="text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            ↺
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
