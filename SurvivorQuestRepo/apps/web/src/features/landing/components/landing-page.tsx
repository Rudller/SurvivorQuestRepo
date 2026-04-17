import Image from "next/image";
import Link from "next/link";
import {
  BENEFITS,
  CASE_STUDIES,
  FAQ_ITEMS,
  PROCESS_STEPS,
  REALIZATION_PHOTO_SPOTS,
  TRUST_LOGO_SLOTS,
  TRUST_METRICS,
} from "@/features/landing/model/content";
import { PhotoSlotCard } from "./photo-slot-card";
import { SectionHeading } from "./section-heading";

type LandingPageProps = {
  adminPanelHref: string;
  demoHref: string;
  quoteHref: string;
  contactEmail: string;
  contactPhone: string;
};

export function LandingPage({ adminPanelHref, demoHref, quoteHref, contactEmail, contactPhone }: LandingPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 lg:gap-12 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="Logo SurvivorQuest"
            width={40}
            height={40}
            className="size-10 rounded-xl border border-[#446251]/70"
          />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#98ad9c]">SurvivorQuest</p>
            <p className="text-xs text-[#bdcdbf]">Platforma eventowa: panel admina + aplikacja mobilna</p>
          </div>
        </div>
        <Link
          href={adminPanelHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#446251] bg-[#12221b]/80 px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977] sm:w-auto"
        >
          Panel admina
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-[#446251]/75 bg-[#162921]/90 p-6 shadow-[0_0_0_1px_rgba(68,98,81,0.2),0_40px_90px_-50px_rgba(0,0,0,0.95)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.28),transparent_46%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_48%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">Platforma eventowa</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-5xl">
              Aplikacja do prowadzenia gry terenowej, zarządzania zespołami i monitorowania realizacji na żywo.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#bdcdbf] sm:text-base lg:text-lg">
              SurvivorQuest łączy panel admina i aplikację mobilną w jeden system operacyjny dla eventów. Tworzysz
              scenariusze, zarządzasz stacjami, śledzisz postęp zespołów i masz pełny podgląd punktacji bez przełączania
              narzędzi.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={demoHref}
                className="inline-flex items-center justify-center rounded-xl bg-[#f0c977] px-5 py-3 text-sm font-semibold text-[#13231b] transition hover:bg-[#ffd98d]"
              >
                Zobacz demo aplikacji
              </Link>
              <Link
                href={quoteHref}
                className="inline-flex items-center justify-center rounded-xl border border-[#446251] bg-[#12221b]/85 px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977]"
              >
                Kontakt i wdrożenie
              </Link>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {TRUST_METRICS.map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-[#446251]/65 bg-[#12221b]/85 p-4">
                  <p className="text-xl font-semibold text-[#f3f5ef]">{metric.value}</p>
                  <p className="mt-1 text-xs text-[#98ad9c]">{metric.label}</p>
                </article>
              ))}
            </div>
          </div>

          <PhotoSlotCard
            title="Hero visual: event w akcji"
            description="Mocny, emocjonalny kadr zespołu podczas realizacji. To główne zdjęcie sprzedażowe nad foldem."
            badge="Miejsce na zdjęcie 4:3"
            className="h-full"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-5 sm:p-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#98ad9c]">
          Miejsca na social proof
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {TRUST_LOGO_SLOTS.map((logoSlot, index) => (
            <div
              key={`${logoSlot}-${index}`}
              className="rounded-xl border border-dashed border-[#446251]/75 bg-[#162921]/90 px-3 py-4 text-center text-xs text-[#bdcdbf]"
            >
              {logoSlot}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Funkcje platformy"
          title="Najważniejsze moduły SurvivorQuest"
          description="Panel admina, aplikacja mobilna i narzędzia koordynatora pracują na wspólnych danych w czasie rzeczywistym."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="rounded-2xl border border-[#446251]/70 bg-[#162921]/85 p-5">
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

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-6 sm:p-8">
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

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Przepływ pracy w aplikacji"
          title="Od konfiguracji scenariusza do podsumowania realizacji."
          description="Najpierw konfigurujesz event w panelu, potem zespoły grają w mobile, a koordynator śledzi całość live."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {PROCESS_STEPS.map((step) => (
            <article key={step.title} className="rounded-2xl border border-[#446251]/70 bg-[#162921]/85 p-5">
              <h3 className="text-base font-semibold text-[#f3f5ef]">{step.title}</h3>
              <p className="mt-3 text-sm text-[#bdcdbf]">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Scenariusze użycia"
          title="Przykłady jak platforma działa podczas eventu."
          description="Sekcja do pokazania konkretnych przepływów pracy i ekranów dla różnych typów realizacji."
        />
        <div className="mt-6 grid gap-5">
          {CASE_STUDIES.map((caseStudy) => (
            <article key={caseStudy.title} className="rounded-2xl border border-[#446251]/70 bg-[#162921]/85 p-5">
              <h3 className="text-lg font-semibold text-[#f3f5ef]">{caseStudy.title}</h3>
              <p className="mt-3 text-sm text-[#bdcdbf]">
                <span className="font-medium text-[#f3f5ef]">Wyzwanie:</span> {caseStudy.challenge}
              </p>
              <p className="mt-2 text-sm text-[#bdcdbf]">
                <span className="font-medium text-[#f3f5ef]">Efekt:</span> {caseStudy.outcome}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {caseStudy.photos.map((photo) => (
                  <div
                    key={photo}
                    className="rounded-xl border border-dashed border-[#446251]/75 bg-[#12221b]/90 p-4 text-xs text-[#98ad9c]"
                  >
                    {photo}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#446251]/65 bg-[#12221b]/80 p-6 sm:p-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Najczęstsze pytania o funkcje platformy."
          description="Szybkie odpowiedzi dla zespołów, które chcą wdrożyć SurvivorQuest."
        />
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="rounded-2xl border border-[#446251]/70 bg-[#162921]/85 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#f3f5ef]">{item.question}</summary>
              <p className="mt-3 text-sm text-[#bdcdbf]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-[#446251]/80 bg-[#162921]/90 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,201,119,0.24),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_45%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">Zobacz platformę w praktyce</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">
              Sprawdź, jak działa SurvivorQuest od strony panelu admina i aplikacji mobilnej.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#bdcdbf] sm:text-base">
              Pokażemy Ci realny przepływ: konfiguracja scenariusza, praca zespołów w terenie i monitoring realizacji na
              żywo.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={demoHref}
                className="inline-flex items-center justify-center rounded-xl bg-[#f0c977] px-5 py-3 text-sm font-semibold text-[#13231b] transition hover:bg-[#ffd98d]"
              >
                Zobacz demo aplikacji
              </Link>
              <Link
                href={quoteHref}
                className="inline-flex items-center justify-center rounded-xl border border-[#446251] bg-[#12221b]/85 px-5 py-3 text-sm font-semibold text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977]"
              >
                Kontakt i wdrożenie
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-[#446251]/70 bg-[#12221b]/90 p-5 text-sm text-[#bdcdbf]">
            <div className="flex items-center gap-3">
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
            </div>
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
          </div>
        </div>
      </section>
    </main>
  );
}
