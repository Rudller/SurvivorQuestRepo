import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { MapCoordinate, PlayerLocation, StationPin } from "../model/types";

const OSM_ATTRIBUTION_LABEL = "© OpenStreetMap contributors";
const DEFAULT_ZOOM = 14;

type ExpeditionMapProps = {
  centerCoordinate: MapCoordinate;
  playerLocation: PlayerLocation | null;
  pins: StationPin[];
  selectedStationId: string | null;
  focusCoordinate: MapCoordinate | null;
  onSelectStation: (stationId: string) => void;
};

type MapPayload = {
  centerCoordinate: MapCoordinate;
  playerLocation: PlayerLocation | null;
  pins: StationPin[];
  selectedStationId: string | null;
  focusCoordinate: MapCoordinate | null;
};

function buildLeafletHtml(initialPayloadJson: string) {
  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #0f1914; }
      .station-pin {
        width: 32px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        const initialPayload = ${initialPayloadJson};
        let map = null;
        let stationLayer = null;
        let playerMarker = null;
        let initializedCenter = false;
        let lastFocusKey = null;
        let lastCenterKey = null;

        function post(message) {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function") {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
        }

        function toLatLng(coordinate) {
          if (!coordinate) {
            return null;
          }

          if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
            return null;
          }

          return [coordinate.latitude, coordinate.longitude];
        }

        function buildPinHtml(color, isSelected, isDone) {
          const strokeColor = isSelected ? "#f0c977" : isDone ? "#34d399" : "#0f172a";
          const pinOpacity = isDone ? "0.55" : "1";
          return '<div class="station-pin" style="opacity:' + pinOpacity + ';"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46"><path d="M16 2C8.3 2 2 8.2 2 16c0 11.4 12.1 26.1 12.6 26.8.4.5 1.2.5 1.6 0C17.9 42.1 30 27.4 30 16 30 8.2 23.7 2 16 2z" fill="' + color + '" stroke="' + strokeColor + '" stroke-width="2"/><circle cx="16" cy="16" r="5.3" fill="#ffffff"/></svg></div>';
        }

        function buildPlayerPinHtml() {
          return '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="rgba(37,99,235,0.28)" stroke="#2563eb" stroke-width="2"/><circle cx="20" cy="20" r="5.5" fill="#2563eb" stroke="#ffffff" stroke-width="3"/></svg></div>';
        }

        function ensureMap() {
          if (map) {
            return;
          }

          map = L.map("map", {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true,
          });

          stationLayer = L.layerGroup().addTo(map);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(map);
        }

        function applyPayload(payload) {
          ensureMap();

          const center = toLatLng(payload.centerCoordinate);
          if (!initializedCenter && center) {
            map.setView(center, ${DEFAULT_ZOOM});
            initializedCenter = true;
            lastCenterKey = center[0].toFixed(6) + "," + center[1].toFixed(6);
          }

          const focus = toLatLng(payload.focusCoordinate);
          if (focus) {
            const focusKey = focus[0].toFixed(6) + "," + focus[1].toFixed(6);
            if (focusKey !== lastFocusKey) {
              map.flyTo(focus, Math.max(map.getZoom(), ${DEFAULT_ZOOM}), { animate: true, duration: 0.35 });
              lastFocusKey = focusKey;
            }
          } else {
            lastFocusKey = null;

            if (center) {
              const centerKey = center[0].toFixed(6) + "," + center[1].toFixed(6);
              if (centerKey !== lastCenterKey) {
                map.setView(center, map.getZoom(), { animate: false });
                lastCenterKey = centerKey;
              }
            }
          }

          stationLayer.clearLayers();

          const pins = Array.isArray(payload.pins) ? payload.pins : [];
          pins.forEach(function (pin) {
            const markerColor =
              pin && pin.status === "done"
                ? "#10b981"
                : pin && pin.customization && typeof pin.customization.color === "string"
                  ? pin.customization.color
                  : "#f59e0b";
            const isSelected = payload.selectedStationId === pin.stationId;
            const icon = L.divIcon({
              className: "",
              html: buildPinHtml(markerColor, isSelected, pin.status === "done"),
              iconSize: [32, 46],
              iconAnchor: [16, 44],
              popupAnchor: [0, -40],
            });

            const marker = L.marker([pin.coordinate.latitude, pin.coordinate.longitude], { icon });
            marker.on("click", function () {
              post({ type: "selectStation", stationId: pin.stationId });
            });
            stationLayer.addLayer(marker);
          });

          if (playerMarker) {
            map.removeLayer(playerMarker);
            playerMarker = null;
          }

          const player = toLatLng(payload.playerLocation);
          if (player) {
            const playerIcon = L.divIcon({
              className: "",
              html: buildPlayerPinHtml(),
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });
            playerMarker = L.marker(player, {
              icon: playerIcon,
              zIndexOffset: 1600,
            }).addTo(map);
          }
        }

        function handleMessage(raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.type === "update-map") {
              applyPayload(parsed.payload || {});
            }
          } catch (error) {
            post({ type: "error", message: String(error) });
          }
        }

        document.addEventListener("message", function (event) {
          handleMessage(event.data);
        });

        window.addEventListener("message", function (event) {
          handleMessage(event.data);
        });

        applyPayload(initialPayload);
        post({ type: "ready" });
      })();
    </script>
  </body>
</html>`;
}

export function ExpeditionMap({
  centerCoordinate,
  playerLocation,
  pins,
  selectedStationId,
  focusCoordinate,
  onSelectStation,
}: ExpeditionMapProps) {
  const webViewRef = useRef<WebView>(null);
  const initialCenterRef = useRef(centerCoordinate);
  const [isReady, setIsReady] = useState(false);

  const payload = useMemo<MapPayload>(
    () => ({
      centerCoordinate,
      playerLocation,
      pins,
      selectedStationId,
      focusCoordinate,
    }),
    [centerCoordinate, focusCoordinate, pins, playerLocation, selectedStationId],
  );

  const initialHtml = useMemo(
    () =>
      buildLeafletHtml(
        JSON.stringify({
          centerCoordinate: initialCenterRef.current,
          playerLocation: null,
          pins: [],
          selectedStationId: null,
          focusCoordinate: null,
        } satisfies MapPayload),
      ),
    [],
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "update-map",
        payload,
      }),
    );
  }, [isReady, payload]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as { type?: string; stationId?: string };

      if (parsed.type === "ready") {
        setIsReady(true);
        return;
      }

      if (parsed.type === "selectStation" && typeof parsed.stationId === "string") {
        onSelectStation(parsed.stationId);
      }
    } catch {
      // ignore malformed webview events
    }
  }

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
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: "transparent" }}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
          maxWidth: 112,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(244, 244, 245, 0.2)",
          backgroundColor: "rgba(17, 24, 39, 0.36)",
          paddingHorizontal: 6,
          paddingVertical: 3,
        }}
      >
        <Text style={{ fontSize: 9, lineHeight: 11, color: "rgba(244, 244, 245, 0.74)" }}>{OSM_ATTRIBUTION_LABEL}</Text>
      </View>
    </View>
  );
}
