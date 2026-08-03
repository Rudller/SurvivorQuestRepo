"use client";

import { useEffect, useState } from "react";
import { Icon, type LeafletMouseEvent } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

const DEFAULT_CENTER: [number, number] = [52.2297, 21.0122];
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 14;
const SUGGESTED_ZOOM = 13;
const OSM_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_TILE_ATTRIBUTION = "Tiles &copy; Esri";
const pinSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="44" viewBox="0 0 30 44">
  <path fill="#f59e0b" stroke="#fbbf24" stroke-width="2" d="M15 2c-7 0-12 5.2-12 12 0 10.1 11.1 24.6 11.6 25.2.2.3.5.4.8.4s.6-.1.8-.4C16.9 38.6 28 24.1 28 14c0-6.8-5-12-13-12z"/>
  <circle cx="15" cy="14" r="5.5" fill="#0f172a"/>
</svg>
`;
const pinIcon = new Icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
  iconSize: [30, 44],
  iconAnchor: [15, 42],
});

interface RealizationLocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  recenterToken?: number;
  suggestedCenter?: { latitude: number; longitude: number } | null;
  onPick: (coords: { latitude: number; longitude: number }) => void;
}

function MapClickHandler({ onPick }: { onPick: RealizationLocationPickerMapProps["onPick"] }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function MapRecenterController({ latitude, longitude, recenterToken }: Pick<RealizationLocationPickerMapProps, "latitude" | "longitude" | "recenterToken">) {
  const map = useMap();

  useEffect(() => {
    if (recenterToken === undefined) {
      return;
    }

    if (typeof latitude !== "number" || !Number.isFinite(latitude) || typeof longitude !== "number" || !Number.isFinite(longitude)) {
      return;
    }

    map.setView([latitude, longitude], Math.max(map.getZoom(), SELECTED_ZOOM), { animate: true });
  }, [latitude, longitude, map, recenterToken]);

  return null;
}

function MapSuggestedCenterController({
  hasCoordinates,
  suggestedCenter,
}: {
  hasCoordinates: boolean;
  suggestedCenter?: { latitude: number; longitude: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (hasCoordinates || !suggestedCenter) {
      return;
    }

    map.setView([suggestedCenter.latitude, suggestedCenter.longitude], SUGGESTED_ZOOM, { animate: true });
  }, [hasCoordinates, suggestedCenter, map]);

  return null;
}

export function RealizationLocationPickerMap({ latitude, longitude, recenterToken, suggestedCenter, onPick }: RealizationLocationPickerMapProps) {
  const [tileMode, setTileMode] = useState<"street" | "satellite">("street");
  const hasCoordinates = typeof latitude === "number" && Number.isFinite(latitude) && typeof longitude === "number" && Number.isFinite(longitude);
  const center: [number, number] = hasCoordinates
    ? [latitude, longitude]
    : suggestedCenter
      ? [suggestedCenter.latitude, suggestedCenter.longitude]
      : DEFAULT_CENTER;
  const zoom = hasCoordinates ? SELECTED_ZOOM : suggestedCenter ? SUGGESTED_ZOOM : DEFAULT_ZOOM;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTileMode((current) => (current === "street" ? "satellite" : "street"))}
        className="absolute right-2 top-2 z-[1000] rounded-md border border-zinc-700 bg-zinc-950/90 px-2.5 py-1 text-xs font-medium text-zinc-200 shadow transition hover:border-zinc-500"
      >
        {tileMode === "street" ? "Satelita" : "Mapa"}
      </button>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="h-64 w-full rounded-lg border border-zinc-700"
        style={{ minHeight: "16rem" }}
      >
        <MapClickHandler onPick={onPick} />
        <MapRecenterController latitude={latitude} longitude={longitude} recenterToken={recenterToken} />
        <MapSuggestedCenterController hasCoordinates={hasCoordinates} suggestedCenter={suggestedCenter} />
        <TileLayer
          attribution={tileMode === "street" ? OSM_TILE_ATTRIBUTION : SATELLITE_TILE_ATTRIBUTION}
          url={tileMode === "street" ? OSM_TILE_URL : SATELLITE_TILE_URL}
        />
        {hasCoordinates && (
          <Marker
            position={[latitude, longitude]}
            icon={pinIcon}
          />
        )}
      </MapContainer>
    </div>
  );
}
