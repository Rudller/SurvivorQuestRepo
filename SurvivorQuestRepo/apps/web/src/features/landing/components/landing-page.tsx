import Image from "next/image";
import Link from "next/link";
import {
  CASE_STUDIES,
  EVENT_FORMATS,
  FAQ_ITEMS,
  PROCESS_STEPS,
  TRUST_CLIENTS,
  WHY_APP,
} from "@/features/landing/model/content";
import type { HeroSlide } from "@/features/landing/lib/hero-slides";
import { withQuoteSubject } from "@/features/landing/lib/quote-href";
import { HeroCarousel } from "./hero-carousel";
import { LandingNav } from "./landing-nav";
import { LandingHeaderVisibilityController } from "./landing-header-visibility-controller";
import { SectionHeading } from "./section-heading";
import { Wordmark } from "@/components/wordmark";

type LandingPageProps = {
  heroSlides: readonly HeroSlide[];
  /** Quote link without a subject — the hero and the contact section each append their own. */
  quoteHrefBase: string;
  contactEmail: string;
  contactPhone: string;
};

const LANDING_NAV_ITEMS = [
  { href: "#formaty", label: "Formaty" },
  { href: "#dlaczego", label: "Dlaczego my" },
  { href: "#jak-pracujemy", label: "Jak pracujemy" },
  { href: "#realizacje", label: "Realizacje" },
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
const SECTION_BASE = "sq-section scroll-mt-22 py-14 sm:py-20 lg:py-24";
const TONE_A = `${SECTION_BASE} bg-obsidian`;
const TONE_B = `${SECTION_BASE} bg-ink`;

/** Every section pulls its content back into the same centred column. */
const SECTION_INNER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export function LandingPage({
  heroSlides,
  quoteHrefBase,
  contactEmail,
  contactPhone,
}: LandingPageProps) {
  const currentYear = new Date().getFullYear();
  const quoteHref = withQuoteSubject(quoteHrefBase, "Wycena eventu SurvivorQuest");

  return (
    <>
      <LandingHeaderVisibilityController />
      <header
        id="landing-top-bar"
        className="sticky top-0 z-30 w-full bg-obsidian/92 backdrop-blur-xl transition-transform duration-300 supports-[backdrop-filter]:bg-obsidian/78"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo-sq.png" alt="Logo SurvivorQuest" width={40} height={40} className="size-10" />
            <div>
              <p className="text-[11px] font-medium">
                <Wordmark />
              </p>
              <p className="text-xs text-ivory-muted">Interaktywne gry dla firm</p>
            </div>
          </div>

          <LandingNav items={LANDING_NAV_ITEMS} />
        </div>
      </header>

      <main className="flex w-full flex-col">
        <HeroCarousel slides={heroSlides} innerClassName={SECTION_INNER} quoteHrefBase={quoteHrefBase} />

        <section id="formaty" className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Co organizujemy"
              title="Trzy formaty, jeden zespół, który prowadzi wszystko od A do Z."
              description="Każdy format przygotowujemy pod Waszą grupę, miejsce i okazję. Można je łączyć — gra w dzień, Ryzykanci wieczorem."
            />
            <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {EVENT_FORMATS.map((format) => (
                <article key={format.id} id={format.id} className="scroll-mt-22">
                  <h3 className="text-lg font-semibold text-ivory">{format.title}</h3>
                  <p className="mt-2 text-sm font-medium text-amber-soft">{format.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{format.description}</p>
                  <ul className="mt-4 space-y-2.5">
                    {format.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ivory-faint">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="dlaczego" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Dlaczego event w aplikacji"
              title="Własna aplikacja zmienia integrację w rozgrywkę, której nikt nie odpuszcza."
              description="Nie sprzedajemy narzędzia — prowadzimy w nim eventy. Dzięki temu gra jest szybsza, uczciwsza i wygląda lepiej niż karta z pieczątkami."
            />
            <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-8">
              {WHY_APP.map((reason) => (
                <article key={reason.title}>
                  <h3 className="text-lg font-semibold text-ivory">{reason.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{reason.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="jak-pracujemy" className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Jak pracujemy"
              title="Od pierwszej rozmowy do ogłoszenia zwycięzców."
              description="Wasz udział kończy się na briefie i liście uczestników. Resztę — scenariusz, sprzęt, prowadzenie — bierzemy na siebie."
            />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PROCESS_STEPS.map((step) => (
                <article key={step.title}>
                  <h3 className="text-lg font-semibold text-ivory">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="realizacje" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Realizacje"
              title="Jak to wyglądało u innych."
              description="Dwa przykłady eventów, które prowadziliśmy — z tym, czego potrzebował klient, i tym, co z tego wyszło."
            />
            <div className="mt-10 grid gap-10">
              {CASE_STUDIES.map((caseStudy) => (
                <article key={caseStudy.title}>
                  <h3 className="text-lg font-semibold text-ivory sm:text-xl">{caseStudy.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">
                    <span className="font-medium text-ivory">Potrzeba:</span> {caseStudy.challenge}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ivory-muted">
                    <span className="font-medium text-ivory">Efekt:</span> {caseStudy.outcome}
                  </p>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                    {caseStudy.photos.map((photo) => (
                      <li
                        key={photo}
                        className="rounded-xl bg-graphite px-4 py-5 text-xs leading-relaxed text-ivory-faint"
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

        <section className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Zaufanie klientów"
              title="Zaufali nam"
              description="Organizujemy integracje dla firm, które chcą czegoś więcej niż kolacji i prezentacji."
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
                    <span className="text-sm font-semibold text-ivory">{client.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className={TONE_A}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="FAQ"
              title="Najczęstsze pytania przed zamówieniem eventu."
              description="Krótkie odpowiedzi na to, o co pytają osoby organizujące integrację w firmie."
            />
            <div className="mt-10 max-w-3xl space-y-7">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-ivory sm:text-base [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center text-lg text-ivory-faint transition-transform duration-300 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-open:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{item.answer}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="kontakt" className={`${TONE_B} relative overflow-hidden`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,166,35,0.2),transparent_50%)]" />
          <div className={`relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center ${SECTION_INNER}`}>
            <article>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft">
                Zaplanuj event z nami
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-ivory sm:text-4xl">
                Podaj liczbę osób, termin i miejsce — wrócimy z propozycją formatu i wyceną.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory-muted sm:text-base">
                Doradzimy, czy lepsza będzie gra w terenie, w obiekcie czy Ryzykanci na wieczór, i przygotujemy
                scenariusz pod Waszą firmę.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={quoteHref}
                  className="inline-flex items-center justify-center rounded-xl bg-amber px-5 py-3 text-sm font-semibold text-obsidian transition hover:-translate-y-0.5 hover:bg-amber-soft active:translate-y-0 active:bg-amber-deep"
                >
                  Zapytaj o wycenę
                </Link>
                <Link
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center justify-center rounded-xl bg-graphite px-5 py-3 text-sm font-semibold text-ivory transition hover:-translate-y-0.5 hover:bg-graphite-hi hover:text-amber-soft"
                >
                  Zadzwoń
                </Link>
              </div>
            </article>

            <aside className="relative rounded-2xl bg-ink p-6 text-sm text-ivory-muted">
              <header className="flex items-center gap-3">
                <Image
                  src="/logo-sq.png"
                  alt="Logo SurvivorQuest"
                  width={32}
                  height={32}
                  className="size-8"
                />
                <div>
                  <p className="font-semibold">
                    <Wordmark />
                  </p>
                  <p className="text-xs text-ivory-faint">Organizacja eventów firmowych</p>
                </div>
              </header>
              <p className="mt-5 font-semibold text-ivory">Kontakt bezpośredni</p>
              <p className="mt-3">
                Email:{" "}
                <Link href={`mailto:${contactEmail}`} className="text-amber underline-offset-4 hover:underline">
                  {contactEmail}
                </Link>
              </p>
              <p className="mt-2">
                Telefon:{" "}
                <Link
                  href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                  className="text-amber underline-offset-4 hover:underline"
                >
                  {contactPhone}
                </Link>
              </p>
              <p className="mt-5 text-xs text-ivory-faint">Odpowiadamy zwykle w ten sam dzień roboczy.</p>
            </aside>
          </div>
        </section>

        <footer className="sq-section bg-ink py-10 sm:py-12">
          <div className={`flex flex-col gap-6 md:flex-row md:items-start md:justify-between ${SECTION_INNER}`}>
            <section className="space-y-2">
              <p className="text-sm font-semibold">
                <Wordmark />
              </p>
              <p className="text-xs text-ivory-faint">Interaktywne gry dla firm</p>
              <p className="text-xs text-ivory-faint">© {currentYear} SurvivorQuest. Wszelkie prawa zastrzeżone.</p>
            </section>

            <section className="grid gap-1 text-sm">
              <Link href={`mailto:${contactEmail}`} className="text-amber underline-offset-4 hover:underline">
                {contactEmail}
              </Link>
              <Link
                href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                className="text-amber underline-offset-4 hover:underline"
              >
                {contactPhone}
              </Link>
            </section>

            <nav aria-label="Linki stopki" className="grid gap-1 text-sm text-ivory-muted">
              <Link href="/polityka-prywatnosci" className="underline-offset-4 hover:text-amber hover:underline">
                Polityka prywatności
              </Link>
              <Link href="/polityka-cookies" className="underline-offset-4 hover:text-amber hover:underline">
                Polityka cookies
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
