import type { ExpeditionSessionState, ExpeditionTaskStatus, PlayerLocation } from "../model/types";

type UnknownRecord = Record<string, unknown>;
type MobileApiError = { message?: string };

export type MobileRealizationClientDetails = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  logoUrl: string;
  type: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  instructors: string[];
  stations: Array<{
    id: string;
    name: string;
    type: string;
  }>;
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeTaskStatus(value: unknown): ExpeditionTaskStatus {
  return value === "done" || value === "in-progress" ? value : "todo";
}

function normalizePlayerLocation(value: unknown): PlayerLocation | null {
  if (!value) {
    return null;
  }

  const parsed = asRecord(value);
  const lat = asNumber(parsed.lat, Number.NaN);
  const lng = asNumber(parsed.lng, Number.NaN);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
    accuracy: Number.isFinite(asNumber(parsed.accuracy, Number.NaN)) ? asNumber(parsed.accuracy) : undefined,
    at: asString(parsed.at, new Date().toISOString()),
  };
}

function normalizeSessionState(raw: unknown): ExpeditionSessionState {
  const source = asRecord(raw);
  const realization = asRecord(source.realization);
  const team = asRecord(source.team);
  const meta = asRecord(source.meta);

  return {
    realization: {
      id: asString(realization.id, "unknown-realization"),
      status: asString(realization.status, "planned") as ExpeditionSessionState["realization"]["status"],
      locationRequired: asBoolean(realization.locationRequired ?? realization.location_required),
      scheduledAt: asString(realization.scheduledAt ?? realization.scheduled_at, new Date().toISOString()),
    },
    team: {
      id: asString(team.id, "unknown-team"),
      slotNumber: Math.max(1, Math.round(asNumber(team.slotNumber ?? team.slot_number, 1))),
      name: (team.name as string | null) ?? null,
      color: (team.color as string | null) ?? null,
      badgeKey: (team.badgeKey as string | null) ?? (team.badge_key as string | null) ?? null,
      points: Math.max(0, Math.round(asNumber(team.points, 0))),
      lastLocation: normalizePlayerLocation(team.lastLocation ?? team.last_location),
    },
    tasks: asArray(source.tasks).map((taskItem) => {
      const task = asRecord(taskItem);
      return {
        stationId: asString(task.stationId ?? task.station_id),
        status: normalizeTaskStatus(task.status),
        pointsAwarded: Math.max(0, Math.round(asNumber(task.pointsAwarded ?? task.points_awarded, 0))),
      };
    }),
    meta: {
      sessionExpiresAt: asString(meta.sessionExpiresAt ?? meta.session_expires_at, ""),
      eventLogCount: Math.max(0, Math.round(asNumber(meta.eventLogCount ?? meta.event_log_count, 0))),
    },
  };
}

async function requestMobileApi<T>(baseUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & MobileApiError;

  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `HTTP ${response.status}`);
  }

  return data as T;
}

export function getApiErrorMessage(error: unknown, fallback = "Wystąpił błąd komunikacji z API.") {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export async function fetchMobileSessionState(apiBaseUrl: string, sessionToken: string) {
  const trimmedToken = sessionToken.trim();

  if (!trimmedToken) {
    throw new Error("Brakuje tokenu sesji.");
  }

  const encodedToken = encodeURIComponent(trimmedToken);
  const result = await requestMobileApi<unknown>(apiBaseUrl, `/api/mobile/session/state?sessionToken=${encodedToken}`);
  return normalizeSessionState(result);
}

export async function postMobileTeamLocation(
  apiBaseUrl: string,
  payload: { sessionToken: string; latitude: number; longitude: number; accuracy?: number; at?: string },
) {
  const result = await requestMobileApi<{ ok: boolean; lastLocationAt: string }>(apiBaseUrl, "/api/mobile/team/location", {
    method: "POST",
    body: JSON.stringify({
      sessionToken: payload.sessionToken,
      lat: payload.latitude,
      lng: payload.longitude,
      accuracy: payload.accuracy,
      at: payload.at,
    }),
  });

  return {
    ok: Boolean(result.ok),
    lastLocationAt: asString(result.lastLocationAt, new Date().toISOString()),
  };
}

export async function postMobileCompleteTask(
  apiBaseUrl: string,
  payload: { sessionToken: string; stationId: string; pointsAwarded: number },
) {
  return requestMobileApi<{ teamId: string; stationId: string; pointsTotal: number; taskStatus: "done" }>(
    apiBaseUrl,
    "/api/mobile/task/complete",
    {
      method: "POST",
      body: JSON.stringify({
        sessionToken: payload.sessionToken,
        stationId: payload.stationId,
        pointsAwarded: payload.pointsAwarded,
      }),
    },
  );
}

export async function fetchMobileRealizationClientDetails(apiBaseUrl: string, realizationId: string) {
  const normalizedRealizationId = realizationId.trim();

  if (!normalizedRealizationId) {
    return null;
  }

  const result = await requestMobileApi<unknown>(apiBaseUrl, "/api/realizations");
  const realizations = asArray(result).map((item) => asRecord(item));
  const matched = realizations.find((item) => asString(item.id) === normalizedRealizationId);

  if (!matched) {
    return null;
  }

  return {
    id: asString(matched.id),
    companyName: asString(matched.companyName ?? matched.company_name),
    contactPerson: asString(matched.contactPerson ?? matched.contact_person),
    contactPhone: asString(matched.contactPhone ?? matched.contact_phone),
    contactEmail: asString(matched.contactEmail ?? matched.contact_email),
    logoUrl: asString(matched.logoUrl ?? matched.logo_url),
    type: asString(matched.type),
    teamCount: Math.max(0, Math.round(asNumber(matched.teamCount ?? matched.team_count, 0))),
    peopleCount: Math.max(0, Math.round(asNumber(matched.peopleCount ?? matched.people_count, 0))),
    positionsCount: Math.max(0, Math.round(asNumber(matched.positionsCount ?? matched.positions_count, 0))),
    instructors: asArray(matched.instructors)
      .map((item) => asString(item))
      .filter((value) => value.trim().length > 0),
    stations: asArray(matched.scenarioStations ?? matched.scenario_stations).map((item) => {
      const station = asRecord(item);
      return {
        id: asString(station.id),
        name: asString(station.name),
        type: asString(station.type),
      };
    }),
  } satisfies MobileRealizationClientDetails;
}
