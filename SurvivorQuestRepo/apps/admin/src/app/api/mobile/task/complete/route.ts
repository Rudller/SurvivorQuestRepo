import { NextResponse } from "next/server";
import { completeMobileTask, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      stationId?: string;
      pointsAwarded?: number;
      finishedAt?: string;
    };

    const result = completeMobileTask({
      sessionToken: body.sessionToken || "",
      stationId: body.stationId || "",
      pointsAwarded: Number(body.pointsAwarded),
      finishedAt: body.finishedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
