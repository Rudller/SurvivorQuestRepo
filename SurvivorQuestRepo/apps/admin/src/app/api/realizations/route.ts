import { NextResponse } from "next/server";

type RealizationStatus = "planned" | "in-progress" | "done";

type RealizationLog = {
  id: string;
  changedBy: string;
  changedAt: string;
  action: "created" | "updated";
  description: string;
};

type Realization = {
  id: string;
  companyName: string;
  gameIds: string[];
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

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

let realizations: Realization[] = [
  {
    id: "r-1",
    companyName: "Northwind Sp. z o.o.",
    gameIds: ["g-1", "g-2"],
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
    gameIds: ["g-2", "g-3"],
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
    gameIds: ["g-1", "g-4", "g-5"],
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
    gameIds: ["g-3"],
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
    gameIds: ["g-1", "g-2", "g-4"],
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
];

export async function GET() {
  const normalizedRealizations = realizations.map((realization) => ({
    ...realization,
    requiredDevicesCount: calculateRequiredDevices(realization.teamCount),
    status: resolveRealizationStatus(realization.status, realization.scheduledAt),
  }));

  realizations = normalizedRealizations;
  return NextResponse.json(normalizedRealizations);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyName?: string;
    gameIds?: string[];
    teamCount?: number;
    peopleCount?: number;
    positionsCount?: number;
    status?: RealizationStatus;
    scheduledAt?: string;
    changedBy?: string;
  };

  const scheduledTimestamp = body.scheduledAt ? new Date(body.scheduledAt).getTime() : NaN;

  if (
    !body?.companyName ||
    !Array.isArray(body.gameIds) ||
    body.gameIds.length === 0 ||
    body.gameIds.some((gameId) => typeof gameId !== "string" || !gameId.trim()) ||
    typeof body.teamCount !== "number" ||
    body.teamCount < 1 ||
    typeof body.peopleCount !== "number" ||
    body.peopleCount < 1 ||
    typeof body.positionsCount !== "number" ||
    body.positionsCount < 1 ||
    !body.status ||
    !body.scheduledAt ||
    !Number.isFinite(scheduledTimestamp)
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const changedBy = getChangedBy(body.changedBy);

  const newRealization: Realization = {
    id: crypto.randomUUID(),
    companyName: body.companyName.trim(),
    gameIds: body.gameIds,
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
    gameIds?: string[];
    teamCount?: number;
    peopleCount?: number;
    positionsCount?: number;
    status?: RealizationStatus;
    scheduledAt?: string;
    changedBy?: string;
  };

  const scheduledTimestamp = body.scheduledAt ? new Date(body.scheduledAt).getTime() : NaN;

  if (
    !body?.id ||
    !body.companyName ||
    !Array.isArray(body.gameIds) ||
    body.gameIds.length === 0 ||
    body.gameIds.some((gameId) => typeof gameId !== "string" || !gameId.trim()) ||
    typeof body.teamCount !== "number" ||
    body.teamCount < 1 ||
    typeof body.peopleCount !== "number" ||
    body.peopleCount < 1 ||
    typeof body.positionsCount !== "number" ||
    body.positionsCount < 1 ||
    !body.status ||
    !body.scheduledAt ||
    !Number.isFinite(scheduledTimestamp)
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const realizationIndex = realizations.findIndex((realization) => realization.id === body.id);

  if (realizationIndex < 0) {
    return NextResponse.json({ message: "Realization not found" }, { status: 404 });
  }

  const current = realizations[realizationIndex];
  const changedBy = getChangedBy(body.changedBy);
  const nextScheduledAt = new Date(scheduledTimestamp).toISOString();

  const changes: string[] = [];

  if (current.companyName !== body.companyName.trim()) {
    changes.push("firma");
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

  if (JSON.stringify(current.gameIds) !== JSON.stringify(body.gameIds)) {
    changes.push("lista gier");
  }

  const updatedRealization: Realization = {
    ...current,
    companyName: body.companyName.trim(),
    gameIds: body.gameIds,
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
