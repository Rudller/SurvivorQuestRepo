import { LandingPage } from "@/features/landing/components/landing-page";

export default function HomePage() {
  const adminPanelHref =
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3100/admin/login" : "/admin/login");
  const demoHref =
    process.env.NEXT_PUBLIC_DEMO_URL?.trim() ||
    "mailto:hello@survivorquest.pl?subject=Um%C3%B3wienie%20demo%20SurvivorQuest";
  const quoteHref =
    process.env.NEXT_PUBLIC_QUOTE_URL?.trim() ||
    "mailto:hello@survivorquest.pl?subject=Pro%C5%9Bba%20o%20wycen%C4%99%20SurvivorQuest";
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hello@survivorquest.pl";
  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "+48 000 000 000";

  return (
    <LandingPage
      adminPanelHref={adminPanelHref}
      demoHref={demoHref}
      quoteHref={quoteHref}
      contactEmail={contactEmail}
      contactPhone={contactPhone}
    />
  );
}
