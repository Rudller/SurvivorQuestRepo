import { NextResponse } from "next/server";

type StationType = "quiz" | "time" | "points";

type Station = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  createdAt: string;
  updatedAt: string;
};

function parseTimeLimitSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 600) {
    return { ok: false as const, value: null };
  }

  return { ok: true as const, value: Math.round(value) };
}

const now = new Date().toISOString();

let games: Station[] = [
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

export async function GET() {
  return NextResponse.json(games);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    type?: StationType;
    description?: string;
    imageUrl?: string;
    points?: number;
    timeLimitSeconds?: number;
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

  const now = new Date().toISOString();

  const newGame: Station = {
    id: crypto.randomUUID(),
    name: body.name,
    type: body.type,
    description: body.description,
    imageUrl:
      body.imageUrl?.trim() ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(body.name)}`,
    points: body.points,
    timeLimitSeconds: parsedTimeLimit.value,
    createdAt: now,
    updatedAt: now,
  };

  games = [newGame, ...games];
  return NextResponse.json(newGame, { status: 201 });
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

  const gameIndex = games.findIndex((game) => game.id === body.id);

  if (gameIndex < 0) {
    return NextResponse.json({ message: "Station not found" }, { status: 404 });
  }

  const currentGame = games[gameIndex];
  const updatedGame: Station = {
    ...currentGame,
    name: body.name,
    type: body.type,
    description: body.description,
    imageUrl:
      body.imageUrl?.trim() ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(body.name)}`,
    points: body.points,
    timeLimitSeconds: parsedTimeLimit.value,
    updatedAt: new Date().toISOString(),
  };

  games = games.map((game) => (game.id === body.id ? updatedGame : game));
  return NextResponse.json(updatedGame);
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as { id?: string; confirmName?: string };

  if (!body?.id || !body?.confirmName?.trim()) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const gameToDelete = games.find((game) => game.id === body.id);

  if (!gameToDelete) {
    return NextResponse.json({ message: "Station not found" }, { status: 404 });
  }

  if (gameToDelete.name !== body.confirmName.trim()) {
    return NextResponse.json({ message: "Station name confirmation does not match" }, { status: 400 });
  }

  games = games.filter((game) => game.id !== body.id);
  return NextResponse.json({ id: body.id });
}
