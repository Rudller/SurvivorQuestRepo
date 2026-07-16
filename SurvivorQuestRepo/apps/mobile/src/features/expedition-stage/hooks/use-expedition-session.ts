import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OnboardingSession } from "../../onboarding/model/types";
import { useUiLanguage } from "../../i18n/ui-language-context";
import {
  fetchMobileSessionState,
  getApiErrorMessage,
  isSessionTokenInvalidError,
  postMobileCompleteTask,
  postMobileFailTask,
  postMobileResolveStationQr,
  postMobileStartTask,
  postMobileTeamLocation,
  postMobileUploadTaskPhoto,
} from "../api/mobile-session.api";
import {
  buildInitialSessionState,
  resolveDefaultStationPoints,
  type ExpeditionSessionState,
  type ExpeditionTaskStatus,
  type PlayerLocation,
} from "../model/types";

type GlobalTaskOutcomeEvent = {
  id: string;
  stationId: string;
  variant: "success" | "failed";
  message: string;
};

const SESSION_POLLING_INTERVAL_MS = 15_000;
const LOCATION_SYNC_RETRY_DELAYS_MS = [350, 900];
const TASK_REQUEST_RETRY_DELAYS_MS = [350, 900];
const UNSAFE_MUTATION_RETRY_DELAYS_MS: readonly number[] = [];
const MOBILE_REQUEST_TIMEOUT_MS = 12_000;
const PENDING_TASK_MUTATIONS_STORAGE_PREFIX = "sq.mobile.pending-task-mutations.v1";
const PENDING_SYNC_RETRY_INTERVAL_MS = 3_000;

type PendingTaskMutation =
  | {
      id: string;
      type: "task:start";
      stationId: string;
      startedAt: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "task:complete";
      stationId: string;
      completionCode: string;
      startedAt?: string;
      finishedAt: string;
      challengeDifficulty?: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "task:fail";
      stationId: string;
      reason?: string;
      startedAt?: string;
      finishedAt: string;
      createdAt: string;
    };

type SyncStatus = "idle" | "pending" | "syncing" | "synced" | "error";

