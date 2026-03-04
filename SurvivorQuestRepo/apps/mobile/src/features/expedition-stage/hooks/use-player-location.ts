import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { MapCoordinate, PlayerLocation } from "../model/types";

export type LocationPermissionState = "pending" | "granted" | "denied" | "error";

function toPlayerLocation(coords: { latitude: number; longitude: number; accuracy?: number | null }, timestamp: number) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: typeof coords.accuracy === "number" ? coords.accuracy : undefined,
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
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const normalized = toPlayerLocation(current.coords, current.timestamp);
    setPlayerLocation(normalized);
    return normalized;
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
        await requestCurrentLocation();

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10_000,
            distanceInterval: 8,
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
