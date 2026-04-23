import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { useUiLanguage } from "../../i18n/ui-language-context";
import type { MapCoordinate, PlayerLocation } from "../model/types";

export type LocationPermissionState = "pending" | "granted" | "denied" | "error";

const INITIAL_FIX_ACCURACY = Location.Accuracy.Low;
const LIVE_TRACKING_ACCURACY = Location.Accuracy.Highest;
const LIVE_TRACKING_TIME_INTERVAL_MS = 1_500;
const LIVE_TRACKING_DISTANCE_INTERVAL_METERS = 1;
const LIVE_TRACKING_POLL_INTERVAL_MS = 7_000;
const ONE_SHOT_FIX_TIMEOUT_MS = 6_500;
const PLAYER_LOCATION_TEXT = {
  polish: {
    locationUnavailableFallback:
      "Nie udało się pobrać bieżącej lokalizacji. Sprawdź, czy lokalizacja jest włączona, i spróbuj ponownie.",
    locationServicesDisabled: "Usługa lokalizacji jest wyłączona w urządzeniu/emulatorze.",
    locationPermissionDenied: "Brak zgody na lokalizację. Marker gracza może być nieaktualny.",
    refreshCurrentLocationFailed: "Nie udało się odświeżyć bieżącej lokalizacji.",
    locationFetchFailed: "Nie udało się pobrać lokalizacji.",
    locationTimeout: "Przekroczono czas oczekiwania na lokalizację.",
  },
  english: {
    locationUnavailableFallback:
      "Could not get the current location. Make sure location services are enabled and try again.",
    locationServicesDisabled: "Location service is disabled on the device/emulator.",
    locationPermissionDenied: "Location permission denied. The player marker may be outdated.",
    refreshCurrentLocationFailed: "Failed to refresh the current location.",
    locationFetchFailed: "Failed to get location.",
    locationTimeout: "Location request timed out.",
  },
  ukrainian: {
    locationUnavailableFallback:
      "Не вдалося отримати поточну локацію. Перевірте, чи ввімкнено геолокацію, і спробуйте ще раз.",
    locationServicesDisabled: "Службу геолокації вимкнено на пристрої/емуляторі.",
    locationPermissionDenied: "Немає дозволу на геолокацію. Маркер гравця може бути неактуальним.",
    refreshCurrentLocationFailed: "Не вдалося оновити поточну локацію.",
    locationFetchFailed: "Не вдалося отримати локацію.",
    locationTimeout: "Час очікування локації вичерпано.",
  },
  russian: {
    locationUnavailableFallback:
      "Не удалось получить текущую локацию. Проверьте, включена ли геолокация, и попробуйте снова.",
    locationServicesDisabled: "Служба геолокации отключена на устройстве/эмуляторе.",
    locationPermissionDenied: "Нет разрешения на геолокацию. Маркер игрока может быть неактуальным.",
    refreshCurrentLocationFailed: "Не удалось обновить текущую локацию.",
    locationFetchFailed: "Не удалось получить локацию.",
    locationTimeout: "Превышено время ожидания локации.",
  },
} as const;

function toPlayerLocation(
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
  },
  timestamp: number,
  fallbackHeading?: number | null,
) {
  const resolvedHeading =
    typeof coords.heading === "number" && Number.isFinite(coords.heading) && coords.heading >= 0
      ? coords.heading
      : typeof fallbackHeading === "number" && Number.isFinite(fallbackHeading) && fallbackHeading >= 0
        ? fallbackHeading
        : undefined;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: typeof coords.accuracy === "number" ? coords.accuracy : undefined,
    speed: typeof coords.speed === "number" ? coords.speed : undefined,
    heading: resolvedHeading,
    at: new Date(timestamp).toISOString(),
  } satisfies PlayerLocation;
}

