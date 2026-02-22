import { NextResponse } from "next/server";
import { getMobileBootstrap, toApiError } from "../_store";

export async function GET() {
  try {
    const result = getMobileBootstrap();
    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
