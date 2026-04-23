import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type OnboardingSession,
  type RealizationLanguage,
  type RealizationLanguageOption,
} from "../../onboarding/model/types";
import {
  getApiErrorMessage,
} from "../api/mobile-session.api";
import { BottomCountdownPanel } from "../components/bottom-countdown-panel";
import { ExpeditionMap } from "../components/expedition-map";
import { QrScannerOverlay } from "../components/qr-scanner-overlay";
import {
  QuizPrestartOverlay,
  RealizationFinishOverlay,
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
  onSelectedLanguageChange?: (language: RealizationLanguage) => void;
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

const EXPEDITION_STAGE_TEXT: Record<
  UiLanguage,
  {
    stationLabelPrefix: string;
    stationTypeTimed: string;
    stationTypePoints: string;
    stationTypeAudioQuiz: string;
    stationTypeHangman: string;
    stationTypeCaesar: string;
    stationTypeMatching: string;
    stationTypeQuiz: string;
    realizationEndedScannerBlocked: string;
    qrScannerReady: string;
    openScannerFailed: string;
    realizationEndedTasksBlocked: string;
    qrTokenReadFailed: string;
    processQrFailed: string;
    scannedStation: string;
    realizationEndedCannotOpenStations: string;
    noStationsForPopupPreview: string;
    successPopupPreview: string;
    failedPopupPreview: string;
    realizationEndedCannotStartTasks: string;
    taskTimerStarted: string;
    taskAlreadyFailedAfterClose: string;
    taskCompleted: string;
    timedTaskAlertTitle: string;
    timedTaskAlertBody: string;
    timedTaskAlertBack: string;
    timedTaskAlertCloseAndFail: string;
    taskMarkedFailed: string;
    taskTimeExpired: string;
    loadingMap: string;
    realizationPrefix: string;
    tasks: string;
    testMenu: string;
    teamDefaultName: string;
    qrScanCanceled: string;
    chooseContentLanguage: string;
    contentLanguageSet: string;
    close: string;
  }
> = {
  polish: {
    stationLabelPrefix: "Stanowisko",
    stationTypeTimed: "Na czas",
    stationTypePoints: "Na punkty",
    stationTypeAudioQuiz: "Quiz audio",
    stationTypeHangman: "Wisielec",
    stationTypeCaesar: "Szyfr Cezara",
    stationTypeMatching: "Łączenie par",
    stationTypeQuiz: "Quiz",
    realizationEndedScannerBlocked: "Realizacja została zakończona. Skanowanie QR jest zablokowane.",
    qrScannerReady: "Skaner QR gotowy.",
    openScannerFailed: "Nie udało się otworzyć skanera.",
    realizationEndedTasksBlocked: "Realizacja została zakończona. Dalsze zadania są zablokowane.",
    qrTokenReadFailed: "Nie udało się odczytać tokenu z kodu QR.",
    processQrFailed: "Nie udało się przetworzyć kodu QR.",
    scannedStation: "Zeskanowano stanowisko: {name}",
    realizationEndedCannotOpenStations: "Realizacja została zakończona. Nie można otwierać stanowisk.",
    noStationsForPopupPreview: "Brak stanowisk do podglądu popupu.",
    successPopupPreview: "Podgląd popupu zaliczonego zadania.",
    failedPopupPreview: "Podgląd popupu niezaliczonego zadania.",
    realizationEndedCannotStartTasks: "Realizacja została zakończona. Nie można uruchamiać nowych zadań.",
    taskTimerStarted: "Licznik zadania uruchomiony.",
    taskAlreadyFailedAfterClose: "To zadanie zostało oznaczone jako niezaliczone po zamknięciu stanowiska.",
    taskCompleted: "Zadanie zaliczone.",
    timedTaskAlertTitle: "Uwaga: opuszczenie stanowiska",
    timedTaskAlertBody: "Jeśli zamkniesz stanowisko bez ukończenia, zadanie zostanie oznaczone jako niezaliczone.",
    timedTaskAlertBack: "Wróć",
    timedTaskAlertCloseAndFail: "Zamknij i nie zaliczaj",
    taskMarkedFailed: "Zadanie zostało oznaczone jako niezaliczone.",
    taskTimeExpired: "Czas na ukończenie zadania się skończył. Zadanie nie zostało zaliczone.",
    loadingMap: "Ładowanie mapy...",
    realizationPrefix: "Realizacja",
    tasks: "Zadania",
    testMenu: "Menu testowe",
    teamDefaultName: "Drużyna",
    qrScanCanceled: "Skanowanie QR anulowane.",
    chooseContentLanguage: "Wybierz język treści",
    contentLanguageSet: "Język treści: {label}",
    close: "Zamknij",
  },
  english: {
    stationLabelPrefix: "Station",
    stationTypeTimed: "Timed",
    stationTypePoints: "Points",
    stationTypeAudioQuiz: "Audio quiz",
    stationTypeHangman: "Hangman",
    stationTypeCaesar: "Caesar cipher",
    stationTypeMatching: "Matching pairs",
    stationTypeQuiz: "Quiz",
    realizationEndedScannerBlocked: "The realization has ended. QR scanning is blocked.",
    qrScannerReady: "QR scanner is ready.",
    openScannerFailed: "Failed to open scanner.",
    realizationEndedTasksBlocked: "The realization has ended. Further tasks are blocked.",
    qrTokenReadFailed: "Could not read a token from the QR code.",
    processQrFailed: "Could not process the QR code.",
    scannedStation: "Scanned station: {name}",
    realizationEndedCannotOpenStations: "The realization has ended. Stations cannot be opened.",
    noStationsForPopupPreview: "No stations available for popup preview.",
    successPopupPreview: "Preview of passed task popup.",
    failedPopupPreview: "Preview of failed task popup.",
    realizationEndedCannotStartTasks: "The realization has ended. New tasks cannot be started.",
    taskTimerStarted: "Task timer started.",
    taskAlreadyFailedAfterClose: "This task was marked as failed after closing the station.",
    taskCompleted: "Task completed.",
    timedTaskAlertTitle: "Warning: leaving station",
    timedTaskAlertBody: "If you close the station before completion, the task will be marked as failed.",
    timedTaskAlertBack: "Back",
    timedTaskAlertCloseAndFail: "Close and fail",
    taskMarkedFailed: "The task was marked as failed.",
    taskTimeExpired: "Time to complete the task has expired. The task was not completed.",
    loadingMap: "Loading map...",
    realizationPrefix: "Realization",
    tasks: "Tasks",
    testMenu: "Test menu",
    teamDefaultName: "Team",
    qrScanCanceled: "QR scanning canceled.",
    chooseContentLanguage: "Choose content language",
    contentLanguageSet: "Content language: {label}",
    close: "Close",
  },
  ukrainian: {
    stationLabelPrefix: "Станція",
    stationTypeTimed: "На час",
    stationTypePoints: "На бали",
    stationTypeAudioQuiz: "Аудіо-вікторина",
    stationTypeHangman: "Шибениця",
    stationTypeCaesar: "Шифр Цезаря",
    stationTypeMatching: "Поєднання пар",
    stationTypeQuiz: "Вікторина",
    realizationEndedScannerBlocked: "Реалізацію завершено. Сканування QR заблоковано.",
    qrScannerReady: "QR-сканер готовий.",
    openScannerFailed: "Не вдалося відкрити сканер.",
    realizationEndedTasksBlocked: "Реалізацію завершено. Подальші завдання заблоковано.",
    qrTokenReadFailed: "Не вдалося зчитати токен із QR-коду.",
    processQrFailed: "Не вдалося обробити QR-код.",
    scannedStation: "Скановано станцію: {name}",
    realizationEndedCannotOpenStations: "Реалізацію завершено. Не можна відкривати станції.",
    noStationsForPopupPreview: "Немає станцій для попереднього перегляду popup.",
    successPopupPreview: "Попередній перегляд popup зарахованого завдання.",
    failedPopupPreview: "Попередній перегляд popup незарахованого завдання.",
    realizationEndedCannotStartTasks: "Реалізацію завершено. Не можна запускати нові завдання.",
    taskTimerStarted: "Таймер завдання запущено.",
    taskAlreadyFailedAfterClose: "Це завдання позначено як незараховане після закриття станції.",
    taskCompleted: "Завдання зараховано.",
    timedTaskAlertTitle: "Увага: вихід зі станції",
    timedTaskAlertBody: "Якщо закрити станцію без завершення, завдання буде позначено як незараховане.",
    timedTaskAlertBack: "Назад",
    timedTaskAlertCloseAndFail: "Закрити й не зараховувати",
    taskMarkedFailed: "Завдання позначено як незараховане.",
    taskTimeExpired: "Час на виконання завдання вичерпано. Завдання не зараховано.",
    loadingMap: "Завантаження мапи...",
    realizationPrefix: "Реалізація",
    tasks: "Завдання",
    testMenu: "Тестове меню",
    teamDefaultName: "Команда",
    qrScanCanceled: "Сканування QR скасовано.",
    chooseContentLanguage: "Оберіть мову вмісту",
    contentLanguageSet: "Мова вмісту: {label}",
    close: "Закрити",
  },
  russian: {
    stationLabelPrefix: "Станция",
    stationTypeTimed: "На время",
    stationTypePoints: "На очки",
    stationTypeAudioQuiz: "Аудиовикторина",
    stationTypeHangman: "Виселица",
    stationTypeCaesar: "Шифр Цезаря",
    stationTypeMatching: "Сопоставление пар",
    stationTypeQuiz: "Викторина",
    realizationEndedScannerBlocked: "Реализация завершена. Сканирование QR заблокировано.",
    qrScannerReady: "QR-сканер готов.",
    openScannerFailed: "Не удалось открыть сканер.",
    realizationEndedTasksBlocked: "Реализация завершена. Дальнейшие задания заблокированы.",
    qrTokenReadFailed: "Не удалось считать токен из QR-кода.",
    processQrFailed: "Не удалось обработать QR-код.",
    scannedStation: "Сканирована станция: {name}",
    realizationEndedCannotOpenStations: "Реализация завершена. Нельзя открывать станции.",
    noStationsForPopupPreview: "Нет станций для предпросмотра popup.",
    successPopupPreview: "Предпросмотр popup зачтённого задания.",
    failedPopupPreview: "Предпросмотр popup незачтённого задания.",
    realizationEndedCannotStartTasks: "Реализация завершена. Нельзя запускать новые задания.",
    taskTimerStarted: "Таймер задания запущен.",
    taskAlreadyFailedAfterClose: "Это задание было отмечено как незачтённое после закрытия станции.",
    taskCompleted: "Задание зачтено.",
    timedTaskAlertTitle: "Внимание: выход со станции",
    timedTaskAlertBody: "Если закрыть станцию без выполнения, задание будет отмечено как незачтённое.",
    timedTaskAlertBack: "Назад",
    timedTaskAlertCloseAndFail: "Закрыть и не засчитывать",
    taskMarkedFailed: "Задание отмечено как незачтённое.",
    taskTimeExpired: "Время на выполнение задания истекло. Задание не зачтено.",
    loadingMap: "Загрузка карты...",
    realizationPrefix: "Реализация",
    tasks: "Задания",
    testMenu: "Тестовое меню",
    teamDefaultName: "Команда",
    qrScanCanceled: "Сканирование QR отменено.",
    chooseContentLanguage: "Выберите язык контента",
    contentLanguageSet: "Язык контента: {label}",
    close: "Закрыть",
  },
};

const POPUP_MIN_DURATION_MS = 6_500;
const POPUP_MAX_DURATION_MS = 12_000;
const POPUP_MS_PER_CHAR = 45;

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

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

function resolveStationLabel(
  stationId: string,
  stationName: string | undefined,
  text: Pick<(typeof EXPEDITION_STAGE_TEXT)["polish"], "stationLabelPrefix">,
) {
  return stationName?.trim() ? stationName : `${text.stationLabelPrefix} ${stationId}`;
}

function resolveStationTypeLabel(
  stationType: ExpeditionStationType | undefined,
  text: Pick<
    (typeof EXPEDITION_STAGE_TEXT)["polish"],
    | "stationTypeTimed"
    | "stationTypePoints"
    | "stationTypeAudioQuiz"
    | "stationTypeHangman"
    | "stationTypeCaesar"
    | "stationTypeMatching"
    | "stationTypeQuiz"
  >,
) {
  if (stationType === "time") {
    return text.stationTypeTimed;
  }

  if (stationType === "points") {
    return text.stationTypePoints;
  }

  if (stationType === "wordle") {
    return "Wordle";
  }

  if (stationType === "hangman") {
    return text.stationTypeHangman;
  }

  if (stationType === "audio-quiz") {
    return text.stationTypeAudioQuiz;
  }

  if (stationType === "mastermind") {
    return "Mastermind";
  }

  if (stationType === "anagram") {
    return "Anagram";
  }

  if (stationType === "caesar-cipher") {
    return text.stationTypeCaesar;
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
    return text.stationTypeMatching;
  }

  return text.stationTypeQuiz;
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

function resolveRealizationDeadlineIso(scheduledAt: string, durationMinutes: number) {
  const scheduledAtMs = new Date(scheduledAt).getTime();
  if (!Number.isFinite(scheduledAtMs)) {
    return null;
  }

  const safeDurationMinutes = Math.max(1, Math.round(durationMinutes) || 1);
  return new Date(scheduledAtMs + safeDurationMinutes * 60_000).toISOString();
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

export function ExpeditionStageScreen({
  session,
  onSessionInvalid,
  onSelectedLanguageChange,
}: ExpeditionStageScreenProps) {
  const insets = useSafeAreaInsets();
  const uiLanguage = useUiLanguage();
  const text = EXPEDITION_STAGE_TEXT[uiLanguage];
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const shortestEdge = Math.min(viewportWidth, viewportHeight);
  const isTabletLayout = viewportWidth >= 900 || shortestEdge >= 700;
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
  const [isFinishPreviewOpen, setIsFinishPreviewOpen] = useState(false);
  const [activeStationTestId, setActiveStationTestId] = useState<string | null>(null);
  const [pendingQuizStartStationId, setPendingQuizStartStationId] = useState<string | null>(null);
  const [pendingTimeStartStationId, setPendingTimeStartStationId] = useState<string | null>(null);
  const [isStartingPendingQuiz, setIsStartingPendingQuiz] = useState(false);
  const [isStartingPendingTime, setIsStartingPendingTime] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [timedCloseConfirmStation, setTimedCloseConfirmStation] = useState<{
    stationId: string;
    startedAt: string | null;
  } | null>(null);
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

  const { playerLocation, locationError, requestCurrentLocation } = usePlayerLocation();
  const mapPlayerLocation = useMemo(() => {
    return playerLocation ?? null;
  }, [playerLocation]);
  const mapCenterCoordinate = useMemo(() => {
    if (mapPlayerLocation) {
      return toCoordinate(mapPlayerLocation.latitude, mapPlayerLocation.longitude);
    }

    return mapAnchor ?? DEFAULT_MAP_ANCHOR;
  }, [mapAnchor, mapPlayerLocation]);

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

    if (stationCoordinateAnchor) {
      setMapAnchor(stationCoordinateAnchor);
      return;
    }

    if (!isLoading) {
      setMapAnchor(DEFAULT_MAP_ANCHOR);
    }
  }, [isLoading, mapAnchor, playerLocation, stationCoordinateAnchor]);

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
          label: resolveStationLabel(stationId, metadata?.name, text),
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
      text,
    ],
  );

  const selectedStationLabel = selectedStationId
    ? resolveStationLabel(selectedStationId, stationMetadataMap[selectedStationId]?.name, text)
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
        label: resolveStationLabel(task.stationId, stationMetadataMap[task.stationId]?.name, text),
        done: task.status === "done",
        failed: task.status !== "done" && failedTaskIds.has(task.stationId),
      })),
    [failedTaskIds, sessionState.tasks, stationMetadataMap, text],
  );
  const stationTestEntries = useMemo<StationTestViewModel[]>(
    () => {
      const catalogStations = sessionState.realization.stations;
      const baseEntries =
        catalogStations.length > 0
          ? catalogStations.map((stationCatalog) => {
              const task = taskByStationId[stationCatalog.id];
              const stationName = resolveStationLabel(stationCatalog.id, stationCatalog.name, text);
              const stationType = stationCatalog.type || "quiz";

              return {
                stationId: stationCatalog.id,
                stationType: normalizeStationType(stationType),
                name: stationName,
                typeLabel: resolveStationTypeLabel(stationType, text),
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
              const stationName = resolveStationLabel(stationId, metadata?.name, text);
              const stationType = metadata?.type || "quiz";

              return {
                stationId,
                stationType: normalizeStationType(stationType),
                name: stationName,
                typeLabel: resolveStationTypeLabel(stationType, text),
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
      text,
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
  const teamName = sessionState.team.name?.trim() || session.team.name || text.teamDefaultName;
  const teamIcon = session.team.icon.trim().length > 0 ? session.team.icon : "🏁";
  const selectedLanguage =
    session.selectedLanguage ??
    sessionState.realization.selectedLanguage ??
    session.realization?.selectedLanguage ??
    sessionState.realization.language ??
    session.realization?.language ??
    "polish";

  useEffect(() => {
    if (!onSelectedLanguageChange || session.selectedLanguage) {
      return;
    }

    const runtimeLanguage = sessionState.realization.selectedLanguage ?? sessionState.realization.language;
    if (!runtimeLanguage) {
      return;
    }

    onSelectedLanguageChange(runtimeLanguage);
  }, [
    onSelectedLanguageChange,
    session.selectedLanguage,
    sessionState.realization.language,
    sessionState.realization.selectedLanguage,
  ]);

  const availableLanguageOptions = useMemo<RealizationLanguageOption[]>(() => {
    if (
      sessionState.realization.availableLanguages &&
      sessionState.realization.availableLanguages.length > 0
    ) {
      return sessionState.realization.availableLanguages;
    }

    if (
      session.realization?.availableLanguages &&
      session.realization.availableLanguages.length > 0
    ) {
      return session.realization.availableLanguages;
    }

    return [
      {
        value: selectedLanguage,
        label:
          selectedLanguage === "other"
            ? session.realization?.customLanguage?.trim() ||
              getRealizationLanguageLabel(selectedLanguage)
            : getRealizationLanguageLabel(selectedLanguage),
      },
    ];
  }, [
    selectedLanguage,
    session.realization?.availableLanguages,
    session.realization?.customLanguage,
    sessionState.realization.availableLanguages,
  ]);
  const hasMultipleLanguageOptions = availableLanguageOptions.length > 1;
  const currentLanguageOption =
    availableLanguageOptions.find((option) => option.value === selectedLanguage) ??
    availableLanguageOptions[0] ??
    null;
  const currentLanguageFlag = getRealizationLanguageFlag(currentLanguageOption?.value ?? "polish");
  const countdown = useRealizationCountdown(
    sessionState.realization.scheduledAt,
    sessionState.realization.durationMinutes,
  );
  const localDeadlineAt = useMemo(
    () => resolveRealizationDeadlineIso(sessionState.realization.scheduledAt, sessionState.realization.durationMinutes),
    [sessionState.realization.durationMinutes, sessionState.realization.scheduledAt],
  );
  const hasAllTasksResolved = taskTotal > 0 && completedTasks >= taskTotal;
  const localEndReason =
    countdown.isCompleted
      ? ("time-expired" as const)
      : hasAllTasksResolved
        ? ("all-tasks-completed" as const)
        : null;
  const isSessionEnded = sessionState.endState.isEnded || Boolean(localEndReason);
  const sessionEndReason = sessionState.endState.reason ?? localEndReason;
  const sessionEndedAt =
    sessionState.endState.endedAt ??
    (localEndReason === "time-expired" ? localDeadlineAt : null);

  useEffect(() => {
    if (!isSessionEnded) {
      return;
    }

    setIsFinishPreviewOpen(false);
  }, [isSessionEnded]);

  useEffect(() => {
    if (!hasMultipleLanguageOptions && isLanguagePickerOpen) {
      setIsLanguagePickerOpen(false);
    }
  }, [hasMultipleLanguageOptions, isLanguagePickerOpen]);

  useEffect(() => {
    if (!timedCloseConfirmStation) {
      return;
    }

    if (!activeStationTestId || activeStationTestId !== timedCloseConfirmStation.stationId) {
      setTimedCloseConfirmStation(null);
    }
  }, [activeStationTestId, timedCloseConfirmStation]);

  async function handleOpenQrScanner() {
    if (isSessionEnded) {
      setActionError(text.realizationEndedScannerBlocked);
      return;
    }

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
      setActionMessage(text.qrScannerReady);
    } catch (error) {
      setActionError(getApiErrorMessage(error, text.openScannerFailed));
    } finally {
      setIsScannerOpening(false);
    }
  }

  const handleQrDetected = useCallback(
    async (rawValue: string) => {
      if (isSessionEnded) {
        setActionError(text.realizationEndedTasksBlocked);
        return;
      }

      if (isQrResolving) {
        return;
      }

      setActionError(null);
      setActionMessage(null);
      setIsQrResolving(true);

      try {
        const token = extractStationQrToken(rawValue);
        if (!token) {
          setActionError(text.qrTokenReadFailed);
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
        setActionMessage(interpolate(text.scannedStation, { name: result.station.name }));
      } catch (error) {
        setActionError(getApiErrorMessage(error, text.processQrFailed));
      } finally {
        setIsQrResolving(false);
      }
    },
    [isQrResolving, isSessionEnded, resolveStationQrToken, text],
  );

  function handleSelectStationFromMap(stationId: string) {
    setSelectedStationId(stationId);
  }

  function handleEnterStationTest(stationId: string) {
    if (isSessionEnded) {
      setActionError(text.realizationEndedCannotOpenStations);
      setIsStationTestMenuOpen(false);
      return;
    }

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
        setActionError(text.noStationsForPopupPreview);
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
            ? text.successPopupPreview
            : text.failedPopupPreview,
      });
    },
    [stationTestEntries, text.failedPopupPreview, text.noStationsForPopupPreview, text.successPopupPreview],
  );

  const handleStartStationTestTask = useCallback(
    async (stationId: string) => {
      if (isSessionEnded) {
        return text.realizationEndedCannotStartTasks;
      }

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

      setActionMessage(text.taskTimerStarted);
      return null;
    },
    [isSessionEnded, startStationTask, text.realizationEndedCannotStartTasks, text.taskTimerStarted],
  );

  const handleCompleteStationTestTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string) => {
      setActionError(null);
      setActionMessage(null);

      if (taskByStationId[stationId]?.status === "failed") {
        return text.taskAlreadyFailedAfterClose;
      }

      const result = await completeStationTask(stationId, completionCode, startedAt);
      if (result) {
        if (!isInvalidCompletionCodeError(result)) {
          setActionError(result);
        }
        return result;
      }

      setActionMessage(text.taskCompleted);
      return null;
    },
    [completeStationTask, taskByStationId, text.taskAlreadyFailedAfterClose, text.taskCompleted],
  );

  const handleRequestCloseActiveStation = useCallback(() => {
    if (!activeStationTest) {
      setActiveStationTestId(null);
      return;
    }

    const isAlreadyDone = activeStationTest.status === "done" || activeStationTest.status === "failed";
    const hasTimeLimit = activeStationTest.timeLimitSeconds > 0;
    const isInteractiveQuiz = isInteractiveQuizStationType(activeStationTest.stationType);
    const shouldRequireFailConfirmation = hasTimeLimit || isInteractiveQuiz;
    if (isAlreadyDone || !shouldRequireFailConfirmation) {
      setActiveStationTestId(null);
      return;
    }

    const stationId = activeStationTest.stationId;
    const startedAt = activeStationTest.startedAt ?? localStartedAtByStationId[stationId] ?? null;
    setTimedCloseConfirmStation({ stationId, startedAt });
  }, [activeStationTest, localStartedAtByStationId]);

  const handleTimeStationExpired = useCallback(
    (stationId: string) => {
      const startedAt = taskByStationId[stationId]?.startedAt ?? localStartedAtByStationId[stationId];
      void failStationTask(stationId, "time_limit_expired", startedAt).then((error) => {
        if (error) {
          setActionError(error);
          return;
        }
        setActionError(text.taskTimeExpired);
      });
    },
    [failStationTask, localStartedAtByStationId, taskByStationId, text.taskTimeExpired],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <View className="absolute inset-0">
        {isLoading ? (
          <View className="flex-1 items-center justify-center gap-3" style={{ backgroundColor: EXPEDITION_THEME.panelMuted }}>
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
            <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.loadingMap}
            </Text>
          </View>
        ) : (
          <ExpeditionMap
            centerCoordinate={mapCenterCoordinate}
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
          companyName={
            sessionState.realization.companyName ||
            session.realization?.companyName ||
            `${text.realizationPrefix} ${session.realizationCode}`
          }
          logoUrl={sessionState.realization.logoUrl}
          teamName={teamName}
          teamSlot={sessionState.team.slotNumber ?? session.team.slotNumber}
          teamColorHex={teamColorHex}
          teamColorLabel={teamColorLabel}
          teamIcon={teamIcon}
          points={sessionState.team.points}
        />

        <View className="mt-2 items-end">
          {hasMultipleLanguageOptions ? (
            <Pressable
              className="mb-2 h-11 w-11 items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.9)" }}
              onPress={() => setIsLanguagePickerOpen(true)}
            >
              <Text className="text-xl">{currentLanguageFlag}</Text>
            </Pressable>
          ) : null}

          <View
            className="w-56 rounded-2xl border px-3 py-2"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(22, 41, 33, 0.9)" }}
          >
            <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
              {text.tasks}
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
              {text.testMenu}
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
            isInteractionDisabled={isSessionEnded}
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
        onOpenFinishScreen={() => {
          setIsStationTestMenuOpen(false);
          setIsFinishPreviewOpen(true);
        }}
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

      <RealizationFinishOverlay
        visible={isSessionEnded || isFinishPreviewOpen}
        reason={isSessionEnded ? sessionEndReason : "manual-preview"}
        endedAt={isSessionEnded ? sessionEndedAt : null}
        leaderboardEntries={sessionState.leaderboard.entries}
        currentTeamId={sessionState.team.id}
        showLeaderboard={sessionState.realization.showLeaderboard}
        canClose={!isSessionEnded && isFinishPreviewOpen}
        onClose={() => setIsFinishPreviewOpen(false)}
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
          setActionMessage((current) => current || text.qrScanCanceled);
        }}
      />

      <Modal
        visible={Boolean(timedCloseConfirmStation)}
        transparent
        animationType="fade"
        onRequestClose={() => setTimedCloseConfirmStation(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", paddingHorizontal: isTabletLayout ? 36 : 24 }}
          onPress={() => setTimedCloseConfirmStation(null)}
        >
          <Pressable
            className="w-full border"
            style={{
              maxWidth: isTabletLayout ? 760 : 460,
              borderRadius: isTabletLayout ? 28 : 18,
              paddingHorizontal: isTabletLayout ? 28 : 20,
              paddingVertical: isTabletLayout ? 26 : 20,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: isTabletLayout ? 28 : 18 }}>
              {text.timedTaskAlertTitle}
            </Text>
            <Text
              className="mt-2"
              style={{ color: EXPEDITION_THEME.textMuted, fontSize: isTabletLayout ? 19 : 14, lineHeight: isTabletLayout ? 30 : 24 }}
            >
              {text.timedTaskAlertBody}
            </Text>

            <View className="mt-5 flex-row" style={{ columnGap: isTabletLayout ? 14 : 8 }}>
              <Pressable
                className="flex-1 items-center justify-center border active:opacity-90"
                style={{
                  borderRadius: isTabletLayout ? 16 : 12,
                  minHeight: isTabletLayout ? 62 : 48,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
                onPress={() => setTimedCloseConfirmStation(null)}
              >
                <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: isTabletLayout ? 19 : 14 }}>
                  {text.timedTaskAlertBack}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 items-center justify-center border active:opacity-90"
                style={{
                  borderRadius: isTabletLayout ? 16 : 12,
                  minHeight: isTabletLayout ? 62 : 48,
                  borderColor: "rgba(239, 68, 68, 0.7)",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                }}
                onPress={() => {
                  const station = timedCloseConfirmStation;
                  if (!station) {
                    return;
                  }

                  setTimedCloseConfirmStation(null);
                  void failStationTask(
                    station.stationId,
                    "task_closed_before_completion",
                    station.startedAt ?? undefined,
                  ).then((error) => {
                    if (error) {
                      setActionError(error);
                    } else {
                      setActionMessage(text.taskMarkedFailed);
                    }
                    setActiveStationTestId(null);
                  });
                }}
              >
                <Text className="font-semibold" style={{ color: "#fecaca", fontSize: isTabletLayout ? 19 : 14 }}>
                  {text.timedTaskAlertCloseAndFail}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
          onPress={() => setIsLanguagePickerOpen(false)}
        >
          <Pressable
            className="w-full self-center rounded-2xl border px-4 py-4"
            style={{
              maxWidth: 360,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.chooseContentLanguage}
            </Text>
            <View className="mt-3 gap-2">
              {availableLanguageOptions.map((option) => {
                const isActive = option.value === selectedLanguage;
                return (
                  <Pressable
                    key={`expedition-language-popup-${option.value}`}
                    className="flex-row items-center justify-between rounded-xl border px-3 py-2 active:opacity-90"
                    style={{
                      borderColor: isActive ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                      backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => {
                      if (option.value !== selectedLanguage) {
                        onSelectedLanguageChange?.(option.value);
                        setActionError(null);
                        setActionMessage(interpolate(text.contentLanguageSet, { label: option.label }));
                      }
                      setIsLanguagePickerOpen(false);
                    }}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lg">{getRealizationLanguageFlag(option.value)}</Text>
                      <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {option.label}
                      </Text>
                    </View>
                    {isActive ? (
                      <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              className="mt-3 rounded-xl border px-3 py-2 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsLanguagePickerOpen(false)}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {text.close}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}
