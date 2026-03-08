import { useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Callout, Marker, UrlTile } from "react-native-maps";
import Svg, { Circle, Path } from "react-native-svg";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { MapCoordinate, PlayerLocation, StationPin } from "../model/types";

const OPEN_STREET_MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION_LABEL = "Map data © OpenStreetMap contributors";
const MAP_MODE_LABEL = "OSM • tryb terenowy";

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

function StationPinMarker({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 34,
        height: 44,
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
      }}
    >
      <Svg width={34} height={44} viewBox="0 0 24 32">
        <Path d="M12 0C6.477 0 2 4.477 2 10c0 7.5 10 22 10 22s10-14.5 10-22C22 4.477 17.523 0 12 0z" fill={color} />
        <Circle cx={12} cy={10} r={4.2} fill="#ffffff" />
      </Svg>
    </View>
  );
}

function PlayerMarker() {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: "rgba(245, 158, 11, 0.18)",
          borderWidth: 1,
          borderColor: "rgba(245, 158, 11, 0.55)",
        }}
      />
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: EXPEDITION_THEME.accent,
          borderWidth: 2,
          borderColor: "#ffffff",
        }}
      />
    </View>
  );
}

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
    <View style={{ flex: 1 }}>
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
        mapType="none"
      >
        <UrlTile
          urlTemplate={OPEN_STREET_MAP_TILE_URL}
          maximumZ={19}
          flipY={false}
          shouldReplaceMapContent
          zIndex={0}
        />

        {playerLocation && (
          <Marker
            coordinate={{
              latitude: playerLocation.latitude,
              longitude: playerLocation.longitude,
            }}
            title="Twoja pozycja"
            description="Aktualna pozycja drużyny"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PlayerMarker />
          </Marker>
        )}

        {pins.map((pin) => {
          const isSelected = selectedStationId === pin.stationId;
          const isDone = pin.status === "done";
          const markerColor = isSelected ? EXPEDITION_THEME.accentStrong : isDone ? "#10b981" : pin.customization.color;

          return (
            <Marker
              key={pin.stationId}
              coordinate={pin.coordinate}
              onPress={() => onSelectStation(pin.stationId)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <StationPinMarker color={markerColor} />
              <Callout tooltip>
                <View
                  style={{
                    width: 280,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panel,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: EXPEDITION_THEME.textPrimary }}>{pin.label}</Text>
                  <Text style={{ marginTop: 4, fontSize: 12, color: EXPEDITION_THEME.textMuted }}>
                    Status: {pin.status === "done" ? "Ukończone" : pin.status === "in-progress" ? "W trakcie" : "Do zrobienia"}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View pointerEvents="none" style={{ position: "absolute", left: 14, top: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.35)",
            backgroundColor: "rgba(24, 24, 27, 0.84)",
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: EXPEDITION_THEME.accent }} />
          <Text style={{ fontSize: 11, fontWeight: "600", color: "#f4f4f5" }}>{MAP_MODE_LABEL}</Text>
        </View>
      </View>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          borderRadius: 10,
          backgroundColor: "rgba(17, 24, 39, 0.82)",
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <Text style={{ fontSize: 11, color: "#f4f4f5" }}>{OSM_ATTRIBUTION_LABEL}</Text>
      </View>
    </View>
  );
}
