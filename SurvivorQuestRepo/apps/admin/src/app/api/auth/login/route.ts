import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; password?: string };

  if (body.email === "test@mail.com" && body.password === "hasło123") {
    const res = NextResponse.json({
      user: { id: "1", email: body.email, role: "admin" as const },
    });

    res.cookies.set("sq_session", "mock-admin-session", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  }

  return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
}