import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import {
  EXPEDITION_THEME,
  TEAM_COLORS,
  getExpeditionThemeMode,
  type ExpeditionThemeMode,
} from "../../onboarding/model/constants";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type OnboardingSession,
  type RealizationLanguage,
  type RealizationLanguageOption,
} from "../../onboarding/model/types";
import { BottomCountdownPanel } from "../components/bottom-countdown-panel";
import { ExpeditionMap } from "../components/expedition-map";
import {
  type StationTestType,
  type StationTestViewModel,
} from "../components/station-overlays";
import { TopRealizationPanel } from "../components/top-realization-panel";
import { useExpeditionSession, usePlayerLocation, useRealizationCountdown } from "../hooks";
import { DEFAULT_MAP_ANCHOR } from "../model/station-pin-layout";
import {
  DEFAULT_STATION_PIN_CUSTOMIZATION,
  type ExpeditionTask,
  type ExpeditionStationType,
  resolveDefaultStationPoints,
  type ExpeditionTaskStatus,
  type MapCoordinate,
} from "../model/types";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { ExpeditionStageOverlayLayer } from "./expedition-stage-overlay-layer";
import { ExpeditionStageOverlayProvider, ExpeditionStageSessionProvider } from "./expedition-stage-context";
import { useExpeditionStageQrFlow } from "./hooks/use-expedition-stage-qr-flow";
import { useExpeditionStageOverlayFlow } from "./hooks/use-expedition-stage-overlay-flow";
import { useExpeditionStageTransientPopup } from "./hooks/use-expedition-stage-transient-popup";

type ExpeditionStageScreenProps = {
  session: OnboardingSession;
  onSessionInvalid?: (reason?: string) => void;
  onSelectedLanguageChange?: (language: RealizationLanguage) => void;
  themeMode: ExpeditionThemeMode;
  onToggleTheme: () => void;
};

const LOCATION_SYNC_THROTTLE_MS = 10_000;

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

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function toCoordinate(latitude: number, longitude: number): MapCoordinate {
  return { latitude, longitude };
}

