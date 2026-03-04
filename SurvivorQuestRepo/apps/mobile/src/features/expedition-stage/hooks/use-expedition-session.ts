import { useCallback, useEffect, useMemo, useState } from "react";
import type { OnboardingSession } from "../../onboarding/model/types";
import {
  fetchMobileSessionState,
  getApiErrorMessage,
  postMobileCompleteTask,
  postMobileTeamLocation,
} from "../api/mobile-session.api";
import {
  buildInitialSessionState,
  resolveDefaultStationPoints,
  type ExpeditionSessionState,
  type PlayerLocation,
} from "../model/types";

const SESSION_POLLING_INTERVAL_MS = 15_000;

function isOfflineSession(session: OnboardingSession) {
  return !session.apiBaseUrl?.trim();
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

  const completeStationTask = useCallback(
    async (stationId: string, pointsAwarded?: number) => {
      const normalizedStationId = stationId.trim();

      if (!normalizedStationId) {
        return "Nieprawidłowe stanowisko.";
      }

      const awardedPoints = Math.max(0, Math.round(pointsAwarded ?? resolveDefaultStationPoints(normalizedStationId)));

      if (offlineMode) {
        setSessionState((current) => {
          const existingTask = current.tasks.find((task) => task.stationId === normalizedStationId);

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
          pointsAwarded: awardedPoints,
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
        const result = await postMobileTeamLocation(apiBaseUrl, {
          sessionToken: session.sessionToken,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          at: locationAt,
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
        return getApiErrorMessage(error, "Nie udało się wysłać lokalizacji.");
      }
    },
    [offlineMode, session.apiBaseUrl, session.sessionToken],
  );

  return {
    sessionState,
    isLoading,
    isRefreshing,
    errorMessage,
    offlineMode,
    lastLocationSyncAt,
    refreshSessionState,
    completeStationTask,
    syncTeamLocation,
  };
}
