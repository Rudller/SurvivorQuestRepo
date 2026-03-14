import { useCallback, useEffect, useMemo, useState } from "react";
import type { OnboardingSession } from "../../onboarding/model/types";
import {
  fetchMobileSessionState,
  getApiErrorMessage,
  postMobileCompleteTask,
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
  const offlineMode = useMemo(() => isOfflineSession(session), [session]);
  const [sessionState, setSessionState] = useState<ExpeditionSessionState>(() => buildInitialSessionState(session));
  const [isLoading, setIsLoading] = useState(!offlineMode);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLocationSyncAt, setLastLocationSyncAt] = useState<string | null>(null);

  useEffect(() => {
    setSessionState(buildInitialSessionState(session));
    setErrorMessage(null);
    setIsLoading(!isOfflineSession(session));
    setIsRefreshing(false);
    setLastLocationSyncAt(null);
  }, [session]);

  const refreshSessionState = useCallback(async () => {
    if (offlineMode) {
      setErrorMessage(null);
      return null;
    }

    const apiBaseUrl = session.apiBaseUrl?.trim();

    if (!apiBaseUrl) {
      const error = "Brakuje konfiguracji API do pobrania stanu sesji.";
      setErrorMessage(error);
      return error;
    }

    setIsRefreshing(true);

    try {
      const nextState = await fetchMobileSessionState(apiBaseUrl, session.sessionToken);
      setSessionState(nextState);
      setErrorMessage(null);
      return null;
    } catch (error) {
      const message = getApiErrorMessage(error, "Nie udało się odświeżyć stanu sesji.");
      setErrorMessage(message);
      return message;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [offlineMode, session.apiBaseUrl, session.sessionToken]);

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
        return "Nieprawidłowe stanowisko.";
      }

      const startedAtIso = startedAt?.trim() || new Date().toISOString();

      if (offlineMode) {
        setSessionState((current) => {
          const nextTasks: ExpeditionSessionState["tasks"] = current.tasks.map((task) => {
            if (task.stationId !== normalizedStationId || task.status === "done") {
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
        return "Brakuje konfiguracji API.";
      }

      try {
        await postMobileStartTask(apiBaseUrl, {
          sessionToken: session.sessionToken,
          stationId: normalizedStationId,
          startedAt: startedAtIso,
        });
      } catch (error) {
        return getApiErrorMessage(error, "Nie udało się uruchomić zadania.");
      }

      return refreshSessionState();
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken],
  );

  const completeStationTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string) => {
      const normalizedStationId = stationId.trim();
      const normalizedCode = completionCode.trim().toUpperCase();

      if (!normalizedStationId || !normalizedCode) {
        return "Nieprawidłowe dane zadania.";
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

          if (existingTask?.status === "done") {
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
        return "Brakuje konfiguracji API.";
      }

      try {
        await postMobileCompleteTask(apiBaseUrl, {
          sessionToken: session.sessionToken,
          stationId: normalizedStationId,
          completionCode: normalizedCode,
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      } catch (error) {
        return getApiErrorMessage(error, "Nie udało się ukończyć zadania.");
      }

      return refreshSessionState();
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken],
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
        return "Brakuje konfiguracji API.";
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
          throw lastError ?? new Error("Brak odpowiedzi serwera dla lokalizacji.");
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
        return getApiErrorMessage(error, "Nie udało się wysłać lokalizacji.");
      }
    },
    [offlineMode, session.apiBaseUrl, session.sessionToken],
  );

  const resolveStationQrToken = useCallback(
    async (token: string) => {
      const normalizedToken = token.trim();
      if (!normalizedToken) {
        return "Nieprawidłowy kod QR.";
      }

      if (offlineMode) {
        return "Skanowanie QR wymaga połączenia z backendem.";
      }

      const apiBaseUrl = session.apiBaseUrl?.trim();
      if (!apiBaseUrl) {
        return "Brakuje konfiguracji API.";
      }

      try {
        const response = await postMobileResolveStationQr(apiBaseUrl, {
          sessionToken: session.sessionToken,
          token: normalizedToken,
        });
        await refreshSessionState();
        return response;
      } catch (error) {
        return getApiErrorMessage(error, "Nie udało się zweryfikować kodu QR.");
      }
    },
    [offlineMode, refreshSessionState, session.apiBaseUrl, session.sessionToken],
  );

  return {
    sessionState,
    isLoading,
    isRefreshing,
    errorMessage,
    offlineMode,
    lastLocationSyncAt,
    refreshSessionState,
    startStationTask,
    completeStationTask,
    syncTeamLocation,
    resolveStationQrToken,
  };
}
