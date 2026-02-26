export type StationType = "quiz" | "time" | "points";

export type StationEntity = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StationDraftInput = {
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
};

function getFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}

function resolveImageUrl(imageUrl: string | undefined, seed: string) {
  return imageUrl?.trim() || getFallbackImage(seed);
}

function normalizeStationDraft(input: StationDraftInput, currentId: string) {
  const normalizedName = input.name.trim() || "Untitled station";

  return {
    name: normalizedName,
    type: input.type,
    description: input.description.trim(),
    imageUrl: resolveImageUrl(input.imageUrl, normalizedName || currentId),
    points: Math.round(input.points),
    timeLimitSeconds: Math.round(input.timeLimitSeconds),
    sourceTemplateId: input.sourceTemplateId?.trim() || undefined,
  };
}

export function parseTimeLimitSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 600) {
    return { ok: false as const, value: null };
  }

  return { ok: true as const, value: Math.round(value) };
}

const now = new Date().toISOString();

let stations: StationEntity[] = [
  {
    id: "g-1",
    name: "Quiz: Podstawy survivalu",
    type: "quiz",
    description: "Stanowisko quizowe z pytaniami o bezpieczeństwo i podstawy przetrwania.",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&q=80&auto=format&fit=crop",
    points: 100,
    timeLimitSeconds: 300,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "g-2",
    name: "Na czas: Ewakuacja z lasu",
    type: "time",
    description: "Stanowisko na czas z zadaniami zespołowymi wykonywanymi pod presją minut.",
    imageUrl: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=640&q=80&auto=format&fit=crop",
    points: 180,
    timeLimitSeconds: 420,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "g-3",
    name: "Na punkty: Mapa i kompas",
    type: "points",
    description: "Stanowisko punktowane za poprawne odnalezienie punktów kontrolnych i współpracę.",
    imageUrl: "https://images.unsplash.com/photo-1502920514313-52581002a659?w=640&q=80&auto=format&fit=crop",
    points: 220,
    timeLimitSeconds: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "g-4",
    name: "Quiz: Alarm nocny",
    type: "quiz",
    description: "Szybki quiz decyzyjny z reakcjami kryzysowymi i priorytetyzacją działań.",
    imageUrl: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=640&q=80&auto=format&fit=crop",
    points: 130,
    timeLimitSeconds: 240,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "g-5",
    name: "Na punkty: Strefa taktyczna",
    type: "points",
    description: "Stanowisko punktowane za mini-zadania logiczne i poprawne decyzje zespołowe.",
    imageUrl: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=640&q=80&auto=format&fit=crop",
    points: 160,
    timeLimitSeconds: 0,
    createdAt: now,
    updatedAt: now,
  },
];

export function listTemplateStations() {
  return stations.filter((station) => !station.scenarioInstanceId && !station.realizationId);
}

export function findStationById(id: string) {
  return stations.find((station) => station.id === id);
}

export function findStationsByIds(ids: string[]) {
  return ids
    .map((stationId) => findStationById(stationId))
    .filter((station): station is StationEntity => Boolean(station));
}

export function isTemplateStation(station: StationEntity) {
  return !station.scenarioInstanceId && !station.realizationId;
}

export function addTemplateStation(station: Omit<StationEntity, "sourceTemplateId" | "scenarioInstanceId" | "realizationId">) {
  const templateStation: StationEntity = {
    ...station,
    sourceTemplateId: undefined,
    scenarioInstanceId: undefined,
    realizationId: undefined,
  };

  stations = [templateStation, ...stations];
  return templateStation;
}

export function replaceTemplateStation(updatedStation: StationEntity) {
  stations = stations.map((station) => (station.id === updatedStation.id ? updatedStation : station));
  return updatedStation;
}

export function removeStationById(id: string) {
  stations = stations.filter((station) => station.id !== id);
}

export function removeStationsByIds(ids: string[]) {
  const idSet = new Set(ids);
  stations = stations.filter((station) => !idSet.has(station.id));
}

export function cloneStationsForScenario(
  sourceStationIds: string[],
  context: { scenarioInstanceId: string; realizationId?: string },
) {
  const timestamp = new Date().toISOString();
  const clonedStations = sourceStationIds.flatMap((stationId) => {
    const sourceStation = findStationById(stationId);

    if (!sourceStation) {
      return [];
    }

    const clonedStation: StationEntity = {
      ...sourceStation,
      id: crypto.randomUUID(),
      sourceTemplateId: sourceStation.sourceTemplateId ?? sourceStation.id,
      scenarioInstanceId: context.scenarioInstanceId,
      realizationId: context.realizationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return [clonedStation];
  });

  stations = [...clonedStations, ...stations];
  return clonedStations;
}

export function createScenarioStationInstance(
  input: StationDraftInput,
  context: { scenarioInstanceId: string; realizationId?: string },
) {
  const timestamp = new Date().toISOString();
  const stationId = crypto.randomUUID();
  const normalized = normalizeStationDraft(input, stationId);
  const station: StationEntity = {
    id: stationId,
    ...normalized,
    scenarioInstanceId: context.scenarioInstanceId,
    realizationId: context.realizationId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  stations = [station, ...stations];
  return station;
}

export function updateScenarioStationInstance(id: string, input: StationDraftInput) {
  const currentStation = findStationById(id);

  if (!currentStation) {
    return null;
  }

  const normalized = normalizeStationDraft(input, currentStation.id);
  const updatedStation: StationEntity = {
    ...currentStation,
    ...normalized,
    sourceTemplateId: normalized.sourceTemplateId ?? currentStation.sourceTemplateId,
    updatedAt: new Date().toISOString(),
  };

  stations = stations.map((station) => (station.id === id ? updatedStation : station));
  return updatedStation;
}
