import { BadRequestException } from '@nestjs/common';

const LOCATION_DEDUP_MIN_INTERVAL_MS = 4_000;
const LOCATION_DEDUP_MIN_DISTANCE_METERS = 3;

type TeamLocationSnapshot = {
  lastLocationLat: number | null;
  lastLocationLng: number | null;
  lastLocationAt: Date | null;
};

type NextLocationInput = {
  lat: number;
  lng: number;
  at: string;
};

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function parseOptionalNumberInRange(input: {
  value: unknown;
  min: number;
  max: number;
  field: string;
}) {
  if (input.value === null || typeof input.value === 'undefined') {
    return undefined;
  }

  if (
    !isFiniteNumber(input.value) ||
    input.value < input.min ||
    input.value > input.max
  ) {
    throw new BadRequestException(`Invalid ${input.field}`);
  }

  return input.value;
}

export function shouldSkipLocationUpdate(
  team: TeamLocationSnapshot,
  next: NextLocationInput,
) {
  if (
    typeof team.lastLocationLat !== 'number' ||
    typeof team.lastLocationLng !== 'number' ||
    !team.lastLocationAt
  ) {
    return false;
  }

  const nextTimestamp = new Date(next.at).getTime();
  if (!Number.isFinite(nextTimestamp)) {
    return false;
  }

  const elapsedMs = Math.abs(nextTimestamp - team.lastLocationAt.getTime());
  const distanceMeters = getDistanceMetersBetweenCoordinates(
    team.lastLocationLat,
    team.lastLocationLng,
    next.lat,
    next.lng,
  );

  return (
    elapsedMs < LOCATION_DEDUP_MIN_INTERVAL_MS &&
    distanceMeters < LOCATION_DEDUP_MIN_DISTANCE_METERS
  );
}

function getDistanceMetersBetweenCoordinates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLatRad = toRadians(fromLat);
  const endLatRad = toRadians(toLat);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(lngDelta / 2) ** 2;
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * centralAngle;
}

export function parseIsoOrNow(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}
