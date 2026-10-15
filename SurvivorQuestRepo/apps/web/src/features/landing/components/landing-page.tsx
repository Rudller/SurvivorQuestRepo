import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  CUSTOM_TECH,
  EVENT_FORMATS,
  FAQ_ITEMS,
  PROCESS_STEPS,
  TRUST_CLIENTS,
  WHY_APP,
} from "@/features/landing/model/content";
import type { HeroSlide } from "@/features/landing/lib/hero-slides";
import { withQuoteSubject } from "@/features/landing/lib/quote-href";
import { FormatShowcase } from "./format-showcase";
import { HeroCarousel } from "./hero-carousel";
import { LineIcon } from "./line-icon";
import { RevealOnView } from "./reveal-on-view";
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
  /** Panel admina — bezwzględny w dev, względny na produkcji. */
  adminHref: string;
};

const LANDING_NAV_ITEMS = [
  { href: "#formaty", label: "Formaty" },
  { href: "#dlaczego", label: "Dlaczego my" },
  { href: "#jak-pracujemy", label: "Jak pracujemy" },
  { href: "#technologia", label: "Technologia" },
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
  adminHref,
}: LandingPageProps) {
  const currentYear = new Date().getFullYear();
  const quoteHref = withQuoteSubject(quoteHrefBase, "Wycena eventu SurvivorQuest");
  const ideaHref = withQuoteSubject(quoteHrefBase, "Pomysł na technologię eventową");

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
              title="Gry hotelowe, gry terenowe i Ryzykanci — każdą prowadzimy od A do Z."
              description="Każdą grę przygotowujemy pod Waszą grupę, miejsce i okazję."
            />
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ivory-muted sm:text-base">
              Wszystkie prowadzimy w tej samej autorskiej aplikacji i tak samo od strony organizacyjnej: przyjeżdżamy z
              tabletami i prowadzącymi, rozstawiamy grę i zabieramy sprzęt po finale. Różni je miejsce i rytm — event
              integracyjny w terenie rządzi się czym innym niż impreza integracyjna wieczorem w sali po konferencji,
              więc grę dobieramy do tego, ile macie czasu i gdzie jesteście.
            </p>
            <FormatShowcase formats={EVENT_FORMATS} />
          </div>
        </section>

        <section id="dlaczego" className={TONE_A}>
          <RevealOnView className={`relative ${SECTION_INNER}`}>
            {/* Out of the flow on purpose: it sits beside the heading and never pushes the reasons down. */}
            <div
              data-reveal-photo="right"
              className="absolute right-4 top-0 hidden aspect-[4/5] w-36 overflow-hidden rounded-2xl bg-graphite sm:right-6 lg:right-8 lg:block"
            >
              <Image
                src="/sekcje/dlaczego-aplikacja.jpg"
                alt="Uśmiechnięty mężczyzna na pomarańczowej kanapie pokazuje tablet z ekranem gry SurvivorQuest."
                fill
                sizes="144px"
                className="object-cover object-[50%_45%]"
              />
            </div>
            <SectionHeading
              eyebrow="Dlaczego event w aplikacji"
              title="Własna aplikacja zmienia integrację w rozgrywkę, której nikt nie odpuszcza."
              description="Nie sprzedajemy narzędzia — prowadzimy w nim eventy. Dzięki temu gra jest szybsza, uczciwsza i wygląda lepiej niż karta z pieczątkami."
            />
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:gap-8">
              {WHY_APP.map((reason, index) => (
                <article key={reason.title} data-reveal-item style={{ "--i": index } as CSSProperties}>
                  <h3 className="text-lg font-semibold text-ivory">{reason.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{reason.description}</p>
                </article>
              ))}
            </div>
          </RevealOnView>
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
                <article key={step.title} className="flex flex-col">
                  <h3 className="text-lg font-semibold text-ivory">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{step.description}</p>
                  {/* mt-auto lines the icons up in one row however long each description runs. */}
                  <div className="mt-auto flex justify-center pt-8">
                    <LineIcon name={step.icon} className="size-20 text-amber" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="technologia" className={`${TONE_A} relative overflow-hidden`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,166,35,0.14),transparent_45%)]" />
          <RevealOnView className={`relative ${SECTION_INNER}`}>
            <SectionHeading
              eyebrow="Technologia na eventy"
              title="Masz pomysł, którego nie da się kupić z półki? Zbudujemy go."
              description="Poza naszymi grami tworzymy technologię od zera — aplikacje, systemy webowe i urządzenia, które robią na evencie coś, czego nie robi nikt inny."
            />
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {CUSTOM_TECH.map((item, index) => (
                <li
                  key={item.title}
                  data-reveal-item
                  style={{ "--i": index } as CSSProperties}
                  className="rounded-2xl border border-line/70 bg-graphite/60 p-6"
                >
                  <LineIcon name={item.icon} className="size-12 text-amber" />
                  <h3 className="mt-5 text-lg font-semibold text-ivory">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory-muted">{item.description}</p>
                </li>
              ))}
            </ul>
            <div
              data-reveal-item
              style={{ "--i": CUSTOM_TECH.length } as CSSProperties}
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="max-w-xl text-sm leading-relaxed text-ivory-muted sm:text-base">
                Opisz pomysł w kilku zdaniach — odpowiemy, czy i jak da się go zbudować, i ile to potrwa.
              </p>
              <Link
                href={ideaHref}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber px-5 py-3 text-sm font-semibold text-obsidian transition hover:-translate-y-0.5 hover:bg-amber-soft active:translate-y-0 active:bg-amber-deep"
              >
                Napisz, co wymyśliliście
              </Link>
            </div>
          </RevealOnView>
        </section>

        <section className={TONE_B}>
          <div className={SECTION_INNER}>
            <SectionHeading
              eyebrow="Dla kogo pracujemy"
              title="Firmy, które chciały czegoś więcej niż kolacji i prezentacji."
              description="Pracujemy z zespołami, dla których integracja ma zostać w głowach dłużej niż do poniedziałku — od kilkunastoosobowych działów po całe firmy na wyjeździe."
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
                  {/*
                    The question is a real h3, not a styled span: it reads as a
                    heading, so it should be one. `summary` accepts flow content,
                    and the typography classes moved across unchanged.
                  */}
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-sm font-semibold text-ivory sm:text-base">{item.question}</h3>
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
                scenariusz pod Waszą firmę. Aplikacja, tablety i prowadzący są nasi — po Waszej stronie zostaje
                termin i lista uczestników.
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
              <Link href={adminHref} className="mt-2 underline-offset-4 hover:text-amber hover:underline">
                Panel admina
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </>
  );
}
