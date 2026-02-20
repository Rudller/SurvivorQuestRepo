import { NextResponse } from "next/server";

type RealizationStatus = "planned" | "in-progress" | "done";

type Realization = {
  id: string;
  companyName: string;
  gameIds: string[];
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
};

let realizations: Realization[] = [
  {
    id: "r-1",
    companyName: "Przykładowa Firma",
    gameIds: ["g-1", "g-2"],
    peopleCount: 18,
    positionsCount: 4,
    status: "done",
    scheduledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(realizations);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyName?: string;
    gameIds?: string[];
    peopleCount?: number;
    positionsCount?: number;
    status?: RealizationStatus;
    scheduledAt?: string;
  };

  if (
    !body?.companyName ||
    !Array.isArray(body.gameIds) ||
    body.gameIds.length === 0 ||
    body.gameIds.some((gameId) => typeof gameId !== "string" || !gameId.trim()) ||
    typeof body.peopleCount !== "number" ||
    typeof body.positionsCount !== "number" ||
    !body.status ||
    !body.scheduledAt
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const newRealization: Realization = {
    id: crypto.randomUUID(),
    companyName: body.companyName,
    gameIds: body.gameIds,
    peopleCount: body.peopleCount,
    positionsCount: body.positionsCount,
    status: body.status,
    scheduledAt: body.scheduledAt,
    createdAt: new Date().toISOString(),
  };

  realizations = [newRealization, ...realizations];
  return NextResponse.json(newRealization, { status: 201 });
}
