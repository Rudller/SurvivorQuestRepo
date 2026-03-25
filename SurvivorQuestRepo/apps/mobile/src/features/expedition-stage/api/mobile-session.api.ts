import type {
  ExpeditionRealizationStation,
  ExpeditionSessionState,
  ExpeditionTaskStatus,
  PlayerLocation,
} from "../model/types";

type UnknownRecord = Record<string, unknown>;
type MobileApiError = { message?: string };

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

function normalizeStationQuiz(value: unknown): ExpeditionRealizationStation["quiz"] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = asRecord(value);
  const question = asString(parsed.question).trim();
  const answers = asArray(parsed.answers).map((item) => asString(item).trim());
  const correctAnswerIndex = Math.round(asNumber(parsed.correctAnswerIndex, Number.NaN));

  if (
    !question ||
    answers.length !== 4 ||
    answers.some((answer) => answer.length === 0) ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= 4
  ) {
    return undefined;
  }

  return {
    question,
    answers: [answers[0], answers[1], answers[2], answers[3]],
    correctAnswerIndex,
  };
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
    speed: Number.isFinite(asNumber(parsed.speed, Number.NaN)) ? asNumber(parsed.speed) : undefined,
    heading: Number.isFinite(asNumber(parsed.heading, Number.NaN)) ? asNumber(parsed.heading) : undefined,
    at: asString(parsed.at, new Date().toISOString()),
  };
}

