import { NextResponse } from "next/server";
import {
  createScenarioStationInstance,
  findStationById,
  findStationsByIds,
  parseTimeLimitSeconds,
  removeStationsByIds,
  updateScenarioStationInstance,
  type StationEntity,
  type StationType,
} from "../games/_store";
import { cloneScenario, findScenarioById, replaceScenario, type ScenarioEntity } from "../scenario/_store";

type RealizationStatus = "planned" | "in-progress" | "done";

type RealizationLog = {
  id: string;
  changedBy: string;
  changedAt: string;
  action: "created" | "updated";
  description: string;
};

type RealizationType = "outdoor-games" | "hotel-games" | "workshops" | "evening-attractions" | "dj" | "recreation";

type ScenarioStationDraftPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
  sourceTemplateId?: string;
};

type ValidScenarioStationDraft = {
  id?: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
};

type Realization = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  stationIds: string[];
  scenarioStations: StationEntity[];
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type RealizationMobileSnapshot = {
  id: string;
  companyName: string;
  status: RealizationStatus;
  scheduledAt: string;
  teamCount: number;
  stationIds: string[];
};

type ScenarioStationDraftsResult =
  | { provided: false; drafts: [] }
  | { provided: true; drafts: ScenarioStationDraftPayload[] }
  | { provided: true; drafts: null };

type SyncScenarioStationsResult =
  | { ok: true; scenario: ScenarioEntity; stations: StationEntity[] }
  | { ok: false; message: string };

function resolveRealizationStatus(status: RealizationStatus, scheduledAt: string) {
  const scheduledTimestamp = new Date(scheduledAt).getTime();

  if (Number.isFinite(scheduledTimestamp) && scheduledTimestamp < Date.now()) {
    return "done" as const;
  }

  return status;
}

function calculateRequiredDevices(teamCount: number) {
  return teamCount + 2;
}

function createLog(changedBy: string, action: "created" | "updated", description: string): RealizationLog {
  return {
    id: crypto.randomUUID(),
    changedBy,
    changedAt: new Date().toISOString(),
    action,
    description,
  };
}

function getChangedBy(rawValue?: string) {
  return rawValue?.trim() || "admin@local";
}

