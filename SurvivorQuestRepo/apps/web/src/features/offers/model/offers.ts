/**
 * Every offer that has its own page and its own downloadable PDF.
 *
 * The point of this registry is the printed QR code. A flyer handed out at a
 * trade fair stays in circulation for years, so the URL on it can never change
 * — but the PDF behind it will. Keeping the offer's identity (slug, file path)
 * here, separate from the file itself, means the content is replaced by
 * overwriting the PDF in `public/oferty/`, and nothing that was printed stops
 * working.
 *
 * Adding an offer is one entry plus one PDF: the listing at `/oferta`, the page
 * at `/oferta/<slug>` and the sitemap all read from this array. Do not rename
 * the `slug` or `pdfPath` of an offer whose code is already in print.
 */

import { EVENT_FORMATS } from "@/features/landing/model/content";

export type Offer = {
  /** Also the URL segment: `/oferta/<slug>`. ASCII only, no Polish diacritics. */
  slug: string;
  /** Rendered as the H1 and, with the brand appended, as the page title. */
  title: string;
  /** One or two sentences under the heading; doubles as the listing card copy. */
  lead: string;
  /** Three or four scannable bullets — this page is read while walking. */
  points: readonly string[];
  /** Served straight from `public/`; a contract with every printed QR code. */
  pdfPath: string;
  /** Short note under the download button. */
  pdfNote: string;
  metaDescription: string;
};

/**
 * Where the short print links (`/o/u` and friends) send a scan.
 *
 * The listing at `/oferta` is for browsing; somebody who just scanned a flyer
 * wants the offer itself, so the printed codes skip the index and land here.
 */
export const GENERAL_OFFER_SLUG = "ogolna";

/* Taken from the landing copy rather than retyped, so a renamed format cannot
   end up described one way on the home page and another on the offer page. */
const EVENT_FORMAT_POINTS = EVENT_FORMATS.map((format) => format.title);

export const OFFERS: readonly Offer[] = [
  {
    slug: GENERAL_OFFER_SLUG,
    title: "Oferta ogólna",
    lead: "Gry terenowe, gry hotelowe i quizy drużynowe prowadzone na tabletach, w aplikacji, którą napisaliśmy sami. Pełna oferta z opisem formatów jest w PDF-ie poniżej.",
    points: [
      ...EVENT_FORMAT_POINTS,
      "Tablety, prowadzący i scenariusz pod Waszą firmę w cenie",
    ],
    pdfPath: "/oferty/survivorquest-oferta-ogolna.pdf",
    pdfNote: "Plik PDF — możesz go zapisać i wrócić do niego później.",
    metaDescription:
      "Pobierz ofertę SurvivorQuest: gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm. Tablety, prowadzący i scenariusz pod Waszą firmę.",
  },
];

export function findOffer(slug: string): Offer | undefined {
  return OFFERS.find((offer) => offer.slug === slug);
}

export function toOfferPath(offer: Offer) {
  return `/oferta/${offer.slug}`;
}
