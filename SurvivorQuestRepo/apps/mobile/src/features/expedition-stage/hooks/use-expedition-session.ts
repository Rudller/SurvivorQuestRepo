import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "../api/mobile-session.api";
import {
  buildInitialSessionState,
  resolveDefaultStationPoints,
  type ExpeditionSessionState,
  type PlayerLocation,
} from "../model/types";

const SESSION_POLLING_INTERVAL_MS = 15_000;
const LOCATION_SYNC_RETRY_DELAYS_MS = [350, 900];

const EXPEDITION_SESSION_TEXT = {
  polish: {
    missingSessionStateApiConfig: "Brakuje konfiguracji API do pobrania stanu sesji.",
    refreshSessionFailed: "Nie udało się odświeżyć stanu sesji.",
    invalidStation: "Nieprawidłowe stanowisko.",
    missingApiConfig: "Brakuje konfiguracji API.",
    startTaskFailed: "Nie udało się uruchomić zadania.",
    invalidTaskData: "Nieprawidłowe dane zadania.",
    completeTaskFailed: "Nie udało się ukończyć zadania.",
    noLocationServerResponse: "Brak odpowiedzi serwera dla lokalizacji.",
    sendLocationFailed: "Nie udało się wysłać lokalizacji.",
    failTaskFailed: "Nie udało się oznaczyć zadania jako niezaliczone.",
    invalidQrCode: "Nieprawidłowy kod QR.",
    qrRequiresBackend: "Skanowanie QR wymaga połączenia z backendem.",
    verifyQrFailed: "Nie udało się zweryfikować kodu QR.",
  },
  english: {
    missingSessionStateApiConfig: "Missing API configuration to fetch session state.",
    refreshSessionFailed: "Failed to refresh session state.",
    invalidStation: "Invalid station.",
    missingApiConfig: "Missing API configuration.",
    startTaskFailed: "Failed to start the task.",
    invalidTaskData: "Invalid task data.",
    completeTaskFailed: "Failed to complete the task.",
    noLocationServerResponse: "No server response for location update.",
    sendLocationFailed: "Failed to send location.",
    failTaskFailed: "Failed to mark the task as failed.",
    invalidQrCode: "Invalid QR code.",
    qrRequiresBackend: "QR scanning requires a backend connection.",
    verifyQrFailed: "Failed to verify the QR code.",
  },
  ukrainian: {
    missingSessionStateApiConfig: "Відсутня конфігурація API для отримання стану сесії.",
    refreshSessionFailed: "Не вдалося оновити стан сесії.",
    invalidStation: "Некоректна станція.",
    missingApiConfig: "Відсутня конфігурація API.",
    startTaskFailed: "Не вдалося запустити завдання.",
    invalidTaskData: "Некоректні дані завдання.",
    completeTaskFailed: "Не вдалося завершити завдання.",
    noLocationServerResponse: "Немає відповіді сервера для оновлення локації.",
    sendLocationFailed: "Не вдалося надіслати локацію.",
    failTaskFailed: "Не вдалося позначити завдання як незараховане.",
    invalidQrCode: "Некоректний QR-код.",
    qrRequiresBackend: "Сканування QR потребує з'єднання з бекендом.",
    verifyQrFailed: "Не вдалося перевірити QR-код.",
  },
  russian: {
    missingSessionStateApiConfig: "Отсутствует конфигурация API для получения состояния сессии.",
    refreshSessionFailed: "Не удалось обновить состояние сессии.",
    invalidStation: "Некорректная станция.",
    missingApiConfig: "Отсутствует конфигурация API.",
    startTaskFailed: "Не удалось запустить задание.",
    invalidTaskData: "Некорректные данные задания.",
    completeTaskFailed: "Не удалось завершить задание.",
    noLocationServerResponse: "Нет ответа сервера для обновления локации.",
    sendLocationFailed: "Не удалось отправить локацию.",
    failTaskFailed: "Не удалось отметить задание как незачтенное.",
    invalidQrCode: "Некорректный QR-код.",
    qrRequiresBackend: "Сканирование QR требует подключения к бэкенду.",
    verifyQrFailed: "Не удалось проверить QR-код.",
  },
} as const;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isOfflineSession(session: OnboardingSession) {
  return !session.apiBaseUrl?.trim();
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

export function useExpeditionSession(session: OnboardingSession) {
  const uiLanguage = useUiLanguage();
  const text = EXPEDITION_SESSION_TEXT[uiLanguage];
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

  useEffect(() => {
    setSessionState(buildInitialSessionState(stableSession));
    setErrorMessage(null);
    setIsLoading(!isOfflineSession(stableSession));
    setIsRefreshing(false);
    setLastLocationSyncAt(null);
    setIsSessionInvalid(false);
    setSessionInvalidReason(null);
  }, [stableSession]);

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
      const nextState = await fetchMobileSessionState(
        apiBaseUrl,
        session.sessionToken,
        selectedLanguage,
      );
      setSessionState(nextState);
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
  }, [offlineMode, selectedLanguage, session.apiBaseUrl, session.sessionToken, text]);

  useEffect(() => {
    if (offlineMode) {
      setIsLoading(false);
      return;
    }

    void refreshSessionState();

    const interval = setInterval(() => {
      void refreshSessionState();
    }, SESSION_POLLING_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [offlineMode, refreshSessionState]);

  const startStationTask = useCallback(
    async (stationId: string, startedAt?: string) => {
      const normalizedStationId = stationId.trim();

      if (!normalizedStationId) {
        return text.invalidStation;
      }

      const startedAtIso = startedAt?.trim() || new Date().toISOString();

      if (offlineMode) {
        setSessionState((current) => {
          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId || task.status === "done" || task.status === "failed") {
              return task;
            }

            return {
              ...task,
              status: "in-progress",
              startedAt: task.startedAt || startedAtIso,
            };
          });

          return {
            ...current,
            tasks: nextTasks,
          };
        });
        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();

      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        await postMobileStartTask(apiBaseUrl, {
          sessionToken: session.sessionToken,
          stationId: normalizedStationId,
          startedAt: startedAtIso,
        });
      } catch (error) {
        return getApiErrorMessage(error, text.startTaskFailed);
      }

      setSessionState((current) => {
        const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
          if (task.stationId !== normalizedStationId || task.status === "done" || task.status === "failed") {
            return task;
          }

          return {
            ...task,
            status: "in-progress",
            startedAt: task.startedAt || startedAtIso,
          };
        });

        return {
          ...current,
          tasks: nextTasks,
        };
      });

      void refreshSessionState();
      return null;
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, text],
  );

  const completeStationTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string) => {
      const normalizedStationId = stationId.trim();
      const normalizedCode = completionCode.trim().toUpperCase();

      if (!normalizedStationId || !normalizedCode) {
        return text.invalidTaskData;
      }

      if (offlineMode) {
        setSessionState((current) => {
          const existingTask = current.tasks.find((task) => task.stationId === normalizedStationId);
          const station = current.realization.stations.find((item) => item.id === normalizedStationId);
          const basePoints = station?.points ?? resolveDefaultStationPoints(normalizedStationId);
          const finishedAt = new Date().toISOString();
          const effectiveStartedAt = existingTask?.startedAt ?? startedAt ?? finishedAt;
          const awardedPoints =
            station?.type === "time"
              ? computeLinearTimePoints(basePoints, station.timeLimitSeconds, effectiveStartedAt, finishedAt)
              : Math.max(0, Math.round(basePoints));

          if (existingTask?.status === "done" || existingTask?.status === "failed") {
            return current;
          }

          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId) {
              return task;
            }

            return {
              ...task,
              status: "done" as const,
              pointsAwarded: awardedPoints,
              startedAt: task.startedAt ?? effectiveStartedAt,
              finishedAt,
            };
          });

          return {
            ...current,
            tasks: nextTasks,
            team: {
              ...current.team,
              points: current.team.points + awardedPoints,
            },
            meta: {
              ...current.meta,
              eventLogCount: current.meta.eventLogCount + 1,
            },
          };
        });

        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();

      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        const finishedAt = new Date().toISOString();
        await postMobileCompleteTask(apiBaseUrl, {
          sessionToken: session.sessionToken,
          stationId: normalizedStationId,
          completionCode: normalizedCode,
          startedAt,
          finishedAt,
        });

        setSessionState((current) => {
          const existingTask = current.tasks.find((task) => task.stationId === normalizedStationId);
          const station = current.realization.stations.find((item) => item.id === normalizedStationId);

          if (existingTask?.status === "done" || existingTask?.status === "failed" || !existingTask) {
            return current;
          }

          const basePoints = station?.points ?? resolveDefaultStationPoints(normalizedStationId);
          const effectiveStartedAt = existingTask.startedAt ?? startedAt ?? finishedAt;
          const awardedPoints =
            station?.type === "time"
              ? computeLinearTimePoints(basePoints, station.timeLimitSeconds, effectiveStartedAt, finishedAt)
              : Math.max(0, Math.round(basePoints));

          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId) {
              return task;
            }

            return {
              ...task,
              status: "done" as const,
              pointsAwarded: awardedPoints,
              startedAt: task.startedAt ?? effectiveStartedAt,
              finishedAt,
            };
          });

          return {
            ...current,
            tasks: nextTasks,
            team: {
              ...current.team,
              points: current.team.points + awardedPoints,
            },
            meta: {
              ...current.meta,
              eventLogCount: current.meta.eventLogCount + 1,
            },
          };
        });
      } catch (error) {
        return getApiErrorMessage(error, text.completeTaskFailed);
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
        let result:
          | {
              ok: boolean;
              deduplicated: boolean;
              lastLocationAt: string;
              serverReceivedAt: string;
            }
          | null = null;
        let lastError: unknown = null;

        for (let attempt = 0; attempt <= LOCATION_SYNC_RETRY_DELAYS_MS.length; attempt += 1) {
          try {
            result = await postMobileTeamLocation(apiBaseUrl, {
              sessionToken: session.sessionToken,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              heading: location.heading,
              at: locationAt,
            });
            break;
          } catch (error) {
            lastError = error;
            if (attempt >= LOCATION_SYNC_RETRY_DELAYS_MS.length) {
              throw error;
            }
            await wait(LOCATION_SYNC_RETRY_DELAYS_MS[attempt]);
          }
        }

        if (!result) {
          throw lastError ?? new Error(text.noLocationServerResponse);
        }

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
        setSessionState((current) => {
          const existingTask = current.tasks.find((task) => task.stationId === normalizedStationId);
          if (!existingTask || existingTask.status === "done" || existingTask.status === "failed") {
            return current;
          }

          const finishedAt = new Date().toISOString();
          const effectiveStartedAt = existingTask.startedAt ?? startedAt ?? finishedAt;

          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId) {
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
        });
        return null;
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();
      if (!apiBaseUrl) {
        return text.missingApiConfig;
      }

      try {
        const finishedAt = new Date().toISOString();
        await postMobileFailTask(apiBaseUrl, {
          sessionToken: session.sessionToken,
          stationId: normalizedStationId,
          reason,
          startedAt,
          finishedAt,
        });

        setSessionState((current) => {
          const existingTask = current.tasks.find((task) => task.stationId === normalizedStationId);
          if (!existingTask || existingTask.status === "done" || existingTask.status === "failed") {
            return current;
          }

          const effectiveStartedAt = existingTask.startedAt ?? startedAt ?? finishedAt;

          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId) {
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
        });
      } catch (error) {
        return getApiErrorMessage(error, text.failTaskFailed);
      }

      void refreshSessionState();
      return null;
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken, text],
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
        const response = await postMobileResolveStationQr(apiBaseUrl, {
          sessionToken: session.sessionToken,
          token: normalizedToken,
          selectedLanguage,
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
    lastLocationSyncAt,
    refreshSessionState,
    startStationTask,
    completeStationTask,
    failStationTask,
    syncTeamLocation,
    resolveStationQrToken,
  };
}
