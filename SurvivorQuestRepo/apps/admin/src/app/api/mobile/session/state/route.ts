import { NextResponse } from "next/server";
import { getMobileSessionState, toApiError } from "../../_store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionToken = searchParams.get("sessionToken") || "";

    const result = getMobileSessionState(sessionToken);
    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