function areCoordinatesEqual(left: MapCoordinate | null, right: MapCoordinate | null) {
  if (!left || !right) {
    return false;
  }

  return left.latitude === right.latitude && left.longitude === right.longitude;
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

function buildPinIconSvg(svgBody: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`;
}

// Monochrome map pin icons sourced from Lucide (https://unpkg.com/lucide-static).
const PIN_ICON_SVGS = {
  done: buildPinIconSvg(
    '<path d="M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5" /><path d="m9 11 3 3L22 4" />',
  ),
  failed: buildPinIconSvg(
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />',
  ),
  quiz: buildPinIconSvg(
    '<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />',
  ),
  "audio-quiz": buildPinIconSvg(
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />',
  ),
  time: buildPinIconSvg('<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 12" />'),
  points: buildPinIconSvg('<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />'),
  wordle: buildPinIconSvg(
    '<rect width="18" height="14" x="3" y="5" rx="2" ry="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" />',
  ),
  hangman: buildPinIconSvg('<circle cx="12" cy="5" r="1" /><path d="m9 20 3-6 3 6" /><path d="m6 8 6 2 6-2" /><path d="M12 10v4" />'),
  mastermind: buildPinIconSvg(
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3" /><path d="M9 11.2h5.7" />',
  ),
  anagram: buildPinIconSvg(
    '<path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" /><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" /><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />',
  ),
  "caesar-cipher": buildPinIconSvg(
    '<circle cx="12" cy="16" r="1" /><rect x="3" y="10" width="18" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 10 0v3" />',
  ),
  memory: buildPinIconSvg(
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />',
  ),
  simon: buildPinIconSvg(
    '<line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />',
  ),
  rebus: buildPinIconSvg(
    '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />',
  ),
  boggle: buildPinIconSvg(
    '<path d="M15 12h6" /><path d="M15 6h6" /><path d="m3 13 3.553-7.724a.5.5 0 0 1 .894 0L11 13" /><path d="M3 18h18" /><path d="M4 11h6" />',
  ),
  "mini-sudoku": buildPinIconSvg(
    '<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />',
  ),
  matching: buildPinIconSvg('<path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />'),
} as const;

function resolveStationVisual(stationType: ExpeditionStationType | undefined, status: ExpeditionTaskStatus) {
  if (status === "done") {
    return { icon: PIN_ICON_SVGS.done, color: "#10b981" };
  }

  if (status === "failed") {
    return { icon: PIN_ICON_SVGS.failed, color: "#ef4444" };
  }

  if (stationType === "time") {
    return { icon: PIN_ICON_SVGS.time, color: "#3b82f6" };
  }

  if (stationType === "points") {
    return { icon: PIN_ICON_SVGS.points, color: "#a855f7" };
  }

  if (stationType === "wordle") {
    return { icon: PIN_ICON_SVGS.wordle, color: "#22c55e" };
  }

  if (stationType === "hangman") {
    return { icon: PIN_ICON_SVGS.hangman, color: "#f97316" };
  }

  if (stationType === "mastermind") {
    return { icon: PIN_ICON_SVGS.mastermind, color: "#6366f1" };
  }

  if (stationType === "anagram") {
    return { icon: PIN_ICON_SVGS.anagram, color: "#14b8a6" };
  }

  if (stationType === "caesar-cipher") {
    return { icon: PIN_ICON_SVGS["caesar-cipher"], color: "#0ea5e9" };
  }

  if (stationType === "memory") {
    return { icon: PIN_ICON_SVGS.memory, color: "#8b5cf6" };
  }

  if (stationType === "simon") {
    return { icon: PIN_ICON_SVGS.simon, color: "#ec4899" };
  }

  if (stationType === "rebus") {
    return { icon: PIN_ICON_SVGS.rebus, color: "#f59e0b" };
  }

  if (stationType === "boggle") {
    return { icon: PIN_ICON_SVGS.boggle, color: "#10b981" };
  }

  if (stationType === "mini-sudoku") {
    return { icon: PIN_ICON_SVGS["mini-sudoku"], color: "#ef4444" };
  }

  if (stationType === "matching") {
    return { icon: PIN_ICON_SVGS.matching, color: "#22c55e" };
  }

  if (stationType === "audio-quiz") {
    return { icon: PIN_ICON_SVGS["audio-quiz"], color: "#06b6d4" };
  }

  return stationType === "quiz"
    ? { icon: PIN_ICON_SVGS.quiz, color: "#f59e0b" }
    : DEFAULT_STATION_PIN_CUSTOMIZATION;
}

function resolveStationLabel(
  stationId: string,
  stationName: string | undefined,
  text: Pick<(typeof EXPEDITION_STAGE_TEXT)["polish"], "stationLabelPrefix">,
) {
  return stationName?.trim() ? stationName : `${text.stationLabelPrefix} ${stationId}`;
}

function resolveTeamStationNumbers(stationIds: string[], slotNumber: number) {
  const uniqueStationIds: string[] = [];
  const seenStationIds = new Set<string>();

  for (const stationId of stationIds) {
    const normalizedStationId = stationId.trim();
    if (!normalizedStationId || seenStationIds.has(normalizedStationId)) {
      continue;
    }

    seenStationIds.add(normalizedStationId);
    uniqueStationIds.push(normalizedStationId);
  }

  const stationCount = uniqueStationIds.length;
  const numberByStationId = new Map<string, number>();
  if (stationCount === 0) {
    return numberByStationId;
  }

  const slotOffset = ((Math.max(1, Math.round(slotNumber)) - 1) % stationCount + stationCount) % stationCount;
  uniqueStationIds.forEach((stationId, index) => {
    const stationNumber = ((index - slotOffset + stationCount) % stationCount) + 1;
    numberByStationId.set(stationId, stationNumber);
  });

  return numberByStationId;
}

function formatStationLabelWithNumber(label: string, stationNumber?: number) {
  if (typeof stationNumber !== "number" || !Number.isFinite(stationNumber) || stationNumber <= 0) {
    return label;
  }

  return `${Math.round(stationNumber)}. ${label}`;
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

function isTaskAlreadyCompletedError(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return normalized.includes("task already completed") || normalized.includes("http 409");
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
  themeMode,
  onToggleTheme,
}: ExpeditionStageScreenProps) {
  const insets = useSafeAreaInsets();
  const adaptiveLayout = useAdaptiveLayout();
  const uiLanguage = useUiLanguage();
  const text = EXPEDITION_STAGE_TEXT[uiLanguage];
  const isLightTheme = getExpeditionThemeMode() === "light";
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
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const hasAutoSelectedStationRef = useRef(false);
  const autoLocationSyncTimestampRef = useRef(0);
  const uiChromeOpacity = useRef(new Animated.Value(1)).current;
  const { playerLocation, locationError, requestCurrentLocation } = usePlayerLocation();
  const { transientPopup } = useExpeditionStageTransientPopup({
    errorMessage,
    locationError,
    actionError,
    actionMessage,
  });
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
    const updateMapAnchor = (nextAnchor: MapCoordinate) => {
      setMapAnchor((current) => (areCoordinatesEqual(current, nextAnchor) ? current : nextAnchor));
    };

    const shouldResolveAnchorFromData =
      !mapAnchor ||
      (mapAnchor.latitude === DEFAULT_MAP_ANCHOR.latitude && mapAnchor.longitude === DEFAULT_MAP_ANCHOR.longitude);

    if (!shouldResolveAnchorFromData) {
      return;
    }

    if (playerLocation) {
      updateMapAnchor(toCoordinate(playerLocation.latitude, playerLocation.longitude));
      return;
    }

    if (stationCoordinateAnchor) {
      updateMapAnchor(stationCoordinateAnchor);
      return;
    }

    if (!isLoading) {
      updateMapAnchor(DEFAULT_MAP_ANCHOR);
    }
  }, [isLoading, mapAnchor, playerLocation, stationCoordinateAnchor]);

  const stationIds = useMemo(
    () => sessionState.tasks.map((task) => task.stationId).filter((stationId) => stationId.trim().length > 0),
    [sessionState.tasks],
  );
  const isTeamStationNumberingEnabled = sessionState.realization.teamStationNumberingEnabled;
  const stationNumberById = useMemo(
    () =>
      isTeamStationNumberingEnabled
        ? resolveTeamStationNumbers(stationIds, sessionState.team.slotNumber)
        : new Map<string, number>(),
    [isTeamStationNumberingEnabled, sessionState.team.slotNumber, stationIds],
  );

  useEffect(() => {
    if (selectedStationId) {
      if (stationIds.includes(selectedStationId)) {
        return;
      }

      setSelectedStationId(stationIds[0] ?? null);
      return;
    }

    if (stationIds.length === 0) {
      return;
    }

    if (!hasAutoSelectedStationRef.current) {
      hasAutoSelectedStationRef.current = true;
      setSelectedStationId(stationIds[0]);
    }
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
    if (!isSessionInvalid) {
      return;
    }

    onSessionInvalid?.(sessionInvalidReason ?? undefined);
  }, [isSessionInvalid, onSessionInvalid, sessionInvalidReason]);
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
          label: formatStationLabelWithNumber(
            resolveStationLabel(stationId, metadata?.name, text),
            stationNumberById.get(stationId),
          ),
          stationNumber: stationNumberById.get(stationId),
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
      stationNumberById,
      stationMetadataMap,
      text,
    ],
  );

  const selectedStationLabel = selectedStationId
    ? formatStationLabelWithNumber(
        resolveStationLabel(selectedStationId, stationMetadataMap[selectedStationId]?.name, text),
        stationNumberById.get(selectedStationId),
      )
    : null;
  const completedTasks = sessionState.tasks.filter(
    (task) => task.status === "done" || failedTaskIds.has(task.stationId),
  ).length;
  const taskTotal = sessionState.tasks.length;
  const taskByStationId = useMemo(
    () =>
      sessionState.tasks.reduce<Record<string, ExpeditionTask>>((accumulator, task) => {
        accumulator[task.stationId] = task;
        return accumulator;
      }, {}),
    [sessionState.tasks],
  );
  const checklistItems = useMemo(
    () =>
      sessionState.tasks.map((task) => ({
        stationId: task.stationId,
        label: formatStationLabelWithNumber(
          resolveStationLabel(task.stationId, stationMetadataMap[task.stationId]?.name, text),
          stationNumberById.get(task.stationId),
        ),
        done: task.status === "done",
        failed: task.status !== "done" && failedTaskIds.has(task.stationId),
      })),
    [failedTaskIds, sessionState.tasks, stationMetadataMap, stationNumberById, text],
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
                completionCodeLength: stationCatalog.completionCodeLength,
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
                completionCodeLength: undefined,
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

  const overlayFlow = useExpeditionStageOverlayFlow({
    isSessionEnded,
    stationIds,
    stationTestEntries,
    taskByStationId,
    text: {
      realizationEndedCannotOpenStations: text.realizationEndedCannotOpenStations,
      noStationsForPopupPreview: text.noStationsForPopupPreview,
      successPopupPreview: text.successPopupPreview,
      failedPopupPreview: text.failedPopupPreview,
      realizationEndedCannotStartTasks: text.realizationEndedCannotStartTasks,
      taskTimerStarted: text.taskTimerStarted,
      taskAlreadyFailedAfterClose: text.taskAlreadyFailedAfterClose,
      taskCompleted: text.taskCompleted,
      taskTimeExpired: text.taskTimeExpired,
      taskMarkedFailed: text.taskMarkedFailed,
    },
    startStationTask,
    completeStationTask,
    failStationTask,
    setSelectedStationId,
    setActionError,
    setActionMessage,
    isInteractiveQuizStationType,
    isInvalidCompletionCodeError,
    isTaskAlreadyCompletedError,
  });

  const qrFlow = useExpeditionStageQrFlow({
    isSessionEnded,
    isInteractiveQuizStationType,
    text: {
      realizationEndedScannerBlocked: text.realizationEndedScannerBlocked,
      qrScannerReady: text.qrScannerReady,
      openScannerFailed: text.openScannerFailed,
      realizationEndedTasksBlocked: text.realizationEndedTasksBlocked,
      qrTokenReadFailed: text.qrTokenReadFailed,
      processQrFailed: text.processQrFailed,
      scannedStation: text.scannedStation,
      qrScanCanceled: text.qrScanCanceled,
    },
    playerLocation,
    requestCurrentLocation,
    syncTeamLocation,
    resolveStationQrToken,
    setActionError,
    setActionMessage,
    setSelectedStationId,
    openStationByType: overlayFlow.openStationByType,
    interpolate,
    extractStationQrToken,
  });

  const sessionContextValue = useMemo(
    () => ({
      session,
      sessionState,
      isSessionEnded,
      sessionEndReason,
      sessionEndedAt,
    }),
    [isSessionEnded, session, sessionEndReason, sessionEndedAt, sessionState],
  );
  const overlayContextValue = useMemo(
    () => ({
      stationTestEntries,
      overlayFlow,
      qrFlow,
    }),
    [overlayFlow, qrFlow, stationTestEntries],
  );
  const shouldShowTopLeaderboard =
    sessionState.realization.showLeaderboardDuringGame &&
    sessionState.leaderboard.entries.length > 0;

  useEffect(() => {
    if (!hasMultipleLanguageOptions && isLanguagePickerOpen) {
      setIsLanguagePickerOpen(false);
    }
  }, [hasMultipleLanguageOptions, isLanguagePickerOpen]);

  useEffect(() => {
    uiChromeOpacity.stopAnimation();
    uiChromeOpacity.setValue(0.58);
    Animated.timing(uiChromeOpacity, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [themeMode, uiChromeOpacity]);

  function handleSelectStationFromMap(stationId: string | null) {
    setSelectedStationId(stationId);
  }

  return (
    <ExpeditionStageSessionProvider value={sessionContextValue}>
      <ExpeditionStageOverlayProvider value={overlayContextValue}>
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
            playerIcon={teamIcon}
            playerColor={teamColorHex}
            onSelectStation={handleSelectStationFromMap}
          />
        )}
      </View>

      <Animated.View className="flex-1" pointerEvents="box-none" style={{ opacity: uiChromeOpacity }}>
      <View className="absolute left-3 right-3" style={{ top: insets.top + 12 }}>
        <Pressable onPressIn={overlayFlow.handleTestMenuHoldStart} onPressOut={overlayFlow.handleTestMenuHoldEnd}>
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
            languageFlag={currentLanguageFlag}
            showLanguageButton={hasMultipleLanguageOptions}
            onOpenLanguagePicker={() => setIsLanguagePickerOpen(true)}
            themeMode={themeMode}
            onToggleTheme={onToggleTheme}
            leaderboardEntries={sessionState.leaderboard.entries}
            leaderboardCurrentTeamId={sessionState.team.id}
            showLeaderboardDuringGame={shouldShowTopLeaderboard}
          />
        </Pressable>

        <View className="mt-2 w-full flex-row items-start justify-end">
          <View
            className="rounded-2xl border px-3 py-2"
            style={{
              width: adaptiveLayout.s(164, 146, 196),
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
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
                          : EXPEDITION_THEME.panelStrong,
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

        </View>
      </View>

      <View className="absolute left-3 right-3 items-center" style={{ bottom: insets.bottom + 12 }}>
        {selectedStationLabel ? (
          <View
            className="mb-2 rounded-full border px-3 py-1"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
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
            onOpenQrScanner={() => void qrFlow.handleOpenQrScanner()}
            isScannerOpening={qrFlow.isScannerOpening}
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
              backgroundColor: transientPopup.tone === "error"
                ? isLightTheme
                  ? "rgba(185, 92, 87, 0.28)"
                  : "rgba(127, 29, 29, 0.9)"
                : EXPEDITION_THEME.panel,
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

      <ExpeditionStageOverlayLayer
        adaptiveLayout={adaptiveLayout}
        isLightTheme={isLightTheme}
        text={{
          timedTaskAlertTitle: text.timedTaskAlertTitle,
          timedTaskAlertBody: text.timedTaskAlertBody,
          timedTaskAlertBack: text.timedTaskAlertBack,
          timedTaskAlertCloseAndFail: text.timedTaskAlertCloseAndFail,
        }}
      />

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.45)" }}
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
      </Animated.View>

    </View>
      </ExpeditionStageOverlayProvider>
    </ExpeditionStageSessionProvider>
  );
}