const EXPEDITION_SESSION_TEXT = {
  polish: {
    missingSessionStateApiConfig: "Brakuje konfiguracji API do pobrania stanu sesji.",
    refreshSessionFailed: "Nie udało się odświeżyć stanu sesji.",
    invalidStation: "Nieprawidłowe stanowisko.",
    missingApiConfig: "Brakuje konfiguracji API.",
    startTaskFailed: "Nie udało się uruchomić zadania.",
    invalidTaskData: "Nieprawidłowe dane zadania.",
    requestTimedOut: "Przekroczono czas oczekiwania na odpowiedź serwera.",
    completeTaskFailed: "Nie udało się ukończyć zadania.",
    submitPhotoFailed: "Nie udało się wysłać zdjęcia.",
    noLocationServerResponse: "Brak odpowiedzi serwera dla lokalizacji.",
    sendLocationFailed: "Nie udało się wysłać lokalizacji.",
    failTaskFailed: "Nie udało się oznaczyć zadania jako niezaliczone.",
    invalidQrCode: "Nieprawidłowy kod QR.",
    qrRequiresBackend: "Skanowanie QR wymaga połączenia z backendem.",
    verifyQrFailed: "Nie udało się zweryfikować kodu QR.",
    progressSavedOffline: "Brak połączenia. Twój progres został zapisany na urządzeniu i zostanie wysłany po odzyskaniu połączenia.",
    progressChangesSavedOffline: (count: number) => `Brak połączenia. Zapisaliśmy ${count} zmian na urządzeniu i wyślemy je po odzyskaniu połączenia.`,
    syncingSavedProgress: "Połączenie wróciło. Synchronizujemy zapisany progres z serwerem...",
    progressSynced: "Progres został zsynchronizowany z serwerem.",
    progressStillPending: "Nadal nie możemy połączyć się z serwerem. Twój progres pozostaje zapisany na urządzeniu i spróbujemy wysłać go ponownie.",
    progressSyncRejected: "Nie udało się zsynchronizować części progresu z serwerem. Odświeżamy stan realizacji.",
    globalTaskApproved: (stationName: string) =>
      `Twoje zgłoszenie dla „${stationName}” zostało zatwierdzone. Punkty dodane.`,
    globalTaskRejected: (stationName: string) => `Twoje zgłoszenie dla „${stationName}” zostało odrzucone.`,
    globalOutcomePassed: "Zatwierdzone",
    globalOutcomeFailed: "Odrzucone",
    globalOutcomeTimedOut: "Czas minął",
    globalOutcomePending: "Wysłano",
    globalBackToMapNow: "Wróć do mapy teraz",
    globalBackToMap: "Wróć do mapy",
  },
  english: {
    missingSessionStateApiConfig: "Missing API configuration to fetch session state.",
    refreshSessionFailed: "Failed to refresh session state.",
    invalidStation: "Invalid station.",
    missingApiConfig: "Missing API configuration.",
    startTaskFailed: "Failed to start the task.",
    invalidTaskData: "Invalid task data.",
    requestTimedOut: "Server response timeout exceeded.",
    completeTaskFailed: "Failed to complete the task.",
    submitPhotoFailed: "Failed to upload the photo.",
    noLocationServerResponse: "No server response for location update.",
    sendLocationFailed: "Failed to send location.",
    failTaskFailed: "Failed to mark the task as failed.",
    invalidQrCode: "Invalid QR code.",
    qrRequiresBackend: "QR scanning requires a backend connection.",
    verifyQrFailed: "Failed to verify the QR code.",
    progressSavedOffline: "No connection. Your progress was saved on this device and will be sent when the connection is restored.",
    progressChangesSavedOffline: (count: number) => `No connection. We saved ${count} changes on this device and will send them when the connection is restored.`,
    syncingSavedProgress: "Connection is back. Syncing saved progress with the server...",
    progressSynced: "Progress has been synced with the server.",
    progressStillPending: "We still cannot connect to the server. Your progress remains saved on this device and we will try again.",
    progressSyncRejected: "Some saved progress could not be synced with the server. Refreshing realization state.",
    globalTaskApproved: (stationName: string) => `Your submission for “${stationName}” was approved. Points added.`,
    globalTaskRejected: (stationName: string) => `Your submission for “${stationName}” was rejected.`,
    globalOutcomePassed: "Approved",
    globalOutcomeFailed: "Rejected",
    globalOutcomeTimedOut: "Time expired",
    globalOutcomePending: "Submitted",
    globalBackToMapNow: "Back to the map now",
    globalBackToMap: "Back to the map",
  },
  ukrainian: {
    missingSessionStateApiConfig: "Відсутня конфігурація API для отримання стану сесії.",
    refreshSessionFailed: "Не вдалося оновити стан сесії.",
    invalidStation: "Некоректна станція.",
    missingApiConfig: "Відсутня конфігурація API.",
    startTaskFailed: "Не вдалося запустити завдання.",
    invalidTaskData: "Некоректні дані завдання.",
    requestTimedOut: "Перевищено час очікування відповіді сервера.",
    completeTaskFailed: "Не вдалося завершити завдання.",
    submitPhotoFailed: "Не вдалося надіслати фото.",
    noLocationServerResponse: "Немає відповіді сервера для оновлення локації.",
    sendLocationFailed: "Не вдалося надіслати локацію.",
    failTaskFailed: "Не вдалося позначити завдання як незараховане.",
    invalidQrCode: "Некоректний QR-код.",
    qrRequiresBackend: "Сканування QR потребує з'єднання з бекендом.",
    verifyQrFailed: "Не вдалося перевірити QR-код.",
    progressSavedOffline: "Немає з'єднання. Ваш прогрес збережено на пристрої та буде надіслано після відновлення з'єднання.",
    progressChangesSavedOffline: (count: number) => `Немає з'єднання. Ми зберегли ${count} змін на пристрої та надішлемо їх після відновлення з'єднання.`,
    syncingSavedProgress: "З'єднання відновлено. Синхронізуємо збережений прогрес із сервером...",
    progressSynced: "Прогрес синхронізовано із сервером.",
    progressStillPending: "Поки що не можемо підключитися до сервера. Ваш прогрес залишається збереженим на пристрої, ми спробуємо ще раз.",
    progressSyncRejected: "Частину прогресу не вдалося синхронізувати із сервером. Оновлюємо стан реалізації.",
    globalTaskApproved: (stationName: string) =>
      `Ваше подання для «${stationName}» затверджено. Бали нараховано.`,
    globalTaskRejected: (stationName: string) => `Ваше подання для «${stationName}» відхилено.`,
    globalOutcomePassed: "Затверджено",
    globalOutcomeFailed: "Відхилено",
    globalOutcomeTimedOut: "Час вичерпано",
    globalOutcomePending: "Надіслано",
    globalBackToMapNow: "Повернутися на мапу зараз",
    globalBackToMap: "Повернутися на мапу",
  },
  russian: {
    missingSessionStateApiConfig: "Отсутствует конфигурация API для получения состояния сессии.",
    refreshSessionFailed: "Не удалось обновить состояние сессии.",
    invalidStation: "Некорректная станция.",
    missingApiConfig: "Отсутствует конфигурация API.",
    startTaskFailed: "Не удалось запустить задание.",
    invalidTaskData: "Некорректные данные задания.",
    requestTimedOut: "Превышено время ожидания ответа сервера.",
    completeTaskFailed: "Не удалось завершить задание.",
    submitPhotoFailed: "Не удалось отправить фото.",
    noLocationServerResponse: "Нет ответа сервера для обновления локации.",
    sendLocationFailed: "Не удалось отправить локацию.",
    failTaskFailed: "Не удалось отметить задание как незачтенное.",
    invalidQrCode: "Некорректный QR-код.",
    qrRequiresBackend: "Сканирование QR требует подключения к бэкенду.",
    verifyQrFailed: "Не удалось проверить QR-код.",
    progressSavedOffline: "Нет соединения. Ваш прогресс сохранён на устройстве и будет отправлен после восстановления соединения.",
    progressChangesSavedOffline: (count: number) => `Нет соединения. Мы сохранили ${count} изменений на устройстве и отправим их после восстановления соединения.`,
    syncingSavedProgress: "Соединение восстановлено. Синхронизируем сохранённый прогресс с сервером...",
    progressSynced: "Прогресс синхронизирован с сервером.",
    progressStillPending: "Пока не удаётся подключиться к серверу. Ваш прогресс остаётся сохранённым на устройстве, мы попробуем ещё раз.",
    progressSyncRejected: "Часть прогресса не удалось синхронизировать с сервером. Обновляем состояние реализации.",
    globalTaskApproved: (stationName: string) =>
      `Ваша заявка для «${stationName}» подтверждена. Баллы начислены.`,
    globalTaskRejected: (stationName: string) => `Ваша заявка для «${stationName}» отклонена.`,
    globalOutcomePassed: "Подтверждено",
    globalOutcomeFailed: "Отклонено",
    globalOutcomeTimedOut: "Время истекло",
    globalOutcomePending: "Отправлено",
    globalBackToMapNow: "Вернуться на карту сейчас",
    globalBackToMap: "Вернуться на карту",
  },
} as const;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isRetriableNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("http 408") ||
    message.includes("http 429") ||
    message.includes("http 502") ||
    message.includes("http 503") ||
    message.includes("http 504")
  );
}

