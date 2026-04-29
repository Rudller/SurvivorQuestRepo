"use client";

import { divIcon } from "leaflet";
import { useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";

const DEFAULT_MAP_CENTER: [number, number] = [52.2297, 21.0122];
const DEFAULT_MAP_ZOOM = 6;
const ACTIVE_MAP_ZOOM = 13;
const DEFAULT_MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION?.trim() ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type CurrentRealizationTeamsMapProps = {
  realization: CurrentRealizationOverview["realization"];
  teams: CurrentRealizationOverview["teams"];
  teamStationNumberingEnabled: boolean;
};

const TEAM_COLOR_HEX_BY_KEY: Record<string, string> = {
  red: "#ef4444",
  rose: "#f43f5e",
  pink: "#ec4899",
  magenta: "#d946ef",
  violet: "#8b5cf6",
  purple: "#7e22ce",
  indigo: "#6366f1",
  navy: "#1e3a8a",
  blue: "#3b82f6",
  sky: "#0ea5e9",
  cyan: "#06b6d4",
  turquoise: "#06b6b8",
  teal: "#14b8a6",
  mint: "#2dd4bf",
  aquamarine: "#34d399",
  emerald: "#10b981",
  green: "#22c55e",
  lime: "#84cc16",
  orange: "#f97316",
  amber: "#f59e0b",
  gold: "#d4af37",
  yellow: "#eab308",
  brown: "#92400e",
  gray: "#6b7280",
  slate: "#64748b",
  black: "#111827",
  white: "#f8fafc",
};

function hasFiniteCoordinates(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}

function buildPinIconSvg(svgBody: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`;
}

const PIN_ICON_SVGS = {
  quiz: buildPinIconSvg(
    '<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />',
  ),
  "audio-quiz": buildPinIconSvg(
    '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />',
  ),
  time: buildPinIconSvg('<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 12" />'),
  points: buildPinIconSvg('<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />'),
  wordle: buildPinIconSvg(
    '<rect width="18" height="14" x="3" y="5" rx="2" ry="2" /><path d="M7 15h4M15 15h2M7 11h2M13 11h4" />',
  ),
  hangman: buildPinIconSvg('<circle cx="12" cy="5" r="1" /><path d="m9 20 3-6 3 6" /><path d="m6 8 6 2 6-2" /><path d="M12 10v4" />'),
  mastermind: buildPinIconSvg(
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3" /><path d="M9 11.2h5.7" />',
  ),
  anagram: buildPinIconSvg(
    '<path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" /><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" /><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />',
  ),
  "caesar-cipher": buildPinIconSvg(
    '<circle cx="12" cy="16" r="1" /><rect x="3" y="10" width="18" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 10 0v3" />',
  ),
  memory: buildPinIconSvg(
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />',
  ),
  simon: buildPinIconSvg(
    '<line x1="6" x2="10" y1="11" y2="11" /><line x1="8" x2="8" y1="9" y2="13" /><line x1="15" x2="15.01" y1="12" y2="12" /><line x1="18" x2="18.01" y1="10" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />',
  ),
  rebus: buildPinIconSvg(
    '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />',
  ),
  boggle: buildPinIconSvg(
    '<path d="M15 12h6" /><path d="M15 6h6" /><path d="m3 13 3.553-7.724a.5.5 0 0 1 .894 0L11 13" /><path d="M3 18h18" /><path d="M4 11h6" />',
  ),
  "mini-sudoku": buildPinIconSvg(
    '<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />',
  ),
  matching: buildPinIconSvg('<path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />'),
} as const;

function resolveStationVisual(stationType: string | undefined) {
  if (stationType === "time") return { icon: PIN_ICON_SVGS.time, color: "#3b82f6" };
  if (stationType === "points") return { icon: PIN_ICON_SVGS.points, color: "#a855f7" };
  if (stationType === "wordle") return { icon: PIN_ICON_SVGS.wordle, color: "#22c55e" };
  if (stationType === "hangman") return { icon: PIN_ICON_SVGS.hangman, color: "#f97316" };
  if (stationType === "mastermind") return { icon: PIN_ICON_SVGS.mastermind, color: "#6366f1" };
  if (stationType === "anagram") return { icon: PIN_ICON_SVGS.anagram, color: "#14b8a6" };
  if (stationType === "caesar-cipher") return { icon: PIN_ICON_SVGS["caesar-cipher"], color: "#0ea5e9" };
  if (stationType === "memory") return { icon: PIN_ICON_SVGS.memory, color: "#8b5cf6" };
  if (stationType === "simon") return { icon: PIN_ICON_SVGS.simon, color: "#ec4899" };
  if (stationType === "rebus") return { icon: PIN_ICON_SVGS.rebus, color: "#f59e0b" };
  if (stationType === "boggle") return { icon: PIN_ICON_SVGS.boggle, color: "#10b981" };
  if (stationType === "mini-sudoku") return { icon: PIN_ICON_SVGS["mini-sudoku"], color: "#ef4444" };
  if (stationType === "matching") return { icon: PIN_ICON_SVGS.matching, color: "#22c55e" };
  if (stationType === "audio-quiz") return { icon: PIN_ICON_SVGS["audio-quiz"], color: "#06b6d4" };
  return { icon: PIN_ICON_SVGS.quiz, color: "#f59e0b" };
}

function escapeInlineText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolvePlayerColorHex(color: string | null) {
  if (!color) return "#0ea5e9";
  const normalized = color.trim().toLowerCase();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
    return normalized;
  }
  return TEAM_COLOR_HEX_BY_KEY[normalized] || "#0ea5e9";
}

export function CurrentRealizationTeamsMap({
  realization,
  teams,
  teamStationNumberingEnabled,
}: CurrentRealizationTeamsMapProps) {
  const [showStations, setShowStations] = useState(false);
  const stationOrderById = useMemo(() => {
    const map = new Map<string, number>();
    realization.stationIds.forEach((stationId, index) => {
      if (!map.has(stationId)) {
        map.set(stationId, index + 1);
      }
    });
    return map;
  }, [realization.stationIds]);

  const stationMarkers = useMemo(
    () =>
      realization.stations
        .map((station) => {
          if (!hasFiniteCoordinates(station.latitude, station.longitude)) {
            return null;
          }

          const visual = resolveStationVisual(station.stationType);
          const stationNumber = stationOrderById.get(station.stationId);
          const stationNumberBadge =
            teamStationNumberingEnabled &&
            typeof stationNumber === "number" &&
            Number.isFinite(stationNumber) &&
            stationNumber > 0
              ? `<span class="station-marker-number">${Math.round(stationNumber)}</span>`
              : "";

          return {
            stationId: station.stationId,
            position: [station.latitude, station.longitude] as [number, number],
            icon: divIcon({
              className: "",
              html:
                '<div class="station-marker-wrapper" style="--pin-color:' +
                visual.color +
                ';"><div class="station-marker-spike"></div><div class="station-marker station-marker--default" style="background:' +
                visual.color +
                ';"><span class="station-marker-icon">' +
                visual.icon +
                "</span>" +
                stationNumberBadge +
                "</div></div>",
              iconSize: [34, 46],
              iconAnchor: [17, 44],
            }),
            title: station.stationName || `Stanowisko ${station.stationId}`,
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [realization.stations, stationOrderById, teamStationNumberingEnabled],
  );

  const teamMarkers = useMemo(
    () =>
      teams
        .map((team) => {
          if (!team.lastLocation || !hasFiniteCoordinates(team.lastLocation.lat, team.lastLocation.lng)) {
            return null;
          }

          const playerAccent = resolvePlayerColorHex(team.color);
          const badgeTextRaw = team.badgeKey?.trim() || `#${team.slotNumber}`;
          const badgeText = escapeInlineText(Array.from(badgeTextRaw).slice(0, 2).join(""));
          const badgeHtml = badgeText ? `<span class="player-marker-badge">${badgeText}</span>` : "";

          return {
            teamId: team.id,
            position: [team.lastLocation.lat, team.lastLocation.lng] as [number, number],
            title: team.name?.trim() || `Drużyna #${team.slotNumber}`,
            icon: divIcon({
              className: "",
              html:
                '<div class="player-marker" style="--player-accent:' +
                playerAccent +
                ';"><div class="player-marker-shadow"></div><div class="player-marker-dot">' +
                badgeHtml +
                "</div></div>",
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            }),
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    [teams],
  );

  const allMapPoints = useMemo(
    () => [
      ...(showStations ? stationMarkers : []).map((item) => item.position),
      ...teamMarkers.map((item) => item.position),
    ],
    [showStations, stationMarkers, teamMarkers],
  );
  const mapCenter = useMemo(() => {
    if (allMapPoints.length === 0) return DEFAULT_MAP_CENTER;
    const sums = allMapPoints.reduce(
      (accumulator, point) => ({
        lat: accumulator.lat + point[0],
        lng: accumulator.lng + point[1],
      }),
      { lat: 0, lng: 0 },
    );
    return [sums.lat / allMapPoints.length, sums.lng / allMapPoints.length] as [number, number];
  }, [allMapPoints]);
  const mapZoom = allMapPoints.length > 0 ? ACTIVE_MAP_ZOOM : DEFAULT_MAP_ZOOM;
  const mapRenderKey = `${mapCenter[0].toFixed(6)}:${mapCenter[1].toFixed(6)}:${mapZoom}:${stationMarkers.length}:${teamMarkers.length}`;

  return (
    <div className="relative z-0 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Mapa zadań i drużyn</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Wszystkie drużyny są widoczne jednocześnie. Pinezki stanowisk mają styl jak w mobilce.
      </p>
      <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={showStations}
          onChange={(event) => setShowStations(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-amber-400 focus:ring-amber-400/60"
        />
        Pokaż stanowiska
      </label>
      <p className="mt-2 text-xs text-zinc-500">
        Stanowiska: {showStations ? stationMarkers.length : "ukryte"} • Drużyny z lokalizacją: {teamMarkers.length}/{teams.length}
      </p>

      <div className="relative z-0 mt-3 overflow-hidden rounded-xl border border-zinc-800">
        <MapContainer
          key={mapRenderKey}
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          scrollWheelZoom
          className="h-96 w-full"
        >
          <TileLayer attribution={DEFAULT_MAP_TILE_ATTRIBUTION} url={DEFAULT_MAP_TILE_URL} />
          {(showStations ? stationMarkers : []).map((marker) => (
            <Marker key={marker.stationId} position={marker.position} icon={marker.icon} title={marker.title} />
          ))}
          {teamMarkers.map((marker) => (
            <Marker key={marker.teamId} position={marker.position} icon={marker.icon} title={marker.title} />
          ))}
        </MapContainer>
      </div>

      {showStations && stationMarkers.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">Brak współrzędnych stanowisk do wyświetlenia na mapie.</p>
      ) : null}
      {teamMarkers.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">Brak lokalizacji drużyn do wyświetlenia na mapie.</p>
      ) : null}

      <style jsx global>{`
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
          border: 1px solid rgba(15, 23, 42, 0.85);
          background: #f8fafc;
          color: #0f172a;
          font-size: 9px;
          font-weight: 700;
          line-height: 14px;
          text-align: center;
          box-sizing: border-box;
          pointer-events: none;
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
      `}</style>
    </div>
  );
}
