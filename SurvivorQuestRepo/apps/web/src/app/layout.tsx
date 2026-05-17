import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AnalyticsGate } from "@/features/analytics/components/analytics-gate";
import { CookieConsentBanner } from "@/features/cookies/components/cookie-consent-banner";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const BRAND_NAME = "SurvivorQuest";
const BRAND_ALTERNATE_NAME = "Survivor Quest";
const BRAND_NAME_WITH_ALTERNATE = `${BRAND_NAME} (${BRAND_ALTERNATE_NAME})`;
const siteUrl = getSiteUrl();
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME_WITH_ALTERNATE} | Gry terenowe i realizacje eventowe`,
    template: "%s",
  },
  description:
    "SurvivorQuest (Survivor Quest) to nowoczesna platforma event-tech do organizacji gier terenowych, realizacji zespołowych i angażujących wydarzeń firmowych.",
  keywords: [
    "survivor quest",
    "survivorquest",
    "survivorquest.pl",
    "survivor quest aplikacja",
    "survivorquest aplikacja",
    "survivor quest platforma",
    "gry terenowe",
    "aplikacja do gier terenowych",
    "system do gier terenowych",
    "gra terenowa dla firm aplikacja",
    "organizacja gry terenowej narzędzie",
    "monitoring gry terenowej na żywo",
    "eventy firmowe",
    "platforma do eventów firmowych",
    "aplikacja do eventów integracyjnych",
    "integracja zespołu",
    "zarządzanie zespołami podczas eventu",
    "ranking drużyn na żywo",
    "gry hotelowe aplikacja",
    "warsztaty firmowe aplikacja",
    "atrakcje wieczorne organizacja",
    "event tech",
    BRAND_NAME,
    BRAND_ALTERNATE_NAME,
    "organizacja wydarzeń",
  ],
  openGraph: {
    title: `${BRAND_NAME_WITH_ALTERNATE} | Eventy, które angażują od pierwszej minuty`,
    description:
      "Poznaj SurvivorQuest (Survivor Quest): scenariusze eventowe, realizacje terenowe i nowoczesne narzędzia operacyjne dla organizatorów.",
    url: "/",
    locale: "pl_PL",
    type: "website",
    siteName: BRAND_NAME,
  },
  alternates: {
    canonical: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME_WITH_ALTERNATE} | Gry terenowe i realizacje eventowe`,
    description:
      "Platforma eventowa do prowadzenia gier terenowych, zarządzania zespołami i monitoringu realizacji na żywo.",
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
        logo: toAbsoluteUrl("/icon.png"),
        email: "hello@survivorquest.pl",
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
    ],
  };

  return (
    <html lang="pl">
      <body className={`${inter.variable} antialiased`}>
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
