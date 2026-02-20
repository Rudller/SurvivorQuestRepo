import { NextResponse } from "next/server";

type Game = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  points: number;
  createdAt: string;
  updatedAt: string;
};

let games: Game[] = [
  {
    id: "g-1",
    name: "Survival Basics",
    description: "Gra szkoleniowa dla początkujących.",
    imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&q=80&auto=format&fit=crop",
    points: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "g-2",
    name: "Forest Escape",
    description: "Scenariusz terenowy z zadaniami zespołowymi.",
    imageUrl: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=640&q=80&auto=format&fit=crop",
    points: 180,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(games);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; description?: string; imageUrl?: string; points?: number };

  if (!body?.name || !body?.description || typeof body.points !== "number" || body.points <= 0) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const newGame: Game = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description,
    imageUrl:
      body.imageUrl?.trim() ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(body.name)}`,
    points: body.points,
    createdAt: now,
    updatedAt: now,
  };

  games = [newGame, ...games];
  return NextResponse.json(newGame, { status: 201 });
}
