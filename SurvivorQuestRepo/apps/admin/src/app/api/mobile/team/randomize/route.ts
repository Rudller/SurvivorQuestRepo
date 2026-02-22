import { NextResponse } from "next/server";
import { randomizeMobileTeam, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
    };

    const result = randomizeMobileTeam({
      sessionToken: body.sessionToken || "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
