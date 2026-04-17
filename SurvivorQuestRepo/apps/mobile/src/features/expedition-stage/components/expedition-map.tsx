import { useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { MapCoordinate, PlayerLocation, StationPin } from "../model/types";

const DEFAULT_LATITUDE_DELTA = 0.009;
const DEFAULT_LONGITUDE_DELTA = 0.009;
const FOCUS_LATITUDE_DELTA = 0.0045;
const FOCUS_LONGITUDE_DELTA = 0.0045;

type ExpeditionMapProps = {
  centerCoordinate: MapCoordinate;
  playerLocation: PlayerLocation | null;
  pins: StationPin[];
  selectedStationId: string | null;
  focusCoordinate: MapCoordinate | null;
  onSelectStation: (stationId: string) => void;
};

function isFiniteCoordinate(value: { latitude: number; longitude: number } | null | undefined) {
  if (!value) {
    return false;
  }

  return Number.isFinite(value.latitude) && Number.isFinite(value.longitude);
}

function buildRegion(
  coordinate: MapCoordinate,
  latitudeDelta = DEFAULT_LATITUDE_DELTA,
  longitudeDelta = DEFAULT_LONGITUDE_DELTA,
): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

function toCoordinateKey(coordinate: MapCoordinate | null | undefined) {
  if (!isFiniteCoordinate(coordinate)) {
    return null;
  }

  return `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
}

function resolveStationPinColor(pin: StationPin, isSelected: boolean) {
  if (isSelected) {
    return "#f0c977";
  }

  if (pin.status === "done") {
    return "#10b981";
  }

  if (pin.failed) {
    return "#ef4444";
  }

  return pin.customization?.color || "#f59e0b";
}

export function ExpeditionMap({
  centerCoordinate,
  playerLocation,
  pins,
  selectedStationId,
  focusCoordinate,
  onSelectStation,
}: ExpeditionMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const initialRegionRef = useRef<Region>(buildRegion(centerCoordinate));
  const lastCenterKeyRef = useRef<string | null>(toCoordinateKey(centerCoordinate));
  const lastFocusKeyRef = useRef<string | null>(null);

  const renderablePins = useMemo(
    () =>
      pins.filter((pin) =>
        isFiniteCoordinate({
          latitude: pin.coordinate.latitude,
          longitude: pin.coordinate.longitude,
        }),
      ),
    [pins],
  );

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const focusKey = toCoordinateKey(focusCoordinate);
    if (focusKey && focusCoordinate && isFiniteCoordinate(focusCoordinate)) {
      if (focusKey !== lastFocusKeyRef.current) {
        mapRef.current?.animateToRegion(
          buildRegion(focusCoordinate, FOCUS_LATITUDE_DELTA, FOCUS_LONGITUDE_DELTA),
          350,
        );
        lastFocusKeyRef.current = focusKey;
      }
      return;
    }

    lastFocusKeyRef.current = null;

    const centerKey = toCoordinateKey(centerCoordinate);
    if (
      centerKey &&
      centerCoordinate &&
      isFiniteCoordinate(centerCoordinate) &&
      centerKey !== lastCenterKeyRef.current
    ) {
      mapRef.current?.animateToRegion(buildRegion(centerCoordinate), 250);
      lastCenterKeyRef.current = centerKey;
    }
  }, [centerCoordinate, focusCoordinate]);

  if (Platform.OS === "web") {
    return (
      <View className="h-full items-center justify-center px-6" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}>
        <Text className="text-center text-sm" style={{ color: EXPEDITION_THEME.textPrimary }}>
          Widok mapy geograficznej jest dostępny na urządzeniach mobilnych (iOS/Android).
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegionRef.current}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {renderablePins.map((pin) => {
          const isSelected = selectedStationId === pin.stationId;
          const markerColor = resolveStationPinColor(pin, isSelected);
          const markerOpacity = pin.status === "done" || pin.failed ? 0.65 : 1;

          return (
            <Marker
              key={pin.stationId}
              coordinate={pin.coordinate}
              onPress={() => onSelectStation(pin.stationId)}
              tracksViewChanges={false}
            >
              <View
                style={{
                  minWidth: 30,
                  minHeight: 30,
                  borderRadius: 15,
                  borderWidth: isSelected ? 2.5 : 1.5,
                  borderColor: isSelected ? "#f0c977" : "#0f172a",
                  backgroundColor: markerColor,
                  opacity: markerOpacity,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 15 }}>{pin.customization?.icon || "📍"}</Text>
              </View>
            </Marker>
          );
        })}

        {playerLocation && isFiniteCoordinate(playerLocation) ? (
          <Marker coordinate={playerLocation} tracksViewChanges={false}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: "#ffffff",
                backgroundColor: "#2563eb",
                shadowColor: "#2563eb",
                shadowOpacity: 0.45,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 1 },
              }}
            />
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}
