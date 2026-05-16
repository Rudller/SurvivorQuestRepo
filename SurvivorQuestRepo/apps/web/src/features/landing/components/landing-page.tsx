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

export function LandingPage({ adminPanelHref, demoHref, quoteHref, contactEmail, contactPhone }: LandingPageProps) {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <LandingHeaderVisibilityController />
      <header
        id="landing-top-bar"
        className="sticky top-0 z-30 w-full border-b border-[#4b6658]/45 bg-[#101a15]/72 backdrop-blur-xl supports-[backdrop-filter]:bg-[#101a15]/62 transition-transform duration-300"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/icon.png"
                alt="Logo SurvivorQuest"
                width={40}
                height={40}
                className="size-10 rounded-xl"
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#98ad9c]">SurvivorQuest</p>
                <p className="text-xs text-[#bdcdbf]">Platforma eventowa: panel admina + aplikacja mobilna</p>
              </div>
            </div>

            <details className="relative z-40 sm:hidden">
              <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border border-[#4b6658]/55 bg-[#15231d]/68 text-[#f3f5ef] transition hover:border-[#e9c986]/55 hover:text-[#f0d9a7] [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Otwórz menu</span>
                <span className="flex flex-col gap-1" aria-hidden>
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                  <span className="h-0.5 w-5 rounded-full bg-current" />
                </span>
              </summary>

              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[#4b6658]/50 bg-[#12211a]/90 p-2 shadow-[0_24px_44px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                <Link
                  href="/download"
                  className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23]/75 hover:text-[#f0d9a7]"
                >
                  Pobierz aplikację
                </Link>
                <Link
                  href={adminPanelHref}
                  className="mt-1 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:bg-[#1a2b23]/75 hover:text-[#f0d9a7]"
                >
                  Panel admina
                </Link>
              </div>
            </details>

            <div className="hidden gap-2 sm:flex">
              <Link
                href="/download"
                className="inline-flex items-center justify-center rounded-xl border border-[#4b6658]/55 bg-[#15231d]/65 px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#e9c986]/55 hover:text-[#f0d9a7]"
              >
                Pobierz aplikację
              </Link>
              <Link
                href={adminPanelHref}
                className="inline-flex items-center justify-center rounded-xl border border-[#4b6658]/55 bg-[#15231d]/65 px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#e9c986]/55 hover:text-[#f0d9a7]"
              >
                Panel admina
              </Link>
            </div>
          </div>
          <div className="relative z-0 border-t border-[#4b6658]/30 pt-1">
            <nav
              aria-label="Nawigacja sekcji strony"
              className="w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <ul className="flex min-w-max items-center gap-1">
                {LANDING_NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <LandingScrollLink
                      href={item.href}
                      className="group relative inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium tracking-[0.02em] text-[#9fb1a4] transition hover:bg-[#1a2b23]/70 hover:text-[#f3f5ef] focus-visible:outline-none focus-visible:bg-[#1a2b23]/70 focus-visible:text-[#f3f5ef] after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-[#e9c986] after:transition-all after:duration-200 hover:after:w-[56%] focus-visible:after:w-[56%]"
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

      <main className="mx-0 flex min-h-screen w-full max-w-none flex-col gap-5 px-0 pb-0 pt-0 sm:mx-auto sm:max-w-6xl sm:gap-10 sm:px-6 sm:pb-8 sm:pt-8 lg:gap-12 lg:px-8 lg:pb-10 lg:pt-10">
        <section className="sq-section relative mx-2 mb-2 grid gap-5 overflow-hidden rounded-2xl border border-[#4b6658]/55 bg-[#15261e]/86 p-0 shadow-none sm:mx-0 sm:mb-0 sm:gap-6 sm:rounded-3xl sm:border sm:p-8 sm:shadow-[0_0_0_1px_rgba(68,98,81,0.14),0_36px_72px_-52px_rgba(0,0,0,0.95)] lg:grid-cols-[1.25fr_1fr] lg:items-center lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.28),transparent_46%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_48%)]" />

          <article className="relative px-4 pb-6 pt-5 sm:px-0 sm:pb-0 sm:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e9c986]">Platforma eventowa</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-5xl">
              Aplikacja do prowadzenia gry terenowej, zarządzania zespołami i monitorowania realizacji na żywo.
            </h1>
            <Image
              src="/hero-visual.png"
              alt="Uczestnicy gry terenowej korzystają z tabletu z aplikacją SurvivorQuest w lesie."
              width={1536}
              height={1024}
              priority
              className="relative z-10 mt-4 h-[38vh] min-h-[220px] w-full rounded-2xl border border-[#4b6658]/55 object-cover brightness-[0.98] shadow-[0_22px_40px_-28px_rgba(0,0,0,0.95)] lg:hidden"
            />
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#c3d2c7] sm:text-base lg:text-lg">
              SurvivorQuest łączy panel admina i aplikację mobilną w jeden system operacyjny dla eventów. Tworzysz
              scenariusze, zarządzasz stacjami, śledzisz postęp zespołów i masz pełny podgląd punktacji bez przełączania
              narzędzi.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {TRUST_METRICS.map((metric) => (
                <article
                  key={metric.label}
                  className="sq-card-lift rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/74 p-4"
                >
                  <p className="text-xl font-semibold text-[#f3f5ef]">{metric.value}</p>
                  <p className="mt-1 text-xs text-[#98ad9c]">{metric.label}</p>
                </article>
              ))}
            </div>

            <div className="h-6 sm:h-0" aria-hidden />

            <div className="flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center">
              <Link
                href={demoHref}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#e9c986] px-5 py-3 text-sm font-semibold text-[#13231b] shadow-[0_16px_30px_-24px_rgba(240,201,119,0.9)] transition hover:-translate-y-0.5 hover:bg-[#f2d79f] sm:w-auto"
              >
                Zobacz demo aplikacji
              </Link>
              <Link
                href={quoteHref}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[#4b6658]/55 bg-[#15231d]/66 px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:-translate-y-0.5 hover:border-[#e9c986]/45 hover:text-[#f0d9a7] sm:w-auto"
              >
                Kontakt i wdrożenie
              </Link>
            </div>
          </article>

          <Image
            src="/hero-visual.png"
            alt="Uczestnicy gry terenowej korzystają z tabletu z aplikacją SurvivorQuest w lesie."
            width={1536}
            height={1024}
            priority
            className="relative z-10 hidden h-[44vh] min-h-[280px] w-full object-cover brightness-[0.98] sm:h-full sm:rounded-3xl sm:border sm:border-[#4b6658]/55 sm:shadow-[0_30px_60px_-40px_rgba(0,0,0,0.95)] lg:block lg:h-full"
          />
        </section>

        <section className="sq-section mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-6">
          <SectionHeading
            eyebrow="Zaufanie klientów"
            title="Zaufali nam"
            description="Współpracujemy z firmami, które stawiają na sprawną i angażującą realizację eventów."
          />
          <ul className="mx-auto mt-6 grid w-full max-w-xl gap-3">
            {TRUST_CLIENTS.map((client) => (
              <li
                key={client.name}
                className="sq-card-lift flex items-center justify-center rounded-xl bg-[#16261f]/78 px-4 py-8"
              >
                {client.logoSrc ? (
                  <Image src={client.logoSrc} alt={client.logoAlt} width={420} height={140} className="h-28 w-auto max-w-full object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-[#f3f5ef]">{client.name}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="funkcje" className="sq-section scroll-mt-28 mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8">
          <SectionHeading
            eyebrow="Funkcje platformy"
            title="Najważniejsze moduły SurvivorQuest"
            description="Panel admina, aplikacja mobilna i narzędzia koordynatora pracują na wspólnych danych w czasie rzeczywistym."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <article key={benefit.title} className="sq-card-lift rounded-2xl border border-[#4b6658]/50 bg-[#16261f]/78 p-5">
                <h3 className="text-base font-semibold text-[#f3f5ef]">{benefit.title}</h3>
                <p className="mt-3 text-sm text-[#bdcdbf]">{benefit.description}</p>
                <ul className="mt-4 space-y-2">
                  {benefit.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm text-[#98ad9c]">
                      <span className="mt-1 size-1.5 rounded-full bg-[#f0c977]" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="materialy" className="sq-section scroll-mt-28 mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8">
          <SectionHeading
            eyebrow="Materiały i widoki"
            title="Miejsce na zdjęcia z realizacji oraz zrzuty ekranu aplikacji."
            description="Te bloki możesz wypełnić materiałami, które pokazują zarówno atmosferę eventu, jak i działanie produktu."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {REALIZATION_PHOTO_SPOTS.map((spot) => (
              <PhotoSlotCard key={spot.title} title={spot.title} description={spot.description} badge={spot.badge} />
            ))}
          </div>
        </section>

        <section id="przeplyw" className="sq-section scroll-mt-28 mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8">
          <SectionHeading
            eyebrow="Przepływ pracy w aplikacji"
            title="Od konfiguracji scenariusza do podsumowania realizacji."
            description="Najpierw konfigurujesz event w panelu, potem zespoły grają w mobile, a koordynator śledzi całość live."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {PROCESS_STEPS.map((step) => (
              <article key={step.title} className="sq-card-lift rounded-2xl border border-[#4b6658]/50 bg-[#16261f]/78 p-5">
                <h3 className="text-base font-semibold text-[#f3f5ef]">{step.title}</h3>
                <p className="mt-3 text-sm text-[#bdcdbf]">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

      <section id="scenariusze" className="sq-section scroll-mt-28 mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8">
        <SectionHeading
          eyebrow="Scenariusze użycia"
          title="Przykłady jak platforma działa podczas eventu."
          description="Sekcja do pokazania konkretnych przepływów pracy i ekranów dla różnych typów realizacji."
        />
        <div className="mt-6 grid gap-5">
          {CASE_STUDIES.map((caseStudy) => (
            <article key={caseStudy.title} className="sq-card-lift rounded-2xl border border-[#4b6658]/50 bg-[#16261f]/78 p-5">
              <h3 className="text-lg font-semibold text-[#f3f5ef]">{caseStudy.title}</h3>
              <p className="mt-3 text-sm text-[#bdcdbf]">
                <span className="font-medium text-[#f3f5ef]">Wyzwanie:</span> {caseStudy.challenge}
              </p>
              <p className="mt-2 text-sm text-[#bdcdbf]">
                <span className="font-medium text-[#f3f5ef]">Efekt:</span> {caseStudy.outcome}
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {caseStudy.photos.map((photo) => (
                  <li
                    key={photo}
                    className="sq-card-lift rounded-xl border border-dashed border-[#4b6658]/52 bg-[#12211a]/78 p-4 text-xs text-[#98ad9c]"
                  >
                    {photo}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="sq-section scroll-mt-28 mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/70 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Najczęstsze pytania o funkcje platformy."
          description="Szybkie odpowiedzi dla zespołów, które chcą wdrożyć SurvivorQuest."
        />
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group sq-card-lift rounded-2xl border border-[#4b6658]/50 bg-[#16261f]/78 p-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-[#f3f5ef] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-[#4b6658]/55 text-[#9fb1a4] transition-transform duration-500 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="grid grid-rows-[0fr] transition-all duration-500 ease-out group-open:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="mt-3 text-sm text-[#bdcdbf]">{item.answer}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section
        id="kontakt"
        className="sq-section scroll-mt-28 relative mx-2 grid gap-6 overflow-hidden rounded-2xl border border-[#4b6658]/50 bg-[#16261f]/82 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:p-10"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.24),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_45%)]" />
        <article className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e9c986]">Zobacz platformę w praktyce</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">
            Sprawdź, jak działa SurvivorQuest od strony panelu admina i aplikacji mobilnej.
          </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#c3d2c7] sm:text-base">
            Pokażemy Ci realny przepływ: konfiguracja scenariusza, praca zespołów w terenie i monitoring realizacji na
            żywo.
          </p>
          <div className="mt-6 mb-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={demoHref}
                className="inline-flex items-center justify-center rounded-xl bg-[#e9c986] px-5 py-3 text-sm font-semibold text-[#13231b] shadow-[0_16px_30px_-24px_rgba(240,201,119,0.9)] transition hover:-translate-y-0.5 hover:bg-[#f2d79f]"
            >
              Zobacz demo aplikacji
            </Link>
            <Link
              href={quoteHref}
                className="inline-flex items-center justify-center rounded-xl border border-[#4b6658]/55 bg-[#15231d]/66 px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:-translate-y-0.5 hover:border-[#e9c986]/45 hover:text-[#f0d9a7]"
            >
              Kontakt i wdrożenie
            </Link>
          </div>
        </article>
        <aside className="relative sq-card-lift rounded-2xl border border-[#4b6658]/52 bg-[#12211a]/80 p-5 text-sm text-[#bdcdbf]">
          <header className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Logo SurvivorQuest"
              width={32}
              height={32}
              className="size-8 rounded-lg border border-[#446251]/75 bg-[#162921]"
            />
            <div>
              <p className="font-semibold text-[#f3f5ef]">SurvivorQuest</p>
              <p className="text-xs text-[#98ad9c]">Panel + aplikacja mobilna</p>
            </div>
          </header>
          <p className="mt-4 font-semibold text-[#f3f5ef]">Kontakt bezpośredni</p>
          <p className="mt-3">
            Email:{" "}
            <Link href={`mailto:${contactEmail}`} className="text-[#f0c977] underline-offset-4 hover:underline">
              {contactEmail}
            </Link>
          </p>
          <p className="mt-2">
            Telefon:{" "}
            <Link href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="text-[#f0c977] underline-offset-4 hover:underline">
              {contactPhone}
            </Link>
          </p>
          <p className="mt-4 text-xs text-[#98ad9c]">Odpowiadamy zwykle w ten sam dzień roboczy.</p>
        </aside>
      </section>

      <footer className="sq-section mx-2 rounded-2xl border border-[#4b6658]/45 bg-[#12211a]/68 p-4 sm:mx-0 sm:rounded-3xl sm:border sm:p-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
        </section>
      </footer>
      </main>
    </>
  );
}
