import { NextResponse } from "next/server";

type UserRole = "admin" | "instructor";
type UserStatus = "active" | "invited" | "blocked";
type User = {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

let users: User[] = [
  {
    id: "1",
    displayName: "Admin",
    email: "admin@survivorquest.app",
    phone: "+48 500 600 700",
    role: "admin",
    status: "active",
    photoUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Admin",
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    displayName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
    photoUrl?: string;
  };

  if (!body?.displayName || !body?.email || !body?.role || !body?.status) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const newUser: User = {
    id: crypto.randomUUID(),
    displayName: body.displayName,
    email: body.email,
    phone: body.phone?.trim() || undefined,
    role: body.role,
    status: body.status,
    photoUrl: body.photoUrl?.trim() || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.email)}`,
    lastLoginAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  users = [newUser, ...users];
  return NextResponse.json(newUser, { status: 201 });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
    photoUrl?: string;
  };

  if (!body?.id) {
    return NextResponse.json({ message: "User id is required" }, { status: 400 });
  }

  const userIndex = users.findIndex((user) => user.id === body.id);

  if (userIndex === -1) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const existingUser = users[userIndex];
  const updatedAt = new Date().toISOString();

  const updatedUser: User = {
    ...existingUser,
    displayName: body.displayName?.trim() || existingUser.displayName,
    email: body.email?.trim() || existingUser.email,
    phone: body.phone?.trim() || undefined,
    role: body.role || existingUser.role,
    status: body.status || existingUser.status,
    photoUrl:
      body.photoUrl?.trim() ||
      existingUser.photoUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.email || existingUser.email)}`,
    updatedAt,
  };

  users[userIndex] = updatedUser;
  return NextResponse.json(updatedUser);
}