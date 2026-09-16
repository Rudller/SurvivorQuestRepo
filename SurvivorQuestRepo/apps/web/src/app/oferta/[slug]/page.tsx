import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferPage } from "@/features/offers/components/offer-page";
import { buildOfferMetadata } from "@/features/offers/model/offer-metadata";
import { OFFERS, findOffer, toOfferPath } from "@/features/offers/model/offers";

type OfferRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return OFFERS.map((offer) => ({ slug: offer.slug }));
}

export async function generateMetadata({ params }: OfferRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const offer = findOffer(slug);
  if (!offer) {
    return {};
  }

  return buildOfferMetadata(offer, toOfferPath(offer));
}

export default async function SingleOfferPage({ params }: OfferRouteProps) {
  const { slug } = await params;
  const offer = findOffer(slug);
  if (!offer) {
    notFound();
  }

  return <OfferPage offer={offer} />;
}
