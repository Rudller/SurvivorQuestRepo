import { NextResponse } from "next/server";

type ChatMessage = {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
};

let messages: ChatMessage[] = [
  {
    id: "m-1",
    userName: "Admin",
    content: "Witajcie! Tu możecie zostawiać wiadomości dla zespołu.",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { userName?: string; content?: string };

  if (!body?.userName || !body?.content) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const newMessage: ChatMessage = {
    id: crypto.randomUUID(),
    userName: body.userName,
    content: body.content,
    createdAt: new Date().toISOString(),
  };

  messages = [newMessage, ...messages];
  return NextResponse.json(newMessage, { status: 201 });
}
