import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { MapCoordinate, PlayerLocation } from "../model/types";

export type LocationPermissionState = "pending" | "granted" | "denied" | "error";

const INITIAL_FIX_ACCURACY = Location.Accuracy.Low;
const LIVE_TRACKING_ACCURACY = Location.Accuracy.Highest;
const LIVE_TRACKING_TIME_INTERVAL_MS = 1_500;
const LIVE_TRACKING_DISTANCE_INTERVAL_METERS = 1;
const LIVE_TRACKING_POLL_INTERVAL_MS = 7_000;
const ONE_SHOT_FIX_TIMEOUT_MS = 6_500;
const LOCATION_UNAVAILABLE_FALLBACK_MESSAGE =
  "Nie udało się pobrać bieżącej lokalizacji. Sprawdź, czy lokalizacja jest włączona, i spróbuj ponownie.";

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
      throw new Error("Usługa lokalizacji jest wyłączona w urządzeniu/emulatorze.");
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
          reject(new Error("Location timeout"));
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
        throw new Error(LOCATION_UNAVAILABLE_FALLBACK_MESSAGE);
      }

      throw error;
    }
  }, []);

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
          setLocationError("Brak zgody na lokalizację. Marker gracza może być nieaktualny.");
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

          setLocationError(error instanceof Error ? error.message : "Nie udało się odświeżyć bieżącej lokalizacji.");
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
        setLocationError(error instanceof Error ? error.message : "Nie udało się pobrać lokalizacji.");
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
  }, [requestCurrentLocation]);

  return {
    playerLocation,
    permissionState,
    locationError,
    requestCurrentLocation,
  };
}