function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
) {
  return new Promise<T>((resolve, reject) => {
    const abortController = new AbortController();
    let isSettled = false;
    const timeoutId = setTimeout(() => {
      isSettled = true;
      abortController.abort();
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve().then(() => request(abortController.signal)).then(
      (result) => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error: unknown) => {
        if (isSettled) {
          return;
        }
        isSettled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

type RunRequestWithRetryArgs<T> = {
  request: (signal: AbortSignal) => Promise<T>;
  timeoutMs: number;
  timeoutMessage: string;
  retryDelaysMs: readonly number[];
};

export async function runRequestWithRetry<T>({
  request,
  timeoutMs,
  timeoutMessage,
  retryDelaysMs,
}: RunRequestWithRetryArgs<T>) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    try {
      return await withRequestTimeout(request, timeoutMs, timeoutMessage);
    } catch (error) {
      lastError = error;
      if (attempt >= retryDelaysMs.length || !isRetriableNetworkError(error)) {
        throw error;
      }
      await wait(retryDelaysMs[attempt]);
    }
  }

  throw lastError ?? new Error(timeoutMessage);
}

async function sendPendingTaskMutation({
  apiBaseUrl,
  sessionToken,
  mutation,
}: {
  apiBaseUrl: string;
  sessionToken: string;
  mutation: PendingTaskMutation;
}) {
  if (mutation.type === "task:start") {
    await runRequestWithRetry({
      request: (signal) =>
        postMobileStartTask(apiBaseUrl, {
          sessionToken,
          stationId: mutation.stationId,
          startedAt: mutation.startedAt,
        }, { signal }),
      timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
      timeoutMessage: "Request timed out",
      retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
    });
    return;
  }

  if (mutation.type === "task:complete") {
    await runRequestWithRetry({
      request: (signal) =>
        postMobileCompleteTask(apiBaseUrl, {
          sessionToken,
          stationId: mutation.stationId,
          completionCode: mutation.completionCode,
          startedAt: mutation.startedAt,
          finishedAt: mutation.finishedAt,
          challengeDifficulty: mutation.challengeDifficulty,
        }, { signal }),
      timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
      timeoutMessage: "Request timed out",
      retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
    });
    return;
  }

  await runRequestWithRetry({
    request: (signal) =>
      postMobileFailTask(apiBaseUrl, {
        sessionToken,
        stationId: mutation.stationId,
        reason: mutation.reason,
        startedAt: mutation.startedAt,
        finishedAt: mutation.finishedAt,
      }, { signal }),
    timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
    timeoutMessage: "Request timed out",
    retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
  });
}

function isOfflineSession(session: OnboardingSession) {
  return !session.apiBaseUrl?.trim();
}

function createPendingMutationId(type: PendingTaskMutation["type"], stationId: string) {
  return `${type}:${stationId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function getPendingMutationsStorageKey(sessionIdentityKey: string) {
  return `${PENDING_TASK_MUTATIONS_STORAGE_PREFIX}:${sessionIdentityKey}`;
}

function isTaskAlreadyCompletedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("task already completed") || message.includes("http 409");
}

function normalizePendingTaskMutation(value: unknown): PendingTaskMutation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<PendingTaskMutation>;
  if (typeof item.id !== "string" || typeof item.type !== "string" || typeof item.stationId !== "string") {
    return null;
  }

  if (item.type === "task:start" && typeof item.startedAt === "string" && typeof item.createdAt === "string") {
    return item as PendingTaskMutation;
  }

  if (
    item.type === "task:complete" &&
    typeof item.completionCode === "string" &&
    typeof item.finishedAt === "string" &&
    typeof item.createdAt === "string"
  ) {
    return item as PendingTaskMutation;
  }

  if (item.type === "task:fail" && typeof item.finishedAt === "string" && typeof item.createdAt === "string") {
    return item as PendingTaskMutation;
  }

  return null;
}

function applyStartedTaskState(current: ExpeditionSessionState, stationId: string, startedAt: string): ExpeditionSessionState {
  let taskUpdated = false;
  const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
    if (task.stationId !== stationId || task.status === "done" || task.status === "failed") {
      return task;
    }

    taskUpdated = true;
    return {
      ...task,
      status: "in-progress",
      startedAt: task.startedAt || startedAt,
    };
  });

  return taskUpdated ? { ...current, tasks: nextTasks } : current;
}

function applyFailedTaskState({
  current,
  stationId,
  startedAt,
  finishedAt,
}: {
  current: ExpeditionSessionState;
  stationId: string;
  startedAt?: string;
  finishedAt: string;
}) {
  const existingTask = current.tasks.find((task) => task.stationId === stationId);
  if (!existingTask || existingTask.status === "done" || existingTask.status === "failed") {
    return current;
  }

  const effectiveStartedAt = existingTask.startedAt ?? startedAt ?? finishedAt;
  const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
    if (task.stationId !== stationId) {
      return task;
    }

    return {
      ...task,
      status: "failed" as const,
      pointsAwarded: 0,
      startedAt: task.startedAt ?? effectiveStartedAt,
      finishedAt,
    };
  });

  return {
    ...current,
    tasks: nextTasks,
    meta: {
      ...current.meta,
      eventLogCount: current.meta.eventLogCount + 1,
    },
  };
}

export function applyPendingTaskMutationState(current: ExpeditionSessionState, mutation: PendingTaskMutation) {
  if (mutation.type === "task:start") {
    return applyStartedTaskState(current, mutation.stationId, mutation.startedAt);
  }

  if (mutation.type === "task:complete") {
    return applyCompletedTaskState({
      current,
      stationId: mutation.stationId,
      startedAt: mutation.startedAt,
      finishedAt: mutation.finishedAt,
      requireExistingTask: false,
    });
  }

  return applyFailedTaskState({
    current,
    stationId: mutation.stationId,
    startedAt: mutation.startedAt,
    finishedAt: mutation.finishedAt,
  });
}

export function applyPendingTaskMutationsState(current: ExpeditionSessionState, mutations: PendingTaskMutation[]) {
  return mutations.reduce(applyPendingTaskMutationState, current);
}

function computeLinearTimePoints(basePoints: number, timeLimitSeconds: number, startedAt: string, finishedAt: string) {
  const safeBasePoints = Math.max(0, Math.round(basePoints));
  const safeLimit = Math.max(0, Math.round(timeLimitSeconds));

  if (safeBasePoints === 0) {
    return 0;
  }

  if (safeLimit === 0) {
    return safeBasePoints;
  }

  const startedAtMs = new Date(startedAt).getTime();
  const finishedAtMs = new Date(finishedAt).getTime();
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) {
    return 0;
  }

  const elapsedSeconds = Math.max(0, Math.round((finishedAtMs - startedAtMs) / 1000));
  if (elapsedSeconds >= safeLimit) {
    return 0;
  }

  const ratio = Math.max(0, 1 - elapsedSeconds / safeLimit);
  return Math.max(0, Math.round(safeBasePoints * ratio));
}

function shouldApplyTimedPointsDecay(current: ExpeditionSessionState, stationId: string) {
  if (!current.realization.timedStationPointsDecayEnabled) {
    return false;
  }

  const station = current.realization.stations.find((item) => item.id === stationId);
  return Boolean(station && station.timeLimitSeconds > 0);
}

type ApplyCompletedTaskStateArgs = {
  current: ExpeditionSessionState;
  stationId: string;
  startedAt?: string;
  finishedAt: string;
  requireExistingTask: boolean;
};

export function applyCompletedTaskState({
  current,
  stationId,
  startedAt,
  finishedAt,
  requireExistingTask,
}: ApplyCompletedTaskStateArgs): ExpeditionSessionState {
  const existingTask = current.tasks.find((task) => task.stationId === stationId);
  if (existingTask?.status === "done" || existingTask?.status === "failed") {
    return current;
  }
  if (requireExistingTask && !existingTask) {
    return current;
  }

  const station = current.realization.stations.find((item) => item.id === stationId);
  const basePoints = station?.points ?? resolveDefaultStationPoints(stationId);
  const effectiveStartedAt = existingTask?.startedAt ?? startedAt ?? finishedAt;
  const applyTimedPointsDecay = shouldApplyTimedPointsDecay(current, stationId);
  const awardedPoints =
    station && (applyTimedPointsDecay || station.type === "time")
      ? computeLinearTimePoints(basePoints, station.timeLimitSeconds, effectiveStartedAt, finishedAt)
      : Math.max(0, Math.round(basePoints));
  const nextStatus = applyTimedPointsDecay && awardedPoints <= 0 ? "failed" : "done";

  let taskUpdated = false;
  const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
    if (task.stationId !== stationId) {
      return task;
    }
    taskUpdated = true;
    return {
      ...task,
      status: nextStatus,
      pointsAwarded: awardedPoints,
      startedAt: task.startedAt ?? effectiveStartedAt,
      finishedAt,
    };
  });

  if (!taskUpdated) {
    return current;
  }

  return {
    ...current,
    tasks: nextTasks,
      team: {
        ...current.team,
      points: current.team.points + (nextStatus === "done" ? awardedPoints : 0),
      },
    meta: {
      ...current.meta,
      eventLogCount: current.meta.eventLogCount + 1,
    },
  };
}

export function useExpeditionSession(
  session: OnboardingSession,
  isAnyStationOverlayOpenRef?: MutableRefObject<boolean>,
) {
  const uiLanguage = useUiLanguage();
  const text = EXPEDITION_SESSION_TEXT[uiLanguage];
  const previousTaskStatusByStationIdRef = useRef<Record<string, ExpeditionTaskStatus>>({});
  const [globalTaskOutcomeQueue, setGlobalTaskOutcomeQueue] = useState<GlobalTaskOutcomeEvent[]>([]);
  const sessionIdentityKey = useMemo(
    () =>
      [
        session.apiBaseUrl?.trim() || "",
        session.sessionToken?.trim() || "",
        session.realization?.id || session.realizationId || "",
        session.selectedLanguage ?? session.realization?.selectedLanguage ?? session.realization?.language ?? "",
        String(session.team.slotNumber ?? ""),
      ].join("|"),
    [
      session.apiBaseUrl,
      session.realization?.id,
      session.realization?.language,
      session.realization?.selectedLanguage,
      session.realizationId,
      session.selectedLanguage,
      session.sessionToken,
      session.team.slotNumber,
    ],
  );
  // Session consumers should react only to stable identity fields, not to parent object re-creation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSession = useMemo(() => session, [sessionIdentityKey]);
  const selectedLanguage =
    stableSession.selectedLanguage ??
    stableSession.realization?.selectedLanguage ??
    stableSession.realization?.language;
  const offlineMode = useMemo(() => isOfflineSession(stableSession), [stableSession]);
  const [sessionState, setSessionState] = useState<ExpeditionSessionState>(() => buildInitialSessionState(session));
  const [isLoading, setIsLoading] = useState(!offlineMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLocationSyncAt, setLastLocationSyncAt] = useState<string | null>(null);
  const [isSessionInvalid, setIsSessionInvalid] = useState(false);
  const [sessionInvalidReason, setSessionInvalidReason] = useState<string | null>(null);
  const [pendingTaskMutations, setPendingTaskMutations] = useState<PendingTaskMutation[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isFlushingPendingMutations, setIsFlushingPendingMutations] = useState(false);
  const pendingMutationsStorageKey = useMemo(
    () => getPendingMutationsStorageKey(sessionIdentityKey),
    [sessionIdentityKey],
  );

  useEffect(() => {
    setSessionState(buildInitialSessionState(stableSession));
    setErrorMessage(null);
    setIsLoading(!isOfflineSession(stableSession));
    setIsRefreshing(false);
    setLastLocationSyncAt(null);
    setIsSessionInvalid(false);
    setSessionInvalidReason(null);
    setSyncStatus("idle");
    setSyncMessage(null);
    setIsFlushingPendingMutations(false);
    previousTaskStatusByStationIdRef.current = {};
    setGlobalTaskOutcomeQueue([]);
  }, [stableSession]);

  useEffect(() => {
    const additions: GlobalTaskOutcomeEvent[] = [];

    for (const task of sessionState.tasks) {
      const previousStatus = previousTaskStatusByStationIdRef.current[task.stationId];
      previousTaskStatusByStationIdRef.current[task.stationId] = task.status;

      const stationSeenBefore = previousStatus !== undefined;
      const transitioned =
        stationSeenBefore &&
        previousStatus !== "done" &&
        previousStatus !== "failed" &&
        (task.status === "done" || task.status === "failed");

      if (!transitioned || isAnyStationOverlayOpenRef?.current) {
        continue;
      }

      const stationName =
        sessionState.realization.stations.find((station) => station.id === task.stationId)?.name?.trim() ||
        task.stationId;

      additions.push({
        id: `${task.stationId}:${task.status}:${Date.now()}`,
        stationId: task.stationId,
        variant: task.status === "done" ? "success" : "failed",
        message:
          task.status === "done"
            ? text.globalTaskApproved(stationName)
            : text.globalTaskRejected(stationName),
      });
    }

    if (additions.length > 0) {
      setGlobalTaskOutcomeQueue((current) => [...current, ...additions]);
    }
  }, [isAnyStationOverlayOpenRef, sessionState.realization.stations, sessionState.tasks, text]);

  const dismissCurrentGlobalTaskOutcome = useCallback(() => {
    setGlobalTaskOutcomeQueue((current) => current.slice(1));
  }, []);

  const globalOutcomePanelText = useMemo(
    () => ({
      outcomePassed: text.globalOutcomePassed,
      outcomeFailed: text.globalOutcomeFailed,
      outcomeTimedOut: text.globalOutcomeTimedOut,
      outcomePending: text.globalOutcomePending,
      backToMapNow: text.globalBackToMapNow,
      backToMap: text.globalBackToMap,
    }),
    [text],
  );

  useEffect(() => {
    let isActive = true;

    const hydratePendingMutations = async () => {
      try {
        const storedQueue = await AsyncStorage.getItem(pendingMutationsStorageKey);
        if (!isActive) {
          return;
        }

        const parsed = JSON.parse(storedQueue || "[]") as unknown;
        const hydratedQueue = Array.isArray(parsed)
          ? parsed.map(normalizePendingTaskMutation).filter((item): item is PendingTaskMutation => Boolean(item))
          : [];
        setPendingTaskMutations(hydratedQueue);
        if (hydratedQueue.length > 0) {
          setSyncStatus("pending");
          setSyncMessage(text.progressChangesSavedOffline(hydratedQueue.length));
        }
      } catch {
        if (isActive) {
          setPendingTaskMutations([]);
        }
      }
    };

    void hydratePendingMutations();

    return () => {
      isActive = false;
    };
  }, [pendingMutationsStorageKey, text]);

  const persistPendingTaskMutations = useCallback(
    async (nextQueue: PendingTaskMutation[]) => {
      setPendingTaskMutations(nextQueue);
      if (nextQueue.length === 0) {
        await AsyncStorage.removeItem(pendingMutationsStorageKey);
        return;
      }

      await AsyncStorage.setItem(pendingMutationsStorageKey, JSON.stringify(nextQueue));
    },
    [pendingMutationsStorageKey],
  );

  const enqueuePendingTaskMutation = useCallback(
    async (mutation: PendingTaskMutation) => {
      const nextQueue = [...pendingTaskMutations, mutation];
      setSyncStatus("pending");
      setSyncMessage(nextQueue.length === 1 ? text.progressSavedOffline : text.progressChangesSavedOffline(nextQueue.length));
      await persistPendingTaskMutations(nextQueue);
    },
    [pendingTaskMutations, persistPendingTaskMutations, text],
  );

  const flushPendingTaskMutations = useCallback(async () => {
    if (offlineMode || isFlushingPendingMutations || pendingTaskMutations.length === 0) {
      return null;
    }

    const apiBaseUrl = session.apiBaseUrl?.trim();
    if (!apiBaseUrl) {
      return text.missingApiConfig;
    }

    setIsFlushingPendingMutations(true);
    setSyncStatus("syncing");
    setSyncMessage(text.syncingSavedProgress);

    let nextQueue = [...pendingTaskMutations];

    try {
      while (nextQueue.length > 0) {
        const mutation = nextQueue[0];
        try {
          await sendPendingTaskMutation({ apiBaseUrl, sessionToken: session.sessionToken, mutation });
          nextQueue = nextQueue.slice(1);
          await persistPendingTaskMutations(nextQueue);
        } catch (error) {
          if (isTaskAlreadyCompletedError(error)) {
            nextQueue = nextQueue.slice(1);
            await persistPendingTaskMutations(nextQueue);
            continue;
          }

          if (isRetriableNetworkError(error)) {
            setSyncStatus("pending");
            setSyncMessage(text.progressStillPending);
            return getApiErrorMessage(error, text.progressStillPending);
          }

          nextQueue = nextQueue.slice(1);
          await persistPendingTaskMutations(nextQueue);
          setSyncStatus("error");
          setSyncMessage(text.progressSyncRejected);
          return getApiErrorMessage(error, text.progressSyncRejected);
        }
      }

      setSyncStatus("synced");
      setSyncMessage(text.progressSynced);
      return null;
    } finally {
      setIsFlushingPendingMutations(false);
    }
  }, [
    isFlushingPendingMutations,
    offlineMode,
    pendingTaskMutations,
    persistPendingTaskMutations,
    session.apiBaseUrl,
    session.sessionToken,
    text,
  ]);

  const refreshSessionState = useCallback(async () => {
    if (offlineMode) {
      setErrorMessage(null);
      return null;
    }

    const apiBaseUrl = session.apiBaseUrl?.trim();

    if (!apiBaseUrl) {
      const error = text.missingSessionStateApiConfig;
      setErrorMessage(error);
      return error;
    }

    setIsRefreshing(true);

    try {
      const nextState = await runRequestWithRetry({
        request: (signal) => fetchMobileSessionState(apiBaseUrl, session.sessionToken, selectedLanguage, { signal }),
        timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
        timeoutMessage: text.requestTimedOut,
        retryDelaysMs: TASK_REQUEST_RETRY_DELAYS_MS,
      });
      setSessionState(applyPendingTaskMutationsState(nextState, pendingTaskMutations));
      setErrorMessage(null);
      setIsSessionInvalid(false);
      setSessionInvalidReason(null);
      return null;
    } catch (error) {
      const message = getApiErrorMessage(error, text.refreshSessionFailed);
      setErrorMessage(message);
      if (isSessionTokenInvalidError(error)) {
        setIsSessionInvalid(true);
        setSessionInvalidReason(message);
      }
      return message;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [offlineMode, pendingTaskMutations, selectedLanguage, session.apiBaseUrl, session.sessionToken, text]);

  useEffect(() => {
    if (offlineMode) {
      setIsLoading(false);
      return;
    }

    void flushPendingTaskMutations().then(() => refreshSessionState());

    const interval = setInterval(() => {
      void flushPendingTaskMutations().then(() => refreshSessionState());
    }, SESSION_POLLING_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [flushPendingTaskMutations, offlineMode, refreshSessionState]);

  useEffect(() => {
    if (offlineMode || pendingTaskMutations.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      void flushPendingTaskMutations().then(() => refreshSessionState());
    }, PENDING_SYNC_RETRY_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [flushPendingTaskMutations, offlineMode, pendingTaskMutations.length, refreshSessionState]);

  const startStationTask = useCallback(
    async (stationId: string, startedAt?: string) => {
      const normalizedStationId = stationId.trim();

      if (!normalizedStationId) {
        return text.invalidStation;
      }

      const startedAtIso = startedAt?.trim() || new Date().toISOString();

      if (offlineMode) {
        setSessionState((current) => applyStartedTaskState(current, normalizedStationId, startedAtIso));
        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();

      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      const mutation: PendingTaskMutation = {
        id: createPendingMutationId("task:start", normalizedStationId),
        type: "task:start",
        stationId: normalizedStationId,
        startedAt: startedAtIso,
        createdAt: new Date().toISOString(),
      };

      try {
        await runRequestWithRetry({
          request: (signal) =>
            postMobileStartTask(apiBaseUrl, {
              sessionToken: session.sessionToken,
              stationId: normalizedStationId,
              startedAt: startedAtIso,
            }, { signal }),
          timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
          timeoutMessage: text.requestTimedOut,
          retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
        });
      } catch (error) {
        if (isRetriableNetworkError(error)) {
          setSessionState((current) => applyStartedTaskState(current, normalizedStationId, startedAtIso));
          await enqueuePendingTaskMutation(mutation);
          return null;
        }
        return getApiErrorMessage(error, text.startTaskFailed);
      }

      setSessionState((current) => applyStartedTaskState(current, normalizedStationId, startedAtIso));

      void refreshSessionState();
      return null;
    },
    [enqueuePendingTaskMutation, offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, sessionState.tasks, text],
  );

  const completeStationTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string, challengeDifficulty?: string) => {
      const normalizedStationId = stationId.trim();
      const normalizedCode = completionCode.trim().toUpperCase();

      if (!normalizedStationId || !normalizedCode) {
        return text.invalidTaskData;
      }

      const finishedAt = new Date().toISOString();
      const effectiveStartedAt = startedAt?.trim() || sessionState.tasks.find((task) => task.stationId === normalizedStationId)?.startedAt || finishedAt;

      if (offlineMode) {
        setSessionState((current) => {
          return applyCompletedTaskState({
            current,
            stationId: normalizedStationId,
            startedAt: effectiveStartedAt,
            finishedAt,
            requireExistingTask: false,
          });
        });

        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();

      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      const mutation: PendingTaskMutation = {
        id: createPendingMutationId("task:complete", normalizedStationId),
        type: "task:complete",
        stationId: normalizedStationId,
        completionCode: normalizedCode,
        startedAt: effectiveStartedAt,
        finishedAt,
        challengeDifficulty,
        createdAt: new Date().toISOString(),
      };

      try {
        await runRequestWithRetry({
          request: (signal) =>
            postMobileCompleteTask(apiBaseUrl, {
              sessionToken: session.sessionToken,
              stationId: normalizedStationId,
              completionCode: normalizedCode,
              startedAt: effectiveStartedAt,
              finishedAt,
              challengeDifficulty,
            }, { signal }),
          timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
          timeoutMessage: text.requestTimedOut,
          retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
        });

        setSessionState((current) => {
          return applyCompletedTaskState({
            current,
            stationId: normalizedStationId,
            startedAt: effectiveStartedAt,
            finishedAt,
            requireExistingTask: true,
          });
        });
      } catch (error) {
        if (isRetriableNetworkError(error)) {
          setSessionState((current) => {
            return applyCompletedTaskState({
              current,
              stationId: normalizedStationId,
              startedAt: effectiveStartedAt,
              finishedAt,
              requireExistingTask: false,
            });
          });
          await enqueuePendingTaskMutation(mutation);
          return null;
        }
        return getApiErrorMessage(error, text.completeTaskFailed);
      }

      void refreshSessionState();
      return null;
    },
    [enqueuePendingTaskMutation, offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, sessionState.tasks, text],
  );

  const submitTaskPhoto = useCallback(
    async (stationId: string, fileUri: string) => {
      const normalizedStationId = stationId.trim();
      if (!normalizedStationId || !fileUri) {
        return text.invalidTaskData;
      }

      if (offlineMode) {
        return text.submitPhotoFailed;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();
      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        await withRequestTimeout(
          (signal) =>
            postMobileUploadTaskPhoto(apiBaseUrl, {
              sessionToken: session.sessionToken,
              stationId: normalizedStationId,
              fileUri,
            }, { signal }),
          MOBILE_REQUEST_TIMEOUT_MS,
          text.requestTimedOut,
        );
      } catch (error) {
        return getApiErrorMessage(error, text.submitPhotoFailed);
      }

      void refreshSessionState();
      return null;
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, text],
  );

  const syncTeamLocation = useCallback(
    async (location: PlayerLocation) => {
      const locationAt = location.at || new Date().toISOString();

      if (offlineMode) {
        setSessionState((current) => ({
          ...current,
          team: {
            ...current.team,
            lastLocation: {
              ...location,
              at: locationAt,
            },
          },
          meta: {
            ...current.meta,
            eventLogCount: current.meta.eventLogCount + 1,
          },
        }));
        setLastLocationSyncAt(locationAt);
        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();

      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        const result = await runRequestWithRetry({
          request: (signal) =>
            postMobileTeamLocation(apiBaseUrl, {
              sessionToken: session.sessionToken,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              heading: location.heading,
              at: locationAt,
            }, { signal }),
          timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
          timeoutMessage: text.requestTimedOut,
          retryDelaysMs: LOCATION_SYNC_RETRY_DELAYS_MS,
        });

        setSessionState((current) => ({
          ...current,
          team: {
            ...current.team,
            lastLocation: {
              ...location,
              at: result.lastLocationAt,
            },
          },
        }));
        setLastLocationSyncAt(result.lastLocationAt);
        return null;
      } catch (error) {
        return getApiErrorMessage(error, text.sendLocationFailed);
      }
    },
    [offlineMode, session.apiBaseUrl, session.sessionToken, text],
  );

  const failStationTask = useCallback(
    async (stationId: string, reason?: string, startedAt?: string) => {
      const normalizedStationId = stationId.trim();
      if (!normalizedStationId) {
        return text.invalidStation;
      }

      if (offlineMode) {
        const finishedAt = new Date().toISOString();
        setSessionState((current) => applyFailedTaskState({
          current,
          stationId: normalizedStationId,
          startedAt,
          finishedAt,
        }));
        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();
      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      const finishedAt = new Date().toISOString();
      const effectiveStartedAt = startedAt?.trim() || sessionState.tasks.find((task) => task.stationId === normalizedStationId)?.startedAt || finishedAt;
      const mutation: PendingTaskMutation = {
        id: createPendingMutationId("task:fail", normalizedStationId),
        type: "task:fail",
        stationId: normalizedStationId,
        reason,
        startedAt: effectiveStartedAt,
        finishedAt,
        createdAt: new Date().toISOString(),
      };

      try {
        await runRequestWithRetry({
          request: (signal) =>
            postMobileFailTask(apiBaseUrl, {
              sessionToken: session.sessionToken,
              stationId: normalizedStationId,
              reason,
              startedAt: effectiveStartedAt,
              finishedAt,
            }, { signal }),
          timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
          timeoutMessage: text.requestTimedOut,
          retryDelaysMs: UNSAFE_MUTATION_RETRY_DELAYS_MS,
        });

        setSessionState((current) => applyFailedTaskState({
          current,
          stationId: normalizedStationId,
          startedAt: effectiveStartedAt,
          finishedAt,
        }));
      } catch (error) {
        if (isRetriableNetworkError(error)) {
          setSessionState((current) => applyFailedTaskState({
            current,
            stationId: normalizedStationId,
            startedAt: effectiveStartedAt,
            finishedAt,
          }));
          await enqueuePendingTaskMutation(mutation);
          return null;
        }
        return getApiErrorMessage(error, text.failTaskFailed);
      }

      void refreshSessionState();
      return null;
    },
    [enqueuePendingTaskMutation, offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, text],
  );

  const resolveStationQrToken = useCallback(
    async (token: string) => {
      const normalizedToken = token.trim();
      if (!normalizedToken) {
        return text.invalidQrCode;
      }

      if (offlineMode) {
        return text.qrRequiresBackend;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();
      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        const response = await runRequestWithRetry({
          request: (signal) =>
            postMobileResolveStationQr(apiBaseUrl, {
              sessionToken: session.sessionToken,
              token: normalizedToken,
              selectedLanguage,
            }, { signal }),
          timeoutMs: MOBILE_REQUEST_TIMEOUT_MS,
          timeoutMessage: text.requestTimedOut,
          retryDelaysMs: TASK_REQUEST_RETRY_DELAYS_MS,
        });
        setSessionState((current) => {
          const normalizedCompletionCodeLength =
            typeof response.station.completionCodeLength === "number" &&
            Number.isFinite(response.station.completionCodeLength) &&
            response.station.completionCodeLength > 0
              ? Math.min(32, Math.round(response.station.completionCodeLength))
              : undefined;

          const nextStation = {
            id: response.station.id,
            name: response.station.name,
            type: response.station.type,
            description: response.station.description,
            imageUrl: response.station.imageUrl,
            points: response.station.points,
            timeLimitSeconds: response.station.timeLimitSeconds,
            completionCodeInputMode: response.station.completionCodeInputMode ?? "alphanumeric",
            completionCodeLength: normalizedCompletionCodeLength,
            quiz: response.station.quiz,
            latitude: response.station.latitude,
            longitude: response.station.longitude,
          };

          const existingStationIndex = current.realization.stations.findIndex(
            (station) => station.id === response.station.id,
          );
          const nextStations =
            existingStationIndex >= 0
              ? current.realization.stations.map((station, index) =>
                  index === existingStationIndex ? { ...station, ...nextStation } : station,
                )
              : [...current.realization.stations, nextStation];

          return {
            ...current,
            realization: {
              ...current.realization,
              stations: nextStations,
            },
          };
        });
        await refreshSessionState();
        return response;
      } catch (error) {
        return getApiErrorMessage(error, text.verifyQrFailed);
      }
    },
    [
      offlineMode,
      refreshSessionState,
      selectedLanguage,
      session.apiBaseUrl,
      session.sessionToken,
      text,
    ],
  );

  return {
    sessionState,
    isLoading,
    isRefreshing,
    errorMessage,
    isSessionInvalid,
    sessionInvalidReason,
    offlineMode,
    pendingSyncCount: pendingTaskMutations.length,
    syncStatus,
    syncMessage,
    lastLocationSyncAt,
    refreshSessionState,
    startStationTask,
    completeStationTask,
    submitTaskPhoto,
    failStationTask,
    syncTeamLocation,
    resolveStationQrToken,
    globalTaskOutcomePopup: globalTaskOutcomeQueue[0] ?? null,
    dismissCurrentGlobalTaskOutcome,
    globalOutcomePanelText,
  };
}
