import { NextResponse } from "next/server";
import { claimMobileTeam, toApiError } from "../../_store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionToken?: string;
      name?: string;
      color?: string;
      badgeKey?: string;
      badgeImageUrl?: string;
    };

    const result = claimMobileTeam({
      sessionToken: body.sessionToken || "",
      name: body.name || "",
      color: body.color || "",
      badgeKey: body.badgeKey,
      badgeImageUrl: body.badgeImageUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ message: apiError.message }, { status: apiError.status });
  }
}
