import { NextResponse } from "next/server";
import { getMobileAdminRealizationOverview, toApiError } from "../../../_store";

type Context = {
  params: Promise<{ realizationId: string }>;
};

export async function GET(_req: Request, context: Context) {
  try {
    const { realizationId } = await context.params;
    const result = getMobileAdminRealizationOverview(realizationId);
    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
