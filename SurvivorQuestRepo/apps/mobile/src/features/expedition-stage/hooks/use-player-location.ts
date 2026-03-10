import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { MapCoordinate, PlayerLocation } from "../model/types";

export type LocationPermissionState = "pending" | "granted" | "denied" | "error";

const INITIAL_FIX_ACCURACY = Location.Accuracy.Low;
const LIVE_TRACKING_ACCURACY = Location.Accuracy.Balanced;
const LIVE_TRACKING_TIME_INTERVAL_MS = 4_000;
const LIVE_TRACKING_DISTANCE_INTERVAL_METERS = 3;
const LOCATION_UNAVAILABLE_FALLBACK_MESSAGE =
  "Emulator nie zwrócił bieżącej lokalizacji. Ustaw punkt w Extended controls > Location i spróbuj ponownie.";

function toPlayerLocation(
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
  },
  timestamp: number,
) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: typeof coords.accuracy === "number" ? coords.accuracy : undefined,
    speed: typeof coords.speed === "number" ? coords.speed : undefined,
    heading: typeof coords.heading === "number" ? coords.heading : undefined,
    at: new Date(timestamp).toISOString(),
  } satisfies PlayerLocation;
}

export function usePlayerLocation(initialCoordinate?: MapCoordinate | null) {
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

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: INITIAL_FIX_ACCURACY,
      });
      const normalized = toPlayerLocation(current.coords, current.timestamp);
      setPlayerLocation(normalized);
      return normalized;
    } catch (error) {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const normalized = toPlayerLocation(lastKnown.coords, lastKnown.timestamp);
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
    let subscription: Location.LocationSubscription | null = null;

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
          setPlayerLocation(toPlayerLocation(lastKnown.coords, lastKnown.timestamp));
        }

        void requestCurrentLocation().catch((error: unknown) => {
          if (!isMounted) {
            return;
          }

          setLocationError(error instanceof Error ? error.message : "Nie udało się odświeżyć bieżącej lokalizacji.");
        });

        subscription = await Location.watchPositionAsync(
          {
            accuracy: LIVE_TRACKING_ACCURACY,
            timeInterval: LIVE_TRACKING_TIME_INTERVAL_MS,
            distanceInterval: LIVE_TRACKING_DISTANCE_INTERVAL_METERS,
          },
          (update) => {
            if (!isMounted) {
              return;
            }

            setPlayerLocation(toPlayerLocation(update.coords, update.timestamp));
          },
        );
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
      subscription?.remove();
    };
  }, [requestCurrentLocation]);

  return {
    playerLocation,
    permissionState,
    locationError,
    requestCurrentLocation,
  };
}
