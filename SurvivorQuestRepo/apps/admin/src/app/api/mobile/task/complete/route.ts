import { NextResponse } from "next/server";
import { completeMobileTask, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      gameId?: string;
      pointsAwarded?: number;
      finishedAt?: string;
    };

    const result = completeMobileTask({
      sessionToken: body.sessionToken || "",
      gameId: body.gameId || "",
      pointsAwarded: Number(body.pointsAwarded),
      finishedAt: body.finishedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
