import { NextResponse } from "next/server";
import { startMobileTask, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      stationId?: string;
      startedAt?: string;
    };

    const result = startMobileTask({
      sessionToken: body.sessionToken || "",
      stationId: body.stationId || "",
      startedAt: body.startedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
