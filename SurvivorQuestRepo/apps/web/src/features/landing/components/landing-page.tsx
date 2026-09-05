import Image from "next/image";
import Link from "next/link";
import {
  BENEFITS,
  CASE_STUDIES,
  FAQ_ITEMS,
  PROCESS_STEPS,
  REALIZATION_PHOTO_SPOTS,
  TRUST_CLIENTS,
  TRUST_METRICS,
} from "@/features/landing/model/content";
import { LandingHeaderVisibilityController } from "./landing-header-visibility-controller";
import { LandingScrollLink } from "./landing-scroll-link";
import { PhotoSlotCard } from "./photo-slot-card";
import { SectionHeading } from "./section-heading";

type LandingPageProps = {
  adminPanelHref: string;
  demoHref: string;
  quoteHref: string;
  contactEmail: string;
  contactPhone: string;
};

const LANDING_NAV_ITEMS = [
  { href: "#funkcje", label: "Funkcje" },
  { href: "#materialy", label: "Materiały" },
  { href: "#przeplyw", label: "Przepływ" },
  { href: "#scenariusze", label: "Scenariusze" },
  { href: "#faq", label: "FAQ" },
  { href: "#kontakt", label: "Kontakt" },
] as const;

/**
 * Sections are full-bleed blocks of solid colour that meet edge to edge.
 *
 * What marks the boundary is the change of tone itself — consecutive sections
 * alternate between two shades, so the seam reads without anything being drawn
 * on it. apple.com separates its tiles with a gap of page background instead,
 * which works on white but not here: on this palette the gap exposed the body
 * gradient and looked like a crack rather than a seam.
 */
const SECTION_BASE = "sq-section scroll-mt-28 py-14 sm:py-20 lg:py-24";
const TONE_A = `${SECTION_BASE} bg-[#12211a]`;
const TONE_B = `${SECTION_BASE} bg-[#172a21]`;

