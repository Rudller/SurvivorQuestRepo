import type { MapCoordinate } from "./types";

export const DEFAULT_MAP_ANCHOR: MapCoordinate = {
  latitude: 52.2297,
  longitude: 21.0122,
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function offsetCoordinate(origin: MapCoordinate, angleRadians: number, distanceMeters: number): MapCoordinate {
  const latOffset = (distanceMeters * Math.cos(angleRadians)) / 111_111;
  const lngDenominator = Math.max(1e-6, Math.cos((origin.latitude * Math.PI) / 180));
  const lngOffset = (distanceMeters * Math.sin(angleRadians)) / (111_111 * lngDenominator);

  return {
    latitude: origin.latitude + latOffset,
    longitude: origin.longitude + lngOffset,
  };
}

export function buildStationPinCoordinates(stationIds: string[], anchor: MapCoordinate) {
  return stationIds.reduce<Record<string, MapCoordinate>>((accumulator, stationId, index) => {
    const seed = hashString(stationId);
    const angle = (((seed % 360) + index * 37) * Math.PI) / 180;
    const ringStep = 120 + (index % 4) * 85;
    const noise = seed % 45;
    const distance = ringStep + noise;

    accumulator[stationId] = offsetCoordinate(anchor, angle, distance);
    return accumulator;
  }, {});
}
