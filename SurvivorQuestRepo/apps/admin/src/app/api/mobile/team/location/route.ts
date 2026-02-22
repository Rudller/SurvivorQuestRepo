import { NextResponse } from "next/server";
import { toApiError, updateMobileTeamLocation } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      lat?: number;
      lng?: number;
      accuracy?: number;
      at?: string;
    };

    const result = updateMobileTeamLocation({
      sessionToken: body.sessionToken || "",
      lat: Number(body.lat),
      lng: Number(body.lng),
      accuracy: body.accuracy,
      at: body.at,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
