import type { Metadata } from "next";
import { LandingPage } from "@/features/landing/components/landing-page";
import { FAQ_ITEMS } from "@/features/landing/model/content";

export const metadata: Metadata = {
  title: "SurvivorQuest (Survivor Quest) | Gry terenowe i realizacje eventowe",
  description:
    "SurvivorQuest (Survivor Quest) to platforma do organizacji gier terenowych i eventów firmowych: panel admina, aplikacja mobilna i monitoring realizacji na żywo.",
  keywords: [
    "survivor quest",
    "survivorquest",
    "aplikacja do gier terenowych",
    "platforma do eventów firmowych",
    "aplikacja do eventów integracyjnych",
    "monitoring gry terenowej na żywo",
    "zarządzanie zespołami podczas eventu",
    "ranking drużyn na żywo",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SurvivorQuest (Survivor Quest) | Gry terenowe i realizacje eventowe",
    description:
      "Panel admina + aplikacja mobilna do prowadzenia gier terenowych, zarządzania zespołami i monitoringu realizacji.",
    url: "/",
    type: "website",
    locale: "pl_PL",
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

  const adminPanelHref =
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3100/admin/login" : "/admin/login");
  const demoHref =
    process.env.NEXT_PUBLIC_DEMO_URL?.trim() ||
    "mailto:kontakt@survivorquest.pl?subject=Um%C3%B3wienie%20demo%20SurvivorQuest";
  const quoteHref =
    process.env.NEXT_PUBLIC_QUOTE_URL?.trim() ||
    "mailto:kontakt@survivorquest.pl?subject=Pro%C5%9Bba%20o%20wycen%C4%99%20SurvivorQuest";
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "kontakt@survivorquest.pl";
  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "+48 730 622 029";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage
        adminPanelHref={adminPanelHref}
        demoHref={demoHref}
        quoteHref={quoteHref}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
      />
    </>
  );
}
