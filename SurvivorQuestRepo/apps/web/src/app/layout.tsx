import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AnalyticsGate } from "@/features/analytics/components/analytics-gate";
import { CookieConsentBanner } from "@/features/cookies/components/cookie-consent-banner";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "SurvivorQuest | Gry terenowe i realizacje eventowe",
    template: "%s",
  },
  description:
    "SurvivorQuest to nowoczesna platforma event-tech do organizacji gier terenowych, realizacji zespołowych i angażujących wydarzeń firmowych.",
  keywords: [
    "gry terenowe",
    "eventy firmowe",
    "integracja zespołu",
    "event tech",
    "SurvivorQuest",
    "organizacja wydarzeń",
  ],
  openGraph: {
    title: "SurvivorQuest | Eventy, które angażują od pierwszej minuty",
    description:
      "Poznaj SurvivorQuest: scenariusze eventowe, realizacje terenowe i nowoczesne narzędzia operacyjne dla organizatorów.",
    url: "/",
    locale: "pl_PL",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <AnalyticsGate />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
