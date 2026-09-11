import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AnalyticsGate } from "@/features/analytics/components/analytics-gate";
import { CookieConsentBanner } from "@/features/cookies/components/cookie-consent-banner";
import { OG_IMAGE, getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import "./globals.css";

/**
 * Montserrat is the only face on the site. `latin-ext` is not optional — without
 * it Polish diacritics drop to the fallback face and copy renders in two
 * different fonts mid-word.
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const BRAND_NAME = "SurvivorQuest";
const BRAND_ALTERNATE_NAME = "Survivor Quest";
const BRAND_NAME_WITH_ALTERNATE = `${BRAND_NAME} (${BRAND_ALTERNATE_NAME})`;
const siteUrl = getSiteUrl();
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME_WITH_ALTERNATE} | Gry terenowe i eventy integracyjne dla firm`,
    template: "%s",
  },
  description:
    "SurvivorQuest (Survivor Quest) organizuje gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm — integracje prowadzone na tabletach, z rankingiem na żywo i scenariuszem o Waszej firmie.",
  keywords: [
    "survivor quest",
    "survivorquest",
    "survivorquest.pl",
    "gra terenowa dla firm",
    "organizacja gry terenowej dla firm",
    "gry terenowe integracja",
    "integracja firmowa gra terenowa",
    "event integracyjny dla firm",
    "impreza integracyjna dla firm",
    "gra hotelowa dla firm",
    "gra integracyjna w hotelu",
    "quiz drużynowy dla firm",
    "Ryzykanci quiz drużynowy",
    "atrakcja wieczorna na event firmowy",
    "wyjazd integracyjny atrakcje",
    "gra miejska dla firm",
    "integracja zespołu",
    "event firmowy z rankingiem na żywo",
    BRAND_NAME,
    BRAND_ALTERNATE_NAME,
    "organizacja eventów firmowych",
  ],
  openGraph: {
    title: `${BRAND_NAME_WITH_ALTERNATE} | Eventy, które angażują od pierwszej minuty`,
    description:
      "Gra terenowa, gra hotelowa lub quiz drużynowy Ryzykanci dla Twojej firmy — SurvivorQuest (Survivor Quest) organizuje wszystko od scenariusza po ranking na żywo.",
    url: "/",
    locale: "pl_PL",
    type: "website",
    siteName: BRAND_NAME,
    images: [OG_IMAGE],
  },
  alternates: {
    canonical: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME_WITH_ALTERNATE} | Gry terenowe i eventy integracyjne dla firm`,
    description:
      "Gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm — integracje prowadzone na tabletach z rankingiem na żywo.",
    images: [OG_IMAGE.url],
  },
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seoJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: BRAND_NAME,
        alternateName: BRAND_ALTERNATE_NAME,
        url: siteUrl,
        logo: toAbsoluteUrl("/logo-sq.png"),
        email: "kontakt@survivorquest.pl",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: BRAND_NAME,
        alternateName: BRAND_ALTERNATE_NAME,
        url: siteUrl,
        inLanguage: "pl-PL",
        publisher: {
          "@id": `${siteUrl}#organization`,
        },
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}#service`,
        name: "Gry terenowe i eventy integracyjne dla firm",
        serviceType: "Organizacja eventów firmowych",
        areaServed: "PL",
        url: siteUrl,
        description:
          "Gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm — integracje prowadzone na tabletach, z rankingiem na żywo i scenariuszem o firmie klienta.",
        provider: {
          "@id": `${siteUrl}#organization`,
        },
      },
    ],
  };

  return (
    <html lang="pl">
      <body className={`${montserrat.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seoJsonLd),
          }}
        />
        {children}
        <AnalyticsGate />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
