import { NextResponse } from "next/server";
import {
  addTemplateStation,
  findStationById,
  isTemplateStation,
  listTemplateStations,
  parseTimeLimitSeconds,
  removeStationById,
  replaceTemplateStation,
  type StationEntity,
  type StationType,
} from "./_store";

const COMPLETION_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;

function isCompletionCodeRequired(stationType: StationType) {
  return stationType === "time" || stationType === "points";
}

function normalizeCompletionCode(value: string | undefined) {
  return value?.trim().toUpperCase() || "";
}

export async function GET() {
  return NextResponse.json(listTemplateStations());
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    type?: StationType;
    description?: string;
    imageUrl?: string;
    points?: number;
    timeLimitSeconds?: number;
    completionCode?: string;
  };

  const parsedTimeLimit = parseTimeLimitSeconds(body.timeLimitSeconds);

  if (
    !body?.name ||
    !body?.description ||
    !body?.type ||
    !["quiz", "time", "points"].includes(body.type) ||
    typeof body.points !== "number" ||
    body.points <= 0 ||
    !parsedTimeLimit.ok
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const normalizedCompletionCode = normalizeCompletionCode(body.completionCode);
  if (
    (isCompletionCodeRequired(body.type) && !COMPLETION_CODE_REGEX.test(normalizedCompletionCode)) ||
    (!isCompletionCodeRequired(body.type) && normalizedCompletionCode.length > 0)
  ) {
    return NextResponse.json({ message: "Invalid completion code" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const newGame: StationEntity = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type,
    description: body.description,
    imageUrl:
      body.imageUrl?.trim() ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(body.name)}`,
    points: body.points,
    timeLimitSeconds: parsedTimeLimit.value,
    completionCode: isCompletionCodeRequired(body.type) ? normalizedCompletionCode : undefined,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json(addTemplateStation(newGame), { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    name?: string;
    type?: StationType;
    description?: string;
    imageUrl?: string;
    points?: number;
    timeLimitSeconds?: number;
    completionCode?: string;
  };

  const parsedTimeLimit = parseTimeLimitSeconds(body.timeLimitSeconds);

  if (
    !body?.id ||
    !body?.name ||
    !body?.description ||
    !body?.type ||
    !["quiz", "time", "points"].includes(body.type) ||
    typeof body.points !== "number" ||
    body.points <= 0 ||
    !parsedTimeLimit.ok
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const normalizedCompletionCode = normalizeCompletionCode(body.completionCode);
  if (
    (isCompletionCodeRequired(body.type) && !COMPLETION_CODE_REGEX.test(normalizedCompletionCode)) ||
    (!isCompletionCodeRequired(body.type) && normalizedCompletionCode.length > 0)
  ) {
    return NextResponse.json({ message: "Invalid completion code" }, { status: 400 });
  }

  const currentGame = findStationById(body.id);

  if (!currentGame || !isTemplateStation(currentGame)) {
    return NextResponse.json({ message: "Station not found" }, { status: 404 });
  }

  const updatedGame: StationEntity = {
    ...currentGame,
    name: body.name,
    type: body.type,
    description: body.description,
    imageUrl:
      body.imageUrl?.trim() ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(body.name)}`,
    points: body.points,
    timeLimitSeconds: parsedTimeLimit.value,
    completionCode: isCompletionCodeRequired(body.type) ? normalizedCompletionCode : undefined,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(replaceTemplateStation(updatedGame));
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as { id?: string; confirmName?: string };

  if (!body?.id || !body?.confirmName?.trim()) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const gameToDelete = findStationById(body.id);

  if (!gameToDelete || !isTemplateStation(gameToDelete)) {
    return NextResponse.json({ message: "Station not found" }, { status: 404 });
  }

  if (gameToDelete.name !== body.confirmName.trim()) {
    return NextResponse.json({ message: "Station name confirmation does not match" }, { status: 400 });
  }

  removeStationById(body.id);
  return NextResponse.json({ id: body.id });
}
