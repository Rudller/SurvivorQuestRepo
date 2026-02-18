import { NextResponse } from "next/server";

type UserRole = "admin" | "instructor";
type User = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

let users: User[] = [
  {
    id: "1",
    email: "admin@survivorquest.app",
    role: "admin",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; role?: UserRole };

  if (!body?.email || !body?.role) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email: body.email,
    role: body.role,
    createdAt: new Date().toISOString(),
  };

  users = [newUser, ...users];
  return NextResponse.json(newUser, { status: 201 });
}