import { NextResponse } from "next/server";
import { GENERAL_OFFER_SLUG } from "@/features/offers/model/offers";

/**
 * Short links for printed material: `survivorquest.pl/o/u` and friends.
 *
 * Two reasons these exist instead of putting the full URL on the print.
 *
 * Length: the target carries UTM parameters and runs well past eighty
 * characters, which needs a version 5-6 QR code; `/o/u` is twenty-one and fits
 * in version 1-2. Fewer modules means a code that still scans from across a
 * trade-fair aisle, off a roll-up, in bad light.
 *
 * Indirection: a code already in print can later be pointed at a different
 * offer — a campaign page, next year's PDF — by editing this table. That only
 * holds while the redirect stays temporary, hence 307 and `no-store` below. A
 * 308 is cached by browsers indefinitely and would nail every printed flyer to
 * whatever it resolved to the first time somebody scanned it.
 *
 * Note these skip the `/oferta` listing and land on an offer directly. Someone
 * holding a flyer already chose; making them pick from a list would be a wasted
 * tap on a bad connection.
 */

type ShortLink = {
  /** Where the scan lands, before UTM parameters are appended. */
  path: string;
  /** `utm_medium` — which physical material the code was printed on. */
  medium: string;
  /** `utm_campaign` — bump this for a new event so the numbers stay separable. */
  campaign: string;
  source: string;
};

const TRADE_FAIR_CAMPAIGN = "targi-event-2026";
const GENERAL_OFFER_PATH = `/oferta/${GENERAL_OFFER_SLUG}`;

const SHORT_LINKS: Record<string, ShortLink> = {
  u: { path: GENERAL_OFFER_PATH, medium: "ulotka", campaign: TRADE_FAIR_CAMPAIGN, source: "targi" },
  r: { path: GENERAL_OFFER_PATH, medium: "rollup", campaign: TRADE_FAIR_CAMPAIGN, source: "targi" },
  w: { path: GENERAL_OFFER_PATH, medium: "wizytowka", campaign: TRADE_FAIR_CAMPAIGN, source: "targi" },
  s: { path: GENERAL_OFFER_PATH, medium: "stoisko", campaign: TRADE_FAIR_CAMPAIGN, source: "targi" },
};

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = SHORT_LINKS[code.toLowerCase()];

  /* An unknown code is a typo in the print run or a code retired after the
     material shipped. Somebody is standing there holding the flyer, so send
     them to the listing rather than showing a 404. */
  const target = new URL(link?.path ?? "/oferta", request.url);
  if (link) {
    target.searchParams.set("utm_source", link.source);
    target.searchParams.set("utm_medium", link.medium);
    target.searchParams.set("utm_campaign", link.campaign);
  }

  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
