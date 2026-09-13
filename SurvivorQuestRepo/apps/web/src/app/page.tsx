import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site-url";
import { getContactEmail, getContactPhone, getQuoteHrefBase } from "@/lib/contact";
import { LandingPage } from "@/features/landing/components/landing-page";
import { HERO_SLIDES } from "@/features/landing/lib/hero-slides";
import { FAQ_ITEMS } from "@/features/landing/model/content";

const TITLE = "Gry terenowe i eventy integracyjne dla firm | SurvivorQuest";
const DESCRIPTION =
  "Organizujemy gry terenowe, gry hotelowe i quizy drużynowe dla firm. Drużyny grają na tabletach z naszej autorskiej aplikacji, z rankingiem na żywo.";

/**
 * `keywords` is inert as far as Google is concerned — it has been ignored since
 * 2009. It stays as a checklist for us: every phrase listed here has to appear
 * in the visible copy, because that is the only place a search engine reads it.
 * Adding a phrase here that is nowhere in the text is how the last version ended
 * up claiming "impreza integracyjna" the page never said.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "gra terenowa dla firm",
    "gra miejska dla firm",
    "gra hotelowa dla firm",
    "event integracyjny dla firm",
    "impreza integracyjna",
    "wyjazd integracyjny",
    "integracja zespołu",
    "quiz drużynowy dla firm",
    "SurvivorQuest",
    "Survivor Quest",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SurvivorQuest (Survivor Quest) | Eventy, które angażują od pierwszej minuty",
    description:
      "Gra terenowa, gra hotelowa lub quiz drużynowy Ryzykanci dla Twojej firmy — prowadzone w aplikacji, którą napisaliśmy sami.",
    url: "/",
    type: "website",
    locale: "pl_PL",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Gra terenowa, gra hotelowa lub quiz drużynowy Ryzykanci dla Twojej firmy — prowadzone w aplikacji, którą napisaliśmy sami.",
    images: [OG_IMAGE.url],
  },
};

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage
        heroSlides={HERO_SLIDES}
        quoteHrefBase={getQuoteHrefBase()}
        contactEmail={getContactEmail()}
        contactPhone={getContactPhone()}
      />
    </>
  );
}
