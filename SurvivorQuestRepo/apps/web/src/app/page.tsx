import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site-url";
import { LandingPage } from "@/features/landing/components/landing-page";
import { HERO_SLIDES } from "@/features/landing/lib/hero-slides";
import { FAQ_ITEMS } from "@/features/landing/model/content";

export const metadata: Metadata = {
  title: "SurvivorQuest (Survivor Quest) | Gry terenowe i eventy integracyjne dla firm",
  description:
    "SurvivorQuest (Survivor Quest) organizuje gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm. Drużyny grają na tabletach z rankingiem na żywo — my przywozimy sprzęt, scenariusz i prowadzących.",
  keywords: [
    "survivor quest",
    "survivorquest",
    "organizacja gry terenowej dla firm",
    "integracja firmowa gra terenowa",
    "gra hotelowa dla firm",
    "event integracyjny z aplikacją",
    "quiz drużynowy Ryzykanci",
    "impreza integracyjna z tabletami",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SurvivorQuest (Survivor Quest) | Gry terenowe i eventy integracyjne dla firm",
    description:
      "Gra terenowa, gra hotelowa lub quiz drużynowy Ryzykanci dla Twojej firmy — organizujemy od scenariusza po ranking na żywo.",
    url: "/",
    type: "website",
    locale: "pl_PL",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "SurvivorQuest (Survivor Quest) | Gry terenowe i eventy integracyjne dla firm",
    description:
      "Gra terenowa, gra hotelowa lub quiz drużynowy Ryzykanci dla Twojej firmy — organizujemy od scenariusza po ranking na żywo.",
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

  const quoteHrefBase = process.env.NEXT_PUBLIC_QUOTE_URL?.trim() || "mailto:kontakt@survivorquest.pl";
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "kontakt@survivorquest.pl";
  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "+48 730 622 029";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage
        heroSlides={HERO_SLIDES}
        quoteHrefBase={quoteHrefBase}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
      />
    </>
  );
}