function sanitizeInstructors(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function isValidStationType(value: unknown): value is StationType {
  return value === "quiz" || value === "time" || value === "points";
}

function readScenarioStationDrafts(value: unknown): ScenarioStationDraftsResult {
  if (typeof value === "undefined") {
    return { provided: false, drafts: [] };
  }

  if (!Array.isArray(value)) {
    return { provided: true, drafts: null };
  }

  return {
    provided: true,
    drafts: value.map((item) => {
      const draft = (item ?? {}) as ScenarioStationDraftPayload;

      return {
        id: typeof draft.id === "string" ? draft.id.trim() || undefined : undefined,
        name: typeof draft.name === "string" ? draft.name : undefined,
        type: draft.type,
        description: typeof draft.description === "string" ? draft.description : undefined,
        imageUrl: typeof draft.imageUrl === "string" ? draft.imageUrl : undefined,
        points: typeof draft.points === "number" ? draft.points : undefined,
        timeLimitSeconds: typeof draft.timeLimitSeconds === "number" ? draft.timeLimitSeconds : undefined,
        sourceTemplateId:
          typeof draft.sourceTemplateId === "string" ? draft.sourceTemplateId.trim() || undefined : undefined,
      };
    }),
  };
}

function validateScenarioStationDrafts(drafts: ScenarioStationDraftPayload[]): ValidScenarioStationDraft[] | null {
  const validated = drafts.map((draft) => {
    const parsedTimeLimit = parseTimeLimitSeconds(draft.timeLimitSeconds);

    if (
      !draft.name?.trim() ||
      !isValidStationType(draft.type) ||
      !draft.description?.trim() ||
      typeof draft.points !== "number" ||
      !Number.isFinite(draft.points) ||
      draft.points <= 0 ||
      !parsedTimeLimit.ok
    ) {
      return null;
    }

    return {
      id: draft.id,
      name: draft.name.trim(),
      type: draft.type,
      description: draft.description.trim(),
      imageUrl: draft.imageUrl?.trim() || undefined,
      points: Math.round(draft.points),
      timeLimitSeconds: parsedTimeLimit.value,
      sourceTemplateId: draft.sourceTemplateId,
    };
  });

  if (validated.some((draft) => draft === null)) {
    return null;
  }

  return validated as ValidScenarioStationDraft[];
}

function getScenarioStationsOrdered(scenario: ScenarioEntity) {
  return findStationsByIds(scenario.stationIds);
}

function scenarioBelongsToRealization(scenario: ScenarioEntity, realizationId: string) {
  if (!scenario.sourceTemplateId) {
    return false;
  }

  const stations = getScenarioStationsOrdered(scenario);

  if (stations.length === 0) {
    return false;
  }

  return stations.every(
    (station) => station.scenarioInstanceId === scenario.id && station.realizationId === realizationId,
  );
}

function ensureRealizationScenarioInstance(
  sourceScenario: ScenarioEntity,
  realizationId: string,
): ScenarioEntity | null {
  if (scenarioBelongsToRealization(sourceScenario, realizationId)) {
    return sourceScenario;
  }

  return cloneScenario(sourceScenario.id, { realizationId });
}

function syncScenarioStations(
  scenario: ScenarioEntity,
  realizationId: string,
  drafts?: ValidScenarioStationDraft[],
): SyncScenarioStationsResult {
  const currentStations = getScenarioStationsOrdered(scenario);

  if (!drafts) {
    if (currentStations.length === 0) {
      return { ok: false, message: "Scenario not found" };
    }

    const currentStationIds = currentStations.map((station) => station.id);

    if (currentStationIds.join("|") !== scenario.stationIds.join("|")) {
      replaceScenario({
        ...scenario,
        stationIds: currentStationIds,
        updatedAt: new Date().toISOString(),
      });
    }

    return { ok: true, scenario: { ...scenario, stationIds: currentStationIds }, stations: currentStations };
  }

  if (drafts.length === 0) {
    return { ok: false, message: "Realization must include at least one station" };
  }

  const keptStationIds = new Set<string>();
  const finalStations: StationEntity[] = [];

  for (const draft of drafts) {
    if (draft.id) {
      const existingStation = findStationById(draft.id);

      if (!existingStation) {
        return { ok: false, message: "Station not found" };
      }

      if (existingStation.scenarioInstanceId !== scenario.id || existingStation.realizationId !== realizationId) {
        return { ok: false, message: "Station does not belong to this realization" };
      }

      const updatedStation = updateScenarioStationInstance(existingStation.id, {
        name: draft.name,
        type: draft.type,
        description: draft.description,
        imageUrl: draft.imageUrl,
        points: draft.points,
        timeLimitSeconds: draft.timeLimitSeconds,
        sourceTemplateId: draft.sourceTemplateId,
      });

      if (!updatedStation) {
        return { ok: false, message: "Station not found" };
      }

      keptStationIds.add(updatedStation.id);
      finalStations.push(updatedStation);
      continue;
    }

    const createdStation = createScenarioStationInstance(
      {
        name: draft.name,
        type: draft.type,
        description: draft.description,
        imageUrl: draft.imageUrl,
        points: draft.points,
        timeLimitSeconds: draft.timeLimitSeconds,
        sourceTemplateId: draft.sourceTemplateId,
      },
      { scenarioInstanceId: scenario.id, realizationId },
    );

    keptStationIds.add(createdStation.id);
    finalStations.push(createdStation);
  }

  const stationsToRemove = currentStations
    .filter((station) => station.scenarioInstanceId === scenario.id && station.realizationId === realizationId)
    .filter((station) => !keptStationIds.has(station.id))
    .map((station) => station.id);

  if (stationsToRemove.length > 0) {
    removeStationsByIds(stationsToRemove);
  }

  const updatedScenario = replaceScenario({
    ...scenario,
    stationIds: finalStations.map((station) => station.id),
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, scenario: updatedScenario, stations: finalStations };
}

function alignDraftIdsToScenario(
  scenario: ScenarioEntity,
  drafts: ValidScenarioStationDraft[],
): ValidScenarioStationDraft[] {
  const scenarioStations = getScenarioStationsOrdered(scenario);
  const scenarioStationIds = new Set(scenarioStations.map((station) => station.id));
  const scenarioStationsBySourceTemplate = new Map(
    scenarioStations
      .filter((station) => station.sourceTemplateId)
      .map((station) => [station.sourceTemplateId as string, station.id]),
  );

  return drafts.map((draft) => {
    if (!draft.id) {
      return draft;
    }

    if (scenarioStationIds.has(draft.id)) {
      return draft;
    }

    const mappedId = scenarioStationsBySourceTemplate.get(draft.id);

    if (mappedId) {
      return {
        ...draft,
        id: mappedId,
      };
    }

    return {
      ...draft,
      id: undefined,
      sourceTemplateId: draft.sourceTemplateId ?? draft.id,
    };
  });
}

function resolveRealizationStations(realization: Realization) {
  const linkedScenario = findScenarioById(realization.scenarioId);
  const stationIds = linkedScenario?.stationIds ?? realization.stationIds;
  const stations = findStationsByIds(stationIds);

  return {
    scenarioId: linkedScenario?.id ?? realization.scenarioId,
    stationIds: stations.map((station) => station.id),
    scenarioStations: stations,
  };
}

function normalizeRealizationsForRead() {
  const normalizedRealizations = realizations.map((realization) => {
    const resolvedStations = resolveRealizationStations(realization);

    return {
      ...realization,
      ...resolvedStations,
      requiredDevicesCount: calculateRequiredDevices(realization.teamCount),
      status: resolveRealizationStatus(realization.status, realization.scheduledAt),
    };
  });

  realizations = normalizedRealizations;
  return normalizedRealizations;
}

export function getRealizationsMobileSnapshot(): RealizationMobileSnapshot[] {
  return normalizeRealizationsForRead().map((realization) => ({
    id: realization.id,
    companyName: realization.companyName,
    status: realization.status,
    scheduledAt: realization.scheduledAt,
    teamCount: realization.teamCount,
    stationIds: realization.stationIds,
  }));
}

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

let realizations: Realization[] = [
  {
    id: "r-1",
    companyName: "Northwind Sp. z o.o.",
    contactPerson: "Anna Kowalczyk",
    contactPhone: "+48 501 200 300",
    contactEmail: "anna.kowalczyk@northwind.pl",
    instructors: ["Michał Krawiec", "Patryk Lis"],
    type: "outdoor-games",
    logoUrl: "https://placehold.co/160x160/18181b/f4f4f5?text=NW",
    offerPdfUrl: "https://example.com/mock-offers/northwind-offer.pdf",
    offerPdfName: "Northwind - oferta.pdf",
    scenarioId: "s-1",
    stationIds: ["g-1", "g-2", "g-4"],
    scenarioStations: [],
    teamCount: 4,
    requiredDevicesCount: 6,
    peopleCount: 18,
    positionsCount: 4,
    status: "done",
    scheduledAt: new Date(now - 3 * dayMs).toISOString(),
    createdAt: new Date(now - 6 * dayMs).toISOString(),
    updatedAt: new Date(now - 2 * dayMs).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now - 6 * dayMs).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
      {
        id: crypto.randomUUID(),
        changedBy: "koordynator@survivorquest.app",
        changedAt: new Date(now - 2 * dayMs).toISOString(),
        action: "updated",
        description: "Zmieniono status realizacji na zrealizowana.",
      },
    ],
  },
  {
    id: "r-2",
    companyName: "Baltic Logistics",
    contactPerson: "Łukasz Duda",
    contactPhone: "+48 512 111 222",
    contactEmail: "lukasz.duda@balticlogistics.pl",
    instructors: ["Kamil Brzeziński", "Paweł Bąk"],
    type: "hotel-games",
    scenarioId: "s-3",
    stationIds: ["g-2", "g-3"],
    scenarioStations: [],
    teamCount: 6,
    requiredDevicesCount: 8,
    peopleCount: 24,
    positionsCount: 6,
    status: "in-progress",
    scheduledAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(now - 2 * dayMs).toISOString(),
    updatedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now - 2 * dayMs).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
    ],
  },
  {
    id: "r-3",
    companyName: "Horizon Tech",
    contactPerson: "Karolina Nowak",
    contactPhone: "+48 698 555 440",
    contactEmail: "karolina.nowak@horizontech.pl",
    instructors: ["Mateusz Sikora"],
    type: "workshops",
    scenarioId: "s-1",
    stationIds: ["g-1", "g-2", "g-4"],
    scenarioStations: [],
    teamCount: 3,
    requiredDevicesCount: 5,
    peopleCount: 14,
    positionsCount: 3,
    status: "planned",
    scheduledAt: new Date(now + dayMs).toISOString(),
    createdAt: new Date(now - dayMs).toISOString(),
    updatedAt: new Date(now - dayMs).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now - dayMs).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
    ],
  },
  {
    id: "r-4",
    companyName: "Vector Group",
    contactPerson: "Piotr Wrona",
    contactPhone: "+48 530 204 104",
    contactEmail: "piotr.wrona@vectorgroup.pl",
    instructors: ["Damian Król", "Jakub Czaja"],
    type: "evening-attractions",
    scenarioId: "s-2",
    stationIds: ["g-4", "g-5"],
    scenarioStations: [],
    teamCount: 2,
    requiredDevicesCount: 4,
    peopleCount: 10,
    positionsCount: 2,
    status: "planned",
    scheduledAt: new Date(now + 5 * dayMs).toISOString(),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
    ],
  },
  {
    id: "r-5",
    companyName: "GreenFarm Team",
    contactPerson: "Magdalena Kurek",
    contactPhone: "+48 606 330 220",
    contactEmail: "magdalena.kurek@greenfarm.pl",
    instructors: ["Marek Soból", "Bartosz Pawlak", "Maja Mrozek"],
    type: "recreation",
    scenarioId: "s-1",
    stationIds: ["g-1", "g-2", "g-4"],
    scenarioStations: [],
    teamCount: 7,
    requiredDevicesCount: 9,
    peopleCount: 30,
    positionsCount: 8,
    status: "done",
    scheduledAt: new Date(now - 10 * dayMs).toISOString(),
    createdAt: new Date(now - 12 * dayMs).toISOString(),
    updatedAt: new Date(now - 8 * dayMs).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now - 12 * dayMs).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
    ],
  },
  {
    id: "r-6",
    companyName: "Pulse Events",
    contactPerson: "Julia Sikora",
    contactPhone: "+48 577 440 990",
    contactEmail: "julia.sikora@pulseevents.pl",
    instructors: ["Mateusz Wójcik", "Kacper Nita"],
    type: "dj",
    logoUrl: "https://placehold.co/160x160/0f172a/e2e8f0?text=DJ",
    offerPdfUrl: "https://example.com/mock-offers/pulse-events-dj.pdf",
    offerPdfName: "Pulse Events - oferta DJ.pdf",
    scenarioId: "s-2",
    stationIds: ["g-4", "g-5"],
    scenarioStations: [],
    teamCount: 5,
    requiredDevicesCount: 7,
    peopleCount: 22,
    positionsCount: 5,
    status: "planned",
    scheduledAt: new Date(now + 2 * dayMs).toISOString(),
    createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    logs: [
      {
        id: crypto.randomUUID(),
        changedBy: "admin@survivorquest.app",
        changedAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
        action: "created",
        description: "Utworzono realizację.",
      },
    ],
  },
];

