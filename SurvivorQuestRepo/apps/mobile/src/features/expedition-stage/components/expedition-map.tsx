import { useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { MapCoordinate, PlayerLocation, StationPin } from "../model/types";

type ExpeditionMapProps = {
  centerCoordinate: MapCoordinate;
  playerLocation: PlayerLocation | null;
  pins: StationPin[];
  selectedStationId: string | null;
  focusCoordinate: MapCoordinate | null;
  onSelectStation: (stationId: string) => void;
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

export function ExpeditionMap({
  centerCoordinate,
  playerLocation,
  pins,
  selectedStationId,
  focusCoordinate,
  onSelectStation,
}: ExpeditionMapProps) {
  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo(
    () => ({
      latitude: centerCoordinate.latitude,
      longitude: centerCoordinate.longitude,
      ...DEFAULT_DELTA,
    }),
    [centerCoordinate.latitude, centerCoordinate.longitude],
  );

  useEffect(() => {
    if (Platform.OS === "web" || !focusCoordinate) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: focusCoordinate.latitude,
        longitude: focusCoordinate.longitude,
        ...DEFAULT_DELTA,
      },
      450,
    );
  }, [focusCoordinate]);

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
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      showsBuildings={false}
      showsTraffic={false}
      mapType="standard"
    >
      {playerLocation && (
        <Marker
          coordinate={{
            latitude: playerLocation.latitude,
            longitude: playerLocation.longitude,
          }}
          pinColor={EXPEDITION_THEME.accent}
          title="Twoja pozycja"
          description="Aktualna pozycja drużyny"
        />
      )}

      {pins.map((pin) => {
        const isSelected = selectedStationId === pin.stationId;
        const isDone = pin.status === "done";

        return (
          <Marker
            key={pin.stationId}
            coordinate={pin.coordinate}
            onPress={() => onSelectStation(pin.stationId)}
            title={pin.label}
          >
            <View
              style={{
                minWidth: 38,
                minHeight: 38,
                borderRadius: 19,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pin.customization.color,
                borderWidth: 2,
                borderColor: isSelected
                  ? EXPEDITION_THEME.accentStrong
                  : isDone
                    ? "#10b981"
                    : "rgba(15, 23, 42, 0.35)",
              }}
            >
              <Text style={{ fontSize: 18 }}>{pin.customization.icon}</Text>
            </View>
            <Callout tooltip={false}>
              <View className="max-w-56 rounded-xl border bg-zinc-900 px-3 py-2" style={{ borderColor: EXPEDITION_THEME.border }}>
                <Text className="text-xs font-semibold text-zinc-100">{pin.label}</Text>
                <Text className="mt-0.5 text-xs text-zinc-400">
                  Status: {pin.status === "done" ? "Ukończone" : pin.status === "in-progress" ? "W trakcie" : "Do zrobienia"}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}
