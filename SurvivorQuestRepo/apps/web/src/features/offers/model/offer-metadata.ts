import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site-url";
import type { Offer } from "@/features/offers/model/offers";

/**
 * Metadata for one offer route, built in one place so `/oferta` and
 * `/oferta/<slug>` cannot drift apart.
 *
 * The root layout sets `title.template` to "%s", so the brand is not appended
 * automatically and every title has to carry it itself.
 */
export function buildOfferMetadata(offer: Offer, path: string): Metadata {
  const title = `${offer.title} | SurvivorQuest`;

  return {
    title,
    description: offer.metaDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description: offer.metaDescription,
      url: path,
      type: "article",
      locale: "pl_PL",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: offer.metaDescription,
      images: [OG_IMAGE.url],
    },
  };
}
