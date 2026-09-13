import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AnalyticsGate } from "@/features/analytics/components/analytics-gate";
import { CookieConsentBanner } from "@/features/cookies/components/cookie-consent-banner";
import { EVENT_FORMATS } from "@/features/landing/model/content";
import { getContactEmail, getContactPhone, toDialablePhone } from "@/lib/contact";
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
const siteUrl = getSiteUrl();
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

/**
 * Site-wide defaults only. Every route declares its own title, description and
 * canonical, so this object deliberately does not repeat the home page's copy —
 * keeping a second version of it here is how the two drift apart.
 *
 * The title stays under ~60 characters because that is where Google truncates.
 * The spaced-out "Survivor Quest" spelling is carried by `alternateName` in the
 * JSON-LD below, not by the title, where it cost 16 characters and pushed the
 * part that actually sells out of the result.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gry terenowe i eventy integracyjne dla firm | SurvivorQuest",
    template: "%s",
  },
  description:
    "Organizujemy gry terenowe, gry hotelowe i quizy drużynowe dla firm. Drużyny grają na tabletach z naszej autorskiej aplikacji, z rankingiem na żywo.",
  openGraph: {
    locale: "pl_PL",
    type: "website",
    siteName: BRAND_NAME,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
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
  const contactEmail = getContactEmail();
  const contactPhone = getContactPhone();

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
        email: contactEmail,
        telephone: toDialablePhone(contactPhone),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: contactEmail,
            telephone: toDialablePhone(contactPhone),
            availableLanguage: ["pl", "en"],
          },
        ],
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
        areaServed: {
          "@type": "Country",
          name: "Polska",
        },
        url: siteUrl,
        description:
          "Gry terenowe, gry hotelowe i quiz drużynowy Ryzykanci dla firm — integracje prowadzone na tabletach, w autorskiej aplikacji SurvivorQuest, z rankingiem na żywo i scenariuszem o firmie klienta.",
        provider: {
          "@id": `${siteUrl}#organization`,
        },
        /* Built from the same array the offer section renders, so a renamed
           format cannot end up described one way on screen and another in the
           structured data. */
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Formaty eventów",
          itemListElement: EVENT_FORMATS.map((format) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: format.title,
              description: format.tagline,
              url: `${siteUrl}/#${format.id}`,
            },
          })),
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