export function usePlayerLocation(initialCoordinate?: MapCoordinate | null) {
  const uiLanguage = useUiLanguage();
  const text = PLAYER_LOCATION_TEXT[uiLanguage];
  const latestHeadingRef = useRef<number | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("pending");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [playerLocation, setPlayerLocation] = useState<PlayerLocation | null>(
    initialCoordinate
      ? {
          latitude: initialCoordinate.latitude,
          longitude: initialCoordinate.longitude,
          at: new Date().toISOString(),
        }
      : null,
  );

  const requestCurrentLocation = useCallback(async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new Error(text.locationServicesDisabled);
    }

    await Location.enableNetworkProviderAsync().catch(() => undefined);

    const getOneShotWatchFix = async () => {
      return new Promise<PlayerLocation>((resolve, reject) => {
        let settled = false;
        let subscription: Location.LocationSubscription | null = null;
        const timeout = setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          subscription?.remove();
          reject(new Error(text.locationTimeout));
        }, ONE_SHOT_FIX_TIMEOUT_MS);

        Location.watchPositionAsync(
          {
            accuracy: LIVE_TRACKING_ACCURACY,
            timeInterval: 1_000,
            distanceInterval: 1,
          },
          (update) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timeout);
            subscription?.remove();
            resolve(toPlayerLocation(update.coords, update.timestamp, latestHeadingRef.current));
          },
        )
          .then((nextSubscription) => {
            subscription = nextSubscription;
          })
          .catch((error: unknown) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timeout);
            reject(error);
          });
      });
    };

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: INITIAL_FIX_ACCURACY,
      });
      const normalized = toPlayerLocation(current.coords, current.timestamp, latestHeadingRef.current);
      setPlayerLocation(normalized);
      return normalized;
    } catch (error) {
      try {
        const oneShotLocation = await getOneShotWatchFix();
        setPlayerLocation(oneShotLocation);
        return oneShotLocation;
      } catch (oneShotError) {
        void oneShotError;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const normalized = toPlayerLocation(lastKnown.coords, lastKnown.timestamp, latestHeadingRef.current);
        setPlayerLocation(normalized);
        return normalized;
      }

      if (error instanceof Error && error.message.toLowerCase().includes("current location")) {
        throw new Error(text.locationUnavailableFallback);
      }

      throw error;
    }
  }, [text]);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;

    async function startTracking() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setPermissionState("denied");
          setLocationError(text.locationPermissionDenied);
          return;
        }

        setPermissionState("granted");
        setLocationError(null);

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (isMounted && lastKnown) {
          setPlayerLocation(toPlayerLocation(lastKnown.coords, lastKnown.timestamp, latestHeadingRef.current));
        }

        void requestCurrentLocation().catch((error: unknown) => {
          if (!isMounted) {
            return;
          }

          setLocationError(error instanceof Error ? error.message : text.refreshCurrentLocationFailed);
        });

        headingSubscription = await Location.watchHeadingAsync((headingUpdate) => {
          if (!isMounted) {
            return;
          }

          const candidateHeading =
            Number.isFinite(headingUpdate.trueHeading) && headingUpdate.trueHeading >= 0
            ? headingUpdate.trueHeading
            : Number.isFinite(headingUpdate.magHeading) && headingUpdate.magHeading >= 0
              ? headingUpdate.magHeading
              : null;

          latestHeadingRef.current = candidateHeading;

          if (!Number.isFinite(candidateHeading)) {
            return;
          }

          setPlayerLocation((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              heading: candidateHeading ?? undefined,
            };
          });
        });

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: LIVE_TRACKING_ACCURACY,
            timeInterval: LIVE_TRACKING_TIME_INTERVAL_MS,
            distanceInterval: LIVE_TRACKING_DISTANCE_INTERVAL_METERS,
          },
          (update) => {
            if (!isMounted) {
              return;
            }

            setLocationError(null);
            setPlayerLocation(toPlayerLocation(update.coords, update.timestamp, latestHeadingRef.current));
          },
        );

        pollingTimer = setInterval(() => {
          Location.getCurrentPositionAsync({
            accuracy: LIVE_TRACKING_ACCURACY,
          })
            .then((current) => {
              if (!isMounted) {
                return;
              }

              setLocationError(null);
              setPlayerLocation(toPlayerLocation(current.coords, current.timestamp, latestHeadingRef.current));
            })
            .catch(() => undefined);
        }, LIVE_TRACKING_POLL_INTERVAL_MS);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPermissionState("error");
        setLocationError(error instanceof Error ? error.message : text.locationFetchFailed);
      }
    }

    void startTracking();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
      headingSubscription?.remove();
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [requestCurrentLocation, text]);

  return {
    playerLocation,
    permissionState,
    locationError,
    requestCurrentLocation,
  };
}
