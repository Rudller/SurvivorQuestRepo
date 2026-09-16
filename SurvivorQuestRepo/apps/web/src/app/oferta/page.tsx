import type { Metadata } from "next";
import { OfferIndexPage } from "@/features/offers/components/offer-index-page";
import { OG_IMAGE } from "@/lib/site-url";

const TITLE = "Oferta | SurvivorQuest";
const DESCRIPTION =
  "Oferty SurvivorQuest dla firm — gry terenowe, gry hotelowe i quizy drużynowe. Każdą ofertę można pobrać jako PDF.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/oferta",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/oferta",
    type: "website",
    locale: "pl_PL",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function OfferListingPage() {
  return <OfferIndexPage />;
}
