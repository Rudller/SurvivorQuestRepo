import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { MapCoordinate, PlayerLocation, StationPin } from "../model/types";

const DEFAULT_MAP_TILE_URL =
  process.env.EXPO_PUBLIC_MAP_TILE_URL?.trim() || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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

function escapeHtmlData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function normalizeHeading(heading: number | null | undefined) {
  if (!Number.isFinite(heading)) {
    return null;
  }

  const normalized = Number(heading) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
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

function buildOsmWebViewHtml(payload: unknown) {
  const encodedPayload = escapeHtmlData(payload);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        height: 100%;
        width: 100%;
        margin: 0;
        padding: 0;
        background: #0f1914;
      }
      .station-marker {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        min-height: 30px;
        border-radius: 15px;
        color: #0b1220;
        font-size: 15px;
        line-height: 1;
        box-sizing: border-box;
      }
      .station-marker--selected {
        border: 2.5px solid #f0c977;
      }
      .station-marker--default {
        border: 1.5px solid #0f172a;
      }
      .player-marker {
        position: relative;
        width: 28px;
        height: 28px;
      }
      .player-marker-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 14px;
        height: 14px;
        margin-left: -7px;
        margin-top: -7px;
        border-radius: 7px;
        border: 2px solid #ffffff;
        background-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);
      }
      .player-marker-heading {
        position: absolute;
        left: 50%;
        top: 0;
        margin-left: -5px;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 10px solid #2563eb;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const payload = ${encodedPayload};
      const map = L.map("map", {
        zoomControl: false,
      }).setView([payload.center.latitude, payload.center.longitude], 16);
      const stationLayer = L.layerGroup().addTo(map);
      let playerMarker = null;

      L.tileLayer(payload.tileUrl, {
        maxZoom: 20,
        attribution: payload.tileAttribution,
      }).addTo(map);

      function renderPins(nextPins) {
        stationLayer.clearLayers();
        nextPins.forEach((pin) => {
          const markerClass = pin.isSelected ? "station-marker station-marker--selected" : "station-marker station-marker--default";
          const marker = L.marker([pin.latitude, pin.longitude], {
            icon: L.divIcon({
              className: "",
              html: '<div class="' + markerClass + '" style="background:' + pin.color + ';opacity:' + pin.opacity + ';">' + pin.icon + "</div>",
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            }),
          }).addTo(stationLayer);

          marker.on("click", () => {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(pin.stationId);
            }
          });
        });
      }

      function renderPlayer(player) {
        const hasValidPlayer =
          player &&
          Number.isFinite(player.latitude) &&
          Number.isFinite(player.longitude);

        if (!hasValidPlayer) {
          if (playerMarker) {
            map.removeLayer(playerMarker);
            playerMarker = null;
          }
          return;
        }

        const hasHeading = Number.isFinite(player.heading);
        const headingRotation = hasHeading ? player.heading : 0;
        const headingHtml = hasHeading ? '<div class="player-marker-heading"></div>' : "";
        const icon = L.divIcon({
          className: "",
          html:
            '<div class="player-marker" style="transform: rotate(' +
            headingRotation +
            'deg)"><div class="player-marker-dot"></div>' +
            headingHtml +
            "</div>",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        if (playerMarker) {
          playerMarker.setLatLng([player.latitude, player.longitude]);
          playerMarker.setIcon(icon);
          return;
        }

        playerMarker = L.marker([player.latitude, player.longitude], { icon }).addTo(map);
      }

      function applyPayload(nextPayload) {
        if (!nextPayload || typeof nextPayload !== "object") {
          return;
        }

        renderPins(Array.isArray(nextPayload.pins) ? nextPayload.pins : []);
        renderPlayer(nextPayload.player ?? null);

        if (nextPayload.focus && Number.isFinite(nextPayload.focus.latitude) && Number.isFinite(nextPayload.focus.longitude)) {
          map.setView([nextPayload.focus.latitude, nextPayload.focus.longitude], 17, { animate: false });
          return;
        }

        if (nextPayload.center && Number.isFinite(nextPayload.center.latitude) && Number.isFinite(nextPayload.center.longitude)) {
          map.setView([nextPayload.center.latitude, nextPayload.center.longitude], map.getZoom(), { animate: false });
        }
      }

      applyPayload(payload);
      window.__SQ_UPDATE_MAP = applyPayload;
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

  if (Platform.OS === "web") {
    return (
      <View className="h-full items-center justify-center px-6" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}>
        <Text className="text-center text-sm" style={{ color: EXPEDITION_THEME.textPrimary }}>
          Widok mapy geograficznej jest dostępny na urządzeniach mobilnych (iOS/Android).
        </Text>
      </View>
    );
  }

  const webViewPayload = useMemo(
    () => ({
      center: centerCoordinate,
      focus: isFiniteCoordinate(focusCoordinate) ? focusCoordinate : null,
      player:
        playerLocation && isFiniteCoordinate(playerLocation)
          ? {
              latitude: playerLocation.latitude,
              longitude: playerLocation.longitude,
              heading: normalizeHeading(playerLocation.heading),
            }
          : null,
      tileUrl: DEFAULT_MAP_TILE_URL,
      tileAttribution: DEFAULT_MAP_TILE_ATTRIBUTION,
      pins: renderablePins.map((pin) => {
        const isSelected = selectedStationId === pin.stationId;
        return {
          stationId: pin.stationId,
          latitude: pin.coordinate.latitude,
          longitude: pin.coordinate.longitude,
          icon: pin.customization?.icon || "📍",
          color: resolveStationPinColor(pin, isSelected),
          opacity: pin.status === "done" || pin.failed ? 0.65 : 1,
          isSelected,
        };
      }),
    }),
    [centerCoordinate, focusCoordinate, playerLocation, renderablePins, selectedStationId],
  );
  const webViewRef = useRef<WebView>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const initialPayloadRef = useRef(webViewPayload);
  const webViewHtml = useMemo(() => buildOsmWebViewHtml(initialPayloadRef.current), []);
  const webViewSource = useMemo(() => ({ html: webViewHtml }), [webViewHtml]);

  useEffect(() => {
    if (!isMapLoaded) {
      return;
    }

    const updateScript = `window.__SQ_UPDATE_MAP?.(${escapeHtmlData(webViewPayload)});true;`;
    webViewRef.current?.injectJavaScript(updateScript);
  }, [isMapLoaded, webViewPayload]);

  function handleWebViewMessage(event: WebViewMessageEvent) {
    const stationId = event.nativeEvent.data?.trim();
    if (!stationId) {
      return;
    }
    onSelectStation(stationId);
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        source={webViewSource}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => setIsMapLoaded(true)}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}
