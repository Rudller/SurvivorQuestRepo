import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { DEFAULT_STATION_PIN_CUSTOMIZATION, type MapCoordinate, type PlayerLocation, type StationPin } from "../model/types";

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
  playerIcon: string;
  playerColor?: string | null;
  onSelectStation: (stationId: string | null) => void;
};

const EXPEDITION_MAP_TEXT: Record<UiLanguage, { webNotice: string }> = {
  polish: {
    webNotice: "Widok mapy geograficznej jest dostępny na urządzeniach mobilnych (iOS/Android).",
  },
  english: {
    webNotice: "The geographic map view is available on mobile devices (iOS/Android).",
  },
  ukrainian: {
    webNotice: "Географічна карта доступна на мобільних пристроях (iOS/Android).",
  },
  russian: {
    webNotice: "Географический вид карты доступен на мобильных устройствах (iOS/Android).",
  },
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
    return EXPEDITION_THEME.accent;
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
  const mapBackgroundColor = EXPEDITION_THEME.background;
  const markerNumberBackground = EXPEDITION_THEME.panelMuted;
  const markerNumberText = EXPEDITION_THEME.textPrimary;
  const markerNumberBorder = EXPEDITION_THEME.border;
  const selectedBorderColor = EXPEDITION_THEME.accent;

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
        background: ${mapBackgroundColor};
      }
      .station-marker-wrapper {
        position: relative;
        width: 34px;
        height: 46px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .station-marker-spike {
        position: absolute;
        left: 50%;
        top: 34px;
        margin-left: -6px;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 9px solid var(--pin-color, #f59e0b);
        filter: drop-shadow(0 2px 3px rgba(3, 7, 18, 0.35));
        z-index: 0;
        pointer-events: none;
      }
      .station-marker {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 12px;
        box-sizing: border-box;
        box-shadow: 0 8px 18px rgba(3, 7, 18, 0.4);
        z-index: 1;
      }
      .station-marker-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: #f8fafc;
      }
      .station-marker-icon svg {
        display: block;
        width: 18px;
        height: 18px;
        stroke: currentColor;
        stroke-width: 2.2;
        fill: none;
        line-height: 1;
      }
      .station-marker-number {
        position: absolute;
        right: -7px;
        top: -7px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 999px;
        border: 1px solid ${markerNumberBorder};
        background: ${markerNumberBackground};
        color: ${markerNumberText};
        font-size: 9px;
        font-weight: 700;
        line-height: 14px;
        text-align: center;
        box-sizing: border-box;
        pointer-events: none;
      }
      .station-marker--selected {
        border: 2.5px solid ${selectedBorderColor};
        transform: scale(1.08);
        box-shadow: 0 0 0 3px rgba(240, 201, 119, 0.18), 0 8px 18px rgba(3, 7, 18, 0.55);
      }
      .station-marker--default {
        border: 1.75px solid rgba(15, 23, 42, 0.8);
      }
      .player-marker {
        position: relative;
        width: 40px;
        height: 40px;
        border-radius: 999px;
        overflow: hidden;
        pointer-events: none;
      }
      .player-marker-shadow {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 22px;
        height: 22px;
        margin-left: -11px;
        margin-top: -11px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.16);
      }
      .player-marker-dot {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 22px;
        height: 22px;
        margin-left: -11px;
        margin-top: -11px;
        border-radius: 999px;
        border: 2px solid #f8fafc;
        background: var(--player-accent, #0ea5e9);
        box-shadow: 0 0 0 1px rgba(8, 47, 73, 0.28), 0 1px 2px rgba(2, 6, 23, 0.35);
      }
      .player-marker-dot::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 4px;
        height: 4px;
        margin-left: -2px;
        margin-top: -2px;
        border-radius: 999px;
        background: #e0f2fe;
      }
      .player-marker-badge {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -52%);
        font-size: 11px;
        line-height: 1;
        color: #f8fafc;
        text-shadow: 0 1px 1px rgba(2, 6, 23, 0.4);
        pointer-events: none;
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
      const PLAYER_MOVING_SPEED_THRESHOLD_MPS = 0.9;
      const PLAYER_MOVEMENT_STEP_THRESHOLD_METERS = 3;
      const PLAYER_AUTO_FOCUS_MOVING_DISTANCE_METERS = 6;
      const PLAYER_AUTO_FOCUS_STATIONARY_DISTANCE_METERS = 18;
      const MAX_EFFECTIVE_ACCURACY_METERS = 30;
      const MANUAL_PAN_STATIONARY_LOCK_MS = 12000;
      const SMOOTH_PAN_DISTANCE_MAX_METERS = 250;
      const SMOOTH_PAN_FAST_DISTANCE_METERS = 80;
      let lastPayloadCenter = null;
      let lastAutoFocusedPlayer = null;
      let lastPlayerSample = null;
      let userPanLockedUntil = 0;

      function toLatLngIfFinite(value) {
        if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
          return null;
        }
        return L.latLng(value.latitude, value.longitude);
      }
      function normalizePlayerColor(value) {
        if (typeof value !== "string") {
          return "#0ea5e9";
        }
        const trimmed = value.trim();
        if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
          return trimmed;
        }
        return "#0ea5e9";
      }
      function escapeInlineText(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      lastPayloadCenter = toLatLngIfFinite(payload.center);
      lastAutoFocusedPlayer = toLatLngIfFinite(payload.player);
      lastPlayerSample = toLatLngIfFinite(payload.player);

      map.on("movestart", (event) => {
        if (event && event.originalEvent) {
          userPanLockedUntil = Date.now() + MANUAL_PAN_STATIONARY_LOCK_MS;
        }
      });
      map.on("click", (event) => {
        const rawTarget = event && event.originalEvent ? event.originalEvent.target : null;
        if (
          rawTarget &&
          typeof rawTarget.closest === "function" &&
          rawTarget.closest(".station-marker-wrapper")
        ) {
          return;
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage("__clear_station_selection__");
        }
      });

      L.tileLayer(payload.tileUrl, {
        maxZoom: 20,
        attribution: payload.tileAttribution,
      }).addTo(map);

      function renderPins(nextPins) {
        stationLayer.clearLayers();
        nextPins.forEach((pin) => {
          const markerClass = pin.isSelected ? "station-marker station-marker--selected" : "station-marker station-marker--default";
          const stationNumber =
            Number.isFinite(pin.number) && pin.number > 0
              ? Math.max(1, Math.round(pin.number))
              : null;
          const stationNumberBadge = stationNumber
            ? '<span class="station-marker-number">' + stationNumber + "</span>"
            : "";
          const marker = L.marker([pin.latitude, pin.longitude], {
            icon: L.divIcon({
              className: "",
              html:
                '<div class="station-marker-wrapper" style="--pin-color:' +
                pin.color +
                ";opacity:" +
                pin.opacity +
                ';"><div class="station-marker-spike"></div><div class="' +
                markerClass +
                '" style="background:' +
                pin.color +
                ';"><span class="station-marker-icon">' +
                pin.icon +
                "</span>" +
                stationNumberBadge +
                "</div></div>",
              iconSize: [34, 46],
              iconAnchor: [17, 44],
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
        const playerAccentColor = normalizePlayerColor(player.color);
        const playerIcon =
          typeof player.icon === "string"
            ? Array.from(player.icon.trim()).slice(0, 2).join("")
            : "";
        const playerBadgeHtml = playerIcon
          ? '<span class="player-marker-badge">' + escapeInlineText(playerIcon) + "</span>"
          : "";
        const icon = L.divIcon({
          className: "",
          html:
            '<div class="player-marker" style="--player-accent:' +
            playerAccentColor +
            ';"><div class="player-marker-shadow"></div><div class="player-marker-dot">' +
            playerBadgeHtml +
            "</div></div>",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        if (playerMarker) {
          playerMarker.setLatLng([player.latitude, player.longitude]);
          playerMarker.setIcon(icon);
          return;
        }

        playerMarker = L.marker([player.latitude, player.longitude], { icon }).addTo(map);
      }

      function smoothMoveTo(target) {
        const distanceFromCurrentCenter = map.getCenter().distanceTo(target);
        if (!Number.isFinite(distanceFromCurrentCenter) || distanceFromCurrentCenter <= 0.8) {
          return;
        }

        if (distanceFromCurrentCenter > SMOOTH_PAN_DISTANCE_MAX_METERS) {
          map.setView(target, map.getZoom(), { animate: false });
          return;
        }

        const panDurationSeconds =
          distanceFromCurrentCenter > SMOOTH_PAN_FAST_DISTANCE_METERS ? 0.95 : 0.55;
        map.panTo(target, {
          animate: true,
          duration: panDurationSeconds,
          easeLinearity: 0.25,
          noMoveStart: true,
        });
      }

      function maybeAutoFocusOnPlayer(player) {
        const nextPlayer = toLatLngIfFinite(player);
        if (!nextPlayer) {
          return false;
        }

        const previousPlayerSample = lastPlayerSample;
        lastPlayerSample = nextPlayer;

        if (!lastAutoFocusedPlayer) {
          smoothMoveTo(nextPlayer);
          lastAutoFocusedPlayer = nextPlayer;
          lastPayloadCenter = nextPlayer;
          return true;
        }

        const movedSinceLastSampleMeters = previousPlayerSample
          ? previousPlayerSample.distanceTo(nextPlayer)
          : 0;
        const movedSinceAutoFocusMeters = lastAutoFocusedPlayer.distanceTo(nextPlayer);
        const rawAccuracyMeters =
          Number.isFinite(player && player.accuracy) && player.accuracy > 0 ? player.accuracy : 0;
        const effectiveAccuracyMeters = Math.min(rawAccuracyMeters, MAX_EFFECTIVE_ACCURACY_METERS);
        const speedMetersPerSecond =
          Number.isFinite(player && player.speed) && player.speed > 0 ? player.speed : 0;
        const movementNoiseFloorMeters = Math.max(
          PLAYER_MOVEMENT_STEP_THRESHOLD_METERS,
          effectiveAccuracyMeters * 0.35,
        );
        const isMoving =
          speedMetersPerSecond >= PLAYER_MOVING_SPEED_THRESHOLD_MPS ||
          movedSinceLastSampleMeters >= movementNoiseFloorMeters;

        if (!isMoving) {
          return false;
        }

        const isManualPanLockActive = Date.now() < userPanLockedUntil;
        if (
          isManualPanLockActive &&
          speedMetersPerSecond < PLAYER_MOVING_SPEED_THRESHOLD_MPS &&
          movedSinceAutoFocusMeters < PLAYER_AUTO_FOCUS_STATIONARY_DISTANCE_METERS
        ) {
          return false;
        }

        const requiredMovementMeters = isMoving
          ? Math.max(PLAYER_AUTO_FOCUS_MOVING_DISTANCE_METERS, effectiveAccuracyMeters * 0.6)
          : Math.max(PLAYER_AUTO_FOCUS_STATIONARY_DISTANCE_METERS, effectiveAccuracyMeters * 1.5);

        if (movedSinceAutoFocusMeters < requiredMovementMeters) {
          return false;
        }

        smoothMoveTo(nextPlayer);
        lastAutoFocusedPlayer = nextPlayer;
        lastPayloadCenter = nextPlayer;
        return true;
      }

      function applyPayload(nextPayload) {
        if (!nextPayload || typeof nextPayload !== "object") {
          return;
        }

        renderPins(Array.isArray(nextPayload.pins) ? nextPayload.pins : []);
        renderPlayer(nextPayload.player ?? null);

        if (nextPayload.focus && Number.isFinite(nextPayload.focus.latitude) && Number.isFinite(nextPayload.focus.longitude)) {
          map.setView([nextPayload.focus.latitude, nextPayload.focus.longitude], 17, {
            animate: true,
            duration: 0.45,
          });
          return;
        }

        if (toLatLngIfFinite(nextPayload.player)) {
          void maybeAutoFocusOnPlayer(nextPayload.player);
          return;
        }

        const nextCenter = toLatLngIfFinite(nextPayload.center);
        if (!nextCenter) {
          return;
        }

        const payloadCenterChanged = !lastPayloadCenter || lastPayloadCenter.distanceTo(nextCenter) > 4;
        if (payloadCenterChanged) {
          smoothMoveTo(nextCenter);
          lastPayloadCenter = nextCenter;
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
  playerIcon,
  playerColor,
  onSelectStation,
}: ExpeditionMapProps) {
  const uiLanguage = useUiLanguage();
  const text = EXPEDITION_MAP_TEXT[uiLanguage];
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
      <View className="h-full items-center justify-center px-6" style={{ backgroundColor: EXPEDITION_THEME.panelMuted }}>
        <Text className="text-center text-sm" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {text.webNotice}
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
              icon: playerIcon,
              color: playerColor ?? null,
              heading: normalizeHeading(playerLocation.heading),
              accuracy:
                typeof playerLocation.accuracy === "number" && Number.isFinite(playerLocation.accuracy)
                  ? playerLocation.accuracy
                  : null,
              speed:
                typeof playerLocation.speed === "number" && Number.isFinite(playerLocation.speed)
                  ? playerLocation.speed
                  : null,
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
          icon: pin.customization?.icon || DEFAULT_STATION_PIN_CUSTOMIZATION.icon,
          color: resolveStationPinColor(pin, isSelected),
          opacity: pin.status === "done" || pin.failed ? 0.9 : 1,
          isSelected,
          number: typeof pin.stationNumber === "number" && Number.isFinite(pin.stationNumber) ? pin.stationNumber : null,
        };
      }),
    }),
    [centerCoordinate, focusCoordinate, playerColor, playerIcon, playerLocation, renderablePins, selectedStationId],
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
    const message = event.nativeEvent.data?.trim();
    if (!message) {
      return;
    }

    if (message === "__clear_station_selection__") {
      onSelectStation(null);
      return;
    }

    onSelectStation(message);
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