/** Every section pulls its content back into the same centred column. */
const SECTION_INNER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export function LandingPage({ adminPanelHref, demoHref, quoteHref, contactEmail, contactPhone }: LandingPageProps) {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <LandingHeaderVisibilityController />
      <header
        id="landing-top-bar"
        className="sticky top-0 z-30 w-full bg-[#101a15]/92 backdrop-blur-xl transition-transform duration-300 supports-[backdrop-filter]:bg-[#101a15]/78"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image src="/icon.png" alt="Logo SurvivorQuest" width={40} height={40} className="size-10 rounded-xl" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#98ad9c]">SurvivorQuest</p>
                <p className="text-xs text-[#bdcdbf]">Platforma eventowa: panel admina + aplikacja mobilna</p>
              </div>
            </div>

            <details className="relative z-40 sm:hidden">
              <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl bg-[#15231d] text-[#f3f5ef] transition hover:text-[#f0d9a7] [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Otwórz menu</span>
                <span className="flex flex-col gap-1" aria-hidden>
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                </span>
              </summary>

              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-[#12211a] p-2 shadow-[0_24px_44px_-24px_rgba(0,0,0,0.9)]">
                <Link
                  href="/download"
                  className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23] hover:text-[#f0d9a7]"
                >
                  Pobierz aplikację
                </Link>
                <Link
                  href={adminPanelHref}
                  className="mt-1 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23] hover:text-[#f0d9a7]"
                >
                  Panel admina
                </Link>
              </div>
            </details>

            <div className="hidden gap-2 sm:flex">
              <Link
                href="/download"
                className="inline-flex items-center justify-center rounded-xl bg-[#15231d] px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23] hover:text-[#f0d9a7]"
              >
                Pobierz aplikację
              </Link>
              <Link
                href={adminPanelHref}
                className="inline-flex items-center justify-center rounded-xl bg-[#15231d] px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23] hover:text-[#f0d9a7]"
              >
                Panel admina
              </Link>
            </div>
          </div>

          <div className="relative z-0 pt-1">
            <nav
              aria-label="Nawigacja sekcji strony"
              className="w-full overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              <ul className="flex min-w-max items-center gap-1">
                {LANDING_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <LandingScrollLink
                      href={item.href}
                      className="group relative inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium tracking-[0.02em] text-[#9fb1a4] transition after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-[#e9c986] after:transition-all after:duration-200 hover:bg-[#1a2b23] hover:text-[#f3f5ef] hover:after:w-[56%] focus-visible:bg-[#1a2b23] focus-visible:text-[#f3f5ef] focus-visible:outline-none focus-visible:after:w-[56%]"
                    >
                      {item.label}
                    </LandingScrollLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-col">
        <section className="sq-section relative overflow-hidden bg-[#15261e] py-14 sm:py-20 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.24),transparent_46%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_48%)]" />

          <div className={`relative grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-12 ${SECTION_INNER}`}>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e9c986]">Platforma eventowa</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#f3f5ef] sm:text-5xl">
                Aplikacja do prowadzenia gry terenowej, zarządzania zespołami i monitorowania realizacji na żywo.
              </h1>

              <Image
                src="/hero-visual.png"
                alt="Uczestnicy gry terenowej korzystają z tabletu z aplikacją SurvivorQuest w lesie."
                width={1536}
                height={1024}
                priority
                className="mt-6 h-[38vh] min-h-[220px] w-full rounded-2xl object-cover lg:hidden"
              />

              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[#c3d2c7] sm:text-base lg:text-lg">
                SurvivorQuest (Survivor Quest) łączy panel admina i aplikację mobilną w jeden system operacyjny dla
                eventów. Tworzysz scenariusze, zarządzasz stacjami, śledzisz postęp zespołów i masz pełny podgląd
                punktacji bez przełączania narzędzi.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {TRUST_METRICS.map((metric) => (
                  <article key={metric.label}>
                    <p className="text-2xl font-semibold text-[#f3f5ef]">{metric.value}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#98ad9c]">{metric.label}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={demoHref}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#e9c986] px-5 py-3 text-sm font-semibold text-[#13231b] transition hover:-translate-y-0.5 hover:bg-[#f2d79f] sm:w-auto"
                >
                  Zobacz demo aplikacji
                </Link>
                <Link
                  href={quoteHref}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#1c2f26] px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:-translate-y-0.5 hover:bg-[#24392e] hover:text-[#f0d9a7] sm:w-auto"
                >
                  Kontakt i wdrożenie
                </Link>
              </div>
            </article>

            {/* Left at its original sizing: stretched to the column rather than
                letterboxed, which is the one thing that was asked to stay. */}
            <Image
              src="/hero-visual.png"
              alt="Uczestnicy gry terenowej korzystają z tabletu z aplikacją SurvivorQuest w lesie."
              width={1536}
              height={1024}
              priority
              className="hidden h-full w-full rounded-3xl object-cover lg:block"
            />
          </div>
        </section>

        <section className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Zaufanie klientów"
              title="Zaufali nam"
              description="Współpracujemy z firmami, które stawiają na sprawną i angażującą realizację eventów."
            />
            <ul className="mx-auto mt-8 flex w-full max-w-xl flex-wrap items-center justify-center gap-10">
              {TRUST_CLIENTS.map((client) => (
                <li key={client.name}>
                  {client.logoSrc ? (
                    <Image
                      src={client.logoSrc}
                      alt={client.logoAlt}
                      width={420}
                      height={140}
                      className="h-24 w-auto max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#f3f5ef]">{client.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="funkcje" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Funkcje platformy"
              title="Najważniejsze moduły SurvivorQuest"
              description="Panel admina, aplikacja mobilna i narzędzia koordynatora pracują na wspólnych danych w czasie rzeczywistym."
            />
            <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {BENEFITS.map((benefit) => (
                <article key={benefit.title}>
                  <h3 className="text-lg font-semibold text-[#f3f5ef]">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#bdcdbf]">{benefit.description}</p>
                  <ul className="mt-4 space-y-2.5">
                    {benefit.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#98ad9c]">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#f0c977]" aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="materialy" className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Materiały i widoki"
              title="Miejsce na zdjęcia z realizacji oraz zrzuty ekranu aplikacji."
              description="Te bloki możesz wypełnić materiałami, które pokazują zarówno atmosferę eventu, jak i działanie produktu."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {REALIZATION_PHOTO_SPOTS.map((spot) => (
                <PhotoSlotCard key={spot.title} title={spot.title} description={spot.description} badge={spot.badge} />
              ))}
            </div>
          </div>
        </section>

        <section id="przeplyw" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Przepływ pracy w aplikacji"
              title="Od konfiguracji scenariusza do podsumowania realizacji."
              description="Najpierw konfigurujesz event w panelu, potem zespoły grają w mobile, a koordynator śledzi całość live."
            />
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {PROCESS_STEPS.map((step) => (
                <article key={step.title}>
                  <h3 className="text-lg font-semibold text-[#f3f5ef]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#bdcdbf]">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="scenariusze" className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Scenariusze użycia"
              title="Przykłady jak platforma działa podczas eventu."
              description="Sekcja do pokazania konkretnych przepływów pracy i ekranów dla różnych typów realizacji."
            />
            <div className="mt-10 grid gap-10">
              {CASE_STUDIES.map((caseStudy) => (
                <article key={caseStudy.title}>
                  <h3 className="text-lg font-semibold text-[#f3f5ef] sm:text-xl">{caseStudy.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#bdcdbf]">
                    <span className="font-medium text-[#f3f5ef]">Wyzwanie:</span> {caseStudy.challenge}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#bdcdbf]">
                    <span className="font-medium text-[#f3f5ef]">Efekt:</span> {caseStudy.outcome}
                  </p>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                    {caseStudy.photos.map((photo) => (
                      <li
                        key={photo}
                        className="rounded-xl bg-[#16261f] px-4 py-5 text-xs leading-relaxed text-[#98ad9c]"
                      >
                        {photo}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="FAQ"
              title="Najczęstsze pytania o funkcje platformy."
              description="Szybkie odpowiedzi dla zespołów, które chcą wdrożyć SurvivorQuest."
            />
            <div className="mt-10 max-w-3xl space-y-7">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-[#f3f5ef] sm:text-base [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center text-lg text-[#9fb1a4] transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-open:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="mt-3 text-sm leading-relaxed text-[#bdcdbf]">{item.answer}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="kontakt" className={`${TONE_B} relative overflow-hidden`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.2),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_45%)]" />
          <div className={`relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center ${SECTION_INNER}`}>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e9c986]">
                Zobacz platformę w praktyce
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-[#f3f5ef] sm:text-4xl">
                Sprawdź, jak działa SurvivorQuest od strony panelu admina i aplikacji mobilnej.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c3d2c7] sm:text-base">
                Pokażemy Ci realny przepływ: konfiguracja scenariusza, praca zespołów w terenie i monitoring realizacji
                na żywo.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={demoHref}
                  className="inline-flex items-center justify-center rounded-xl bg-[#e9c986] px-5 py-3 text-sm font-semibold text-[#13231b] transition hover:-translate-y-0.5 hover:bg-[#f2d79f]"
                >
                  Zobacz demo aplikacji
                </Link>
                <Link
                  href={quoteHref}
                  className="inline-flex items-center justify-center rounded-xl bg-[#1c2f26] px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:-translate-y-0.5 hover:bg-[#24392e] hover:text-[#f0d9a7]"
                >
                  Kontakt i wdrożenie
                </Link>
              </div>
            </article>

            <aside className="relative rounded-2xl bg-[#12211a] p-6 text-sm text-[#bdcdbf]">
              <header className="flex items-center gap-3">
                <Image
                  src="/icon.png"
                  alt="Logo SurvivorQuest"
                  width={32}
                  height={32}
                  className="size-8 rounded-lg bg-[#162921]"
                />
                <div>
                  <p className="font-semibold text-[#f3f5ef]">SurvivorQuest</p>
                  <p className="text-xs text-[#98ad9c]">Panel + aplikacja mobilna</p>
                </div>
              </header>
              <p className="mt-5 font-semibold text-[#f3f5ef]">Kontakt bezpośredni</p>
              <p className="mt-3">
                Email:{" "}
                <Link href={`mailto:${contactEmail}`} className="text-[#f0c977] underline-offset-4 hover:underline">
                  {contactEmail}
                </Link>
              </p>
              <p className="mt-2">
                Telefon:{" "}
                <Link
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="text-[#f0c977] underline-offset-4 hover:underline"
                >
                  {contactPhone}
                </Link>
              </p>
              <p className="mt-5 text-xs text-[#98ad9c]">Odpowiadamy zwykle w ten sam dzień roboczy.</p>
            </aside>
          </div>
        </section>

        <footer className="sq-section bg-[#101a15] py-10 sm:py-12">
          <div className={`flex flex-col gap-6 md:flex-row md:items-start md:justify-between ${SECTION_INNER}`}>
            <section className="space-y-2">
              <p className="text-sm font-semibold text-[#f3f5ef]">SurvivorQuest</p>
              <p className="text-xs text-[#98ad9c]">Platforma eventowa: panel admina + aplikacja mobilna</p>
              <p className="text-xs text-[#98ad9c]">© {currentYear} SurvivorQuest. Wszelkie prawa zastrzeżone.</p>
            </section>

            <section className="grid gap-1 text-sm">
              <Link href={`mailto:${contactEmail}`} className="text-[#f0c977] underline-offset-4 hover:underline">
                {contactEmail}
              </Link>
              <Link
                href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                className="text-[#f0c977] underline-offset-4 hover:underline"
              >
                {contactPhone}
              </Link>
            </section>

            <nav aria-label="Linki stopki" className="grid gap-1 text-sm text-[#bdcdbf]">
              <Link href="/download" className="underline-offset-4 hover:text-[#f0c977] hover:underline">
                Pobierz aplikację
              </Link>
              <Link href="/polityka-prywatnosci" className="underline-offset-4 hover:text-[#f0c977] hover:underline">
                Polityka prywatności
              </Link>
              <Link href="/polityka-cookies" className="underline-offset-4 hover:text-[#f0c977] hover:underline">
                Polityka cookies
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