function normalizeSessionState(raw: unknown): ExpeditionSessionState {
  const source = asRecord(raw);
  const realization = asRecord(source.realization);
  const scenario = asRecord(realization.scenario);
  const team = asRecord(source.team);
  const meta = asRecord(source.meta);
  const stationIdsFromPayload = [
    ...asArray(realization.stationIds ?? realization.station_ids),
    ...asArray(scenario.stationIds ?? scenario.station_ids),
  ]
    .map((stationId) => asString(stationId).trim())
    .filter((stationId) => stationId.length > 0);
  const stationRowsFromPayload = [
    ...asArray(realization.stations),
    ...asArray(realization.scenarioStations ?? realization.scenario_stations),
    ...asArray(scenario.stations),
    ...asArray(scenario.scenarioStations ?? scenario.scenario_stations),
  ];
  const stationsFromApi = stationRowsFromPayload
    .map((stationItem) => {
    const station = asRecord(stationItem);
    const id = asString(station.id ?? station.stationId ?? station.station_id).trim();
    const name = asString(station.name, id || "Stanowisko");

    return {
      id,
      name,
      type: asString(station.type, "quiz"),
      description: asString(station.description, "Opis stanowiska jest dostępny po skanie QR."),
      imageUrl:
        asString(station.imageUrl ?? station.image_url) ||
        `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(name)}`,
      points: Math.max(0, Math.round(asNumber(station.points, 0))),
      timeLimitSeconds: Math.max(0, Math.round(asNumber(station.timeLimitSeconds ?? station.time_limit_seconds, 0))),
      completionCodeInputMode:
        asString(station.completionCodeInputMode ?? station.completion_code_input_mode, "alphanumeric") === "numeric"
          ? "numeric"
          : "alphanumeric",
      quiz: normalizeStationQuiz(station.quiz ?? station.quiz_data),
      latitude: (() => {
        const value = asNumber(station.latitude ?? station.lat, Number.NaN);
        return Number.isFinite(value) ? value : undefined;
      })(),
      longitude: (() => {
        const value = asNumber(station.longitude ?? station.lng, Number.NaN);
        return Number.isFinite(value) ? value : undefined;
      })(),
    } satisfies ExpeditionRealizationStation;
  })
    .filter((station) => station.id.length > 0);
  const stationById = new Map<string, ExpeditionRealizationStation>();
  stationsFromApi.forEach((station) => {
    if (!stationById.has(station.id)) {
      stationById.set(station.id, station);
    }
  });
  const taskRowsFromPayload = [...asArray(source.tasks), ...asArray(realization.tasks)];
  const tasksFromApi = taskRowsFromPayload
    .map((taskItem) => {
    const task = asRecord(taskItem);
    return {
      stationId: asString(task.stationId ?? task.station_id).trim(),
      status: normalizeTaskStatus(task.status),
      pointsAwarded: Math.max(0, Math.round(asNumber(task.pointsAwarded ?? task.points_awarded, 0))),
      startedAt: asString(task.startedAt ?? task.started_at) || null,
      finishedAt: asString(task.finishedAt ?? task.finished_at) || null,
    };
  })
    .filter((task) => task.stationId.length > 0);
  const orderedStationIds: string[] = [];
  const seenStationIds = new Set<string>();
  const pushStationId = (stationId: string) => {
    const normalizedStationId = stationId.trim();
    if (!normalizedStationId || seenStationIds.has(normalizedStationId)) {
      return;
    }

    seenStationIds.add(normalizedStationId);
    orderedStationIds.push(normalizedStationId);
  };
  stationsFromApi.forEach((station) => pushStationId(station.id));
  stationIdsFromPayload.forEach((stationId) => pushStationId(stationId));
  tasksFromApi.forEach((task) => pushStationId(task.stationId));
  const mergedStations = orderedStationIds.map((stationId) => {
    const existingStation = stationById.get(stationId);
    if (existingStation) {
      return existingStation;
    }

    return {
      id: stationId,
      name: `Stanowisko ${stationId}`,
      type: "quiz",
      description: "Opis stanowiska jest dostępny po skanie QR.",
      imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationId)}`,
      points: 100,
      timeLimitSeconds: 0,
      completionCodeInputMode: "alphanumeric",
      quiz: undefined,
      latitude: undefined,
      longitude: undefined,
    } satisfies ExpeditionRealizationStation;
  });
  const taskByStationId = new Map(tasksFromApi.map((task) => [task.stationId, task]));
  const mergedTasks = orderedStationIds.map((stationId) => {
    const existingTask = taskByStationId.get(stationId);
    if (existingTask) {
      return existingTask;
    }

    return {
      stationId,
      status: "todo" as const,
      pointsAwarded: 0,
      startedAt: null,
      finishedAt: null,
    };
  });

  return {
    realization: {
      id: asString(realization.id, "unknown-realization"),
      companyName: asString(realization.companyName ?? realization.company_name, "Realizacja terenowa"),
      introText: asString(realization.introText ?? realization.intro_text) || undefined,
      contactPerson: asString(realization.contactPerson ?? realization.contact_person),
      contactPhone: asString(realization.contactPhone ?? realization.contact_phone) || undefined,
      contactEmail: asString(realization.contactEmail ?? realization.contact_email) || undefined,
      logoUrl: asString(realization.logoUrl ?? realization.logo_url) || undefined,
      type: asString(realization.type) || undefined,
      teamCount: Math.max(0, Math.round(asNumber(realization.teamCount ?? realization.team_count, 0))) || undefined,
      peopleCount: Math.max(0, Math.round(asNumber(realization.peopleCount ?? realization.people_count, 0))) || undefined,
      positionsCount:
        Math.max(0, Math.round(asNumber(realization.positionsCount ?? realization.positions_count, 0))) || undefined,
      instructors: asArray(realization.instructors)
        .map((item) => asString(item))
        .filter((value) => value.trim().length > 0),
      status: asString(realization.status, "planned") as ExpeditionSessionState["realization"]["status"],
      locationRequired: asBoolean(realization.locationRequired ?? realization.location_required),
      scheduledAt: asString(realization.scheduledAt ?? realization.scheduled_at, new Date().toISOString()),
       durationMinutes:
         Math.max(0, Math.round(asNumber(realization.durationMinutes ?? realization.duration_minutes, 0))) || 120,
       stations: mergedStations,
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
    tasks: mergedTasks,
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

export function isSessionTokenInvalidError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("http 401") ||
    message.includes("invalid session token") ||
    message.includes("session expired") ||
    message.includes("missing session token")
  );
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
  payload: {
    sessionToken: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    at?: string;
  },
) {
  const result = await requestMobileApi<{
    ok: boolean;
    deduplicated?: boolean;
    lastLocationAt: string;
    serverReceivedAt?: string;
  }>(apiBaseUrl, "/api/mobile/team/location", {
    method: "POST",
    body: JSON.stringify({
      sessionToken: payload.sessionToken,
      lat: payload.latitude,
      lng: payload.longitude,
      accuracy: payload.accuracy,
      speed: payload.speed,
      heading: payload.heading,
      at: payload.at,
    }),
  });

  return {
    ok: Boolean(result.ok),
    deduplicated: Boolean(result.deduplicated),
    lastLocationAt: asString(result.lastLocationAt, new Date().toISOString()),
    serverReceivedAt: asString(result.serverReceivedAt, new Date().toISOString()),
  };
}

export async function postMobileCompleteTask(
  apiBaseUrl: string,
  payload: {
    sessionToken: string;
    stationId: string;
    completionCode: string;
    startedAt?: string;
    finishedAt?: string;
  },
) {
  return requestMobileApi<{ teamId: string; stationId: string; pointsTotal: number; pointsAwarded: number; taskStatus: "done" }>(
    apiBaseUrl,
    "/api/mobile/task/complete",
    {
      method: "POST",
      body: JSON.stringify({
        sessionToken: payload.sessionToken,
        stationId: payload.stationId,
        completionCode: payload.completionCode,
        startedAt: payload.startedAt,
        finishedAt: payload.finishedAt,
      }),
    },
  );
}

export async function postMobileStartTask(
  apiBaseUrl: string,
  payload: { sessionToken: string; stationId: string; startedAt?: string },
) {
  return requestMobileApi<{ teamId: string; stationId: string; taskStatus: "in-progress"; startedAt: string }>(
    apiBaseUrl,
    "/api/mobile/task/start",
    {
      method: "POST",
      body: JSON.stringify({
        sessionToken: payload.sessionToken,
        stationId: payload.stationId,
        startedAt: payload.startedAt,
      }),
    },
  );
}

export async function postMobileResolveStationQr(
  apiBaseUrl: string,
  payload: {
    sessionToken: string;
    token: string;
  },
) {
  return requestMobileApi<{
    realizationId: string;
    station: {
      id: string;
      name: string;
      type: "quiz" | "time" | "points";
      description: string;
      imageUrl: string;
      points: number;
      timeLimitSeconds: number;
      completionCodeInputMode?: "numeric" | "alphanumeric";
      quiz?: {
        question: string;
        answers: [string, string, string, string];
        correctAnswerIndex: number;
      };
      latitude?: number;
      longitude?: number;
    };
    task: {
      stationId: string;
      status: "todo" | "in-progress" | "done";
      pointsAwarded: number;
      startedAt: string | null;
      finishedAt: string | null;
    };
    qr: {
      issuedAt: string;
      expiresAt: string;
    };
  }>(apiBaseUrl, "/api/mobile/station/resolve-qr", {
    method: "POST",
    body: JSON.stringify({
      sessionToken: payload.sessionToken,
      token: payload.token,
    }),
  });
}