export async function GET() {
  const normalizedRealizations = normalizeRealizationsForRead();
  return NextResponse.json(normalizedRealizations);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyName?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    instructors?: unknown;
    type?: RealizationType;
    logoUrl?: string;
    offerPdfUrl?: string;
    offerPdfName?: string;
    scenarioId?: string;
    teamCount?: number;
    peopleCount?: number;
    positionsCount?: number;
    status?: RealizationStatus;
    scheduledAt?: string;
    changedBy?: string;
    scenarioStations?: unknown;
  };

  const scheduledTimestamp = body.scheduledAt ? new Date(body.scheduledAt).getTime() : NaN;
  const stationDraftsResult = readScenarioStationDrafts(body.scenarioStations);
  const sanitizedContactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const sanitizedContactPhone = typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
  const sanitizedContactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
  const sanitizedInstructors = sanitizeInstructors(body.instructors);
  const validatedStationDrafts =
    stationDraftsResult.provided && stationDraftsResult.drafts
      ? validateScenarioStationDrafts(stationDraftsResult.drafts)
      : [];

  if (
    !body?.companyName ||
    !sanitizedContactPerson ||
    (!sanitizedContactPhone && !sanitizedContactEmail) ||
    !body.type ||
    !body.scenarioId ||
    typeof body.teamCount !== "number" ||
    body.teamCount < 1 ||
    typeof body.peopleCount !== "number" ||
    body.peopleCount < 1 ||
    typeof body.positionsCount !== "number" ||
    body.positionsCount < 1 ||
    !body.status ||
    !body.scheduledAt ||
    !Number.isFinite(scheduledTimestamp) ||
    (stationDraftsResult.provided && stationDraftsResult.drafts === null) ||
    (stationDraftsResult.provided && validatedStationDrafts === null)
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const sourceScenario = findScenarioById(body.scenarioId);

  if (!sourceScenario) {
    return NextResponse.json({ message: "Scenario not found" }, { status: 400 });
  }

  const realizationId = crypto.randomUUID();
  const clonedScenario = cloneScenario(body.scenarioId, { realizationId });

  if (!clonedScenario) {
    return NextResponse.json({ message: "Scenario not found" }, { status: 400 });
  }

  const syncResult = syncScenarioStations(
    clonedScenario,
    realizationId,
    stationDraftsResult.provided
      ? alignDraftIdsToScenario(clonedScenario, validatedStationDrafts as ValidScenarioStationDraft[])
      : undefined,
  );

  if (!syncResult.ok) {
    return NextResponse.json({ message: syncResult.message }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const changedBy = getChangedBy(body.changedBy);

  const newRealization: Realization = {
    id: realizationId,
    companyName: body.companyName.trim(),
    contactPerson: sanitizedContactPerson,
    contactPhone: sanitizedContactPhone || undefined,
    contactEmail: sanitizedContactEmail || undefined,
    instructors: sanitizedInstructors,
    type: body.type,
    logoUrl: body.logoUrl,
    offerPdfUrl: body.offerPdfUrl,
    offerPdfName: body.offerPdfName,
    scenarioId: syncResult.scenario.id,
    stationIds: syncResult.stations.map((station) => station.id),
    scenarioStations: syncResult.stations,
    teamCount: Math.round(body.teamCount),
    requiredDevicesCount: calculateRequiredDevices(Math.round(body.teamCount)),
    peopleCount: Math.round(body.peopleCount),
    positionsCount: Math.round(body.positionsCount),
    status: resolveRealizationStatus(body.status, body.scheduledAt),
    scheduledAt: new Date(scheduledTimestamp).toISOString(),
    createdAt: nowIso,
    updatedAt: nowIso,
    logs: [createLog(changedBy, "created", "Utworzono realizację.")],
  };

  realizations = [newRealization, ...realizations];
  return NextResponse.json(newRealization, { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    companyName?: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    instructors?: unknown;
    type?: RealizationType;
    logoUrl?: string;
    offerPdfUrl?: string;
    offerPdfName?: string;
    scenarioId?: string;
    teamCount?: number;
    peopleCount?: number;
    positionsCount?: number;
    status?: RealizationStatus;
    scheduledAt?: string;
    changedBy?: string;
    scenarioStations?: unknown;
  };

  const scheduledTimestamp = body.scheduledAt ? new Date(body.scheduledAt).getTime() : NaN;
  const stationDraftsResult = readScenarioStationDrafts(body.scenarioStations);
  const sanitizedContactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const sanitizedContactPhone = typeof body.contactPhone === "string" ? body.contactPhone.trim() : "";
  const sanitizedContactEmail = typeof body.contactEmail === "string" ? body.contactEmail.trim() : "";
  const sanitizedInstructors = sanitizeInstructors(body.instructors);
  const validatedStationDrafts =
    stationDraftsResult.provided && stationDraftsResult.drafts
      ? validateScenarioStationDrafts(stationDraftsResult.drafts)
      : [];

  if (
    !body?.id ||
    !body.companyName ||
    !sanitizedContactPerson ||
    (!sanitizedContactPhone && !sanitizedContactEmail) ||
    !body.type ||
    !body.scenarioId ||
    typeof body.teamCount !== "number" ||
    body.teamCount < 1 ||
    typeof body.peopleCount !== "number" ||
    body.peopleCount < 1 ||
    typeof body.positionsCount !== "number" ||
    body.positionsCount < 1 ||
    !body.status ||
    !body.scheduledAt ||
    !Number.isFinite(scheduledTimestamp) ||
    (stationDraftsResult.provided && stationDraftsResult.drafts === null) ||
    (stationDraftsResult.provided && validatedStationDrafts === null)
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const realizationIndex = realizations.findIndex((realization) => realization.id === body.id);

  if (realizationIndex < 0) {
    return NextResponse.json({ message: "Realization not found" }, { status: 404 });
  }

  const current = realizations[realizationIndex];
  const requestedScenario = findScenarioById(body.scenarioId);

  if (!requestedScenario) {
    return NextResponse.json({ message: "Scenario not found" }, { status: 400 });
  }

  const baseScenario =
    requestedScenario.id === current.scenarioId
      ? ensureRealizationScenarioInstance(requestedScenario, current.id)
      : cloneScenario(requestedScenario.id, { realizationId: current.id });

  if (!baseScenario) {
    return NextResponse.json({ message: "Scenario not found" }, { status: 400 });
  }

  const syncResult = syncScenarioStations(
    baseScenario,
    current.id,
    stationDraftsResult.provided
      ? alignDraftIdsToScenario(baseScenario, validatedStationDrafts as ValidScenarioStationDraft[])
      : undefined,
  );

  if (!syncResult.ok) {
    return NextResponse.json({ message: syncResult.message }, { status: 400 });
  }

  const changedBy = getChangedBy(body.changedBy);
  const nextScheduledAt = new Date(scheduledTimestamp).toISOString();

  const changes: string[] = [];

  if (current.companyName !== body.companyName.trim()) {
    changes.push("firma");
  }

  if (current.type !== body.type) {
    changes.push("typ realizacji");
  }

  if (current.contactPerson !== sanitizedContactPerson) {
    changes.push("osoba kontaktowa");
  }

  if ((current.contactPhone ?? "") !== sanitizedContactPhone) {
    changes.push("telefon kontaktowy");
  }

  if ((current.contactEmail ?? "") !== sanitizedContactEmail) {
    changes.push("e-mail kontaktowy");
  }

  if (current.instructors.join("|") !== sanitizedInstructors.join("|")) {
    changes.push("instruktorzy");
  }

  if (current.status !== body.status) {
    changes.push("status");
  }

  if (current.teamCount !== Math.round(body.teamCount)) {
    changes.push("liczba drużyn");
  }

  if (current.peopleCount !== Math.round(body.peopleCount)) {
    changes.push("liczba osób");
  }

  if (current.positionsCount !== Math.round(body.positionsCount)) {
    changes.push("liczba stanowisk");
  }

  if (current.scheduledAt !== nextScheduledAt) {
    changes.push("termin");
  }

  if (current.scenarioId !== syncResult.scenario.id) {
    changes.push("scenariusz");
  }

  if ((current.logoUrl ?? "") !== (body.logoUrl ?? "")) {
    changes.push("logo");
  }

  if ((current.offerPdfUrl ?? "") !== (body.offerPdfUrl ?? "")) {
    changes.push("oferta PDF");
  }

  const currentStationIds = current.stationIds.join("|");
  const nextStationIds = syncResult.stations.map((station) => station.id).join("|");

  if (currentStationIds !== nextStationIds) {
    changes.push("stanowiska");
  }

  const updatedRealization: Realization = {
    ...current,
    companyName: body.companyName.trim(),
    contactPerson: sanitizedContactPerson,
    contactPhone: sanitizedContactPhone || undefined,
    contactEmail: sanitizedContactEmail || undefined,
    instructors: sanitizedInstructors,
    type: body.type,
    logoUrl: body.logoUrl,
    offerPdfUrl: body.offerPdfUrl,
    offerPdfName: body.offerPdfName,
    scenarioId: syncResult.scenario.id,
    stationIds: syncResult.stations.map((station) => station.id),
    scenarioStations: syncResult.stations,
    teamCount: Math.round(body.teamCount),
    requiredDevicesCount: calculateRequiredDevices(Math.round(body.teamCount)),
    peopleCount: Math.round(body.peopleCount),
    positionsCount: Math.round(body.positionsCount),
    status: resolveRealizationStatus(body.status, nextScheduledAt),
    scheduledAt: nextScheduledAt,
    updatedAt: new Date().toISOString(),
    logs: [
      ...current.logs,
      createLog(
        changedBy,
        "updated",
        changes.length > 0 ? `Zmieniono: ${changes.join(", ")}.` : "Zapisano bez zmian merytorycznych.",
      ),
    ],
  };

  realizations = realizations.map((realization) => (realization.id === body.id ? updatedRealization : realization));
  return NextResponse.json(updatedRealization);
}
