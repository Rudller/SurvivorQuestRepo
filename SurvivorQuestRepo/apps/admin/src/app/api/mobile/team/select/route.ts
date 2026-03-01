import { NextResponse } from "next/server";
import { selectMobileTeam, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      slotNumber?: number;
    };

    const result = selectMobileTeam({
      sessionToken: body.sessionToken || "",
      slotNumber: Number(body.slotNumber),
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
