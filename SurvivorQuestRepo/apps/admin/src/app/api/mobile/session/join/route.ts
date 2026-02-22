import { NextResponse } from "next/server";
import { joinMobileSession, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      joinCode?: string;
      deviceId?: string;
      memberName?: string;
    };

    const result = joinMobileSession({
      joinCode: body.joinCode || "",
      deviceId: body.deviceId || "",
      memberName: body.memberName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
