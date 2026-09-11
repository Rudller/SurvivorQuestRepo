"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { HeroSlide } from "@/features/landing/lib/hero-slides";
import { withQuoteSubject } from "@/features/landing/lib/quote-href";

const ADVANCE_INTERVAL_MS = 10_000;

type HeroCarouselProps = {
  slides: readonly HeroSlide[];
  /** The landing's shared centred-column class, passed in so the hero stays aligned with every other section. */
  innerClassName: string;
  /** Quote link without a subject; each slide appends its own (see `withQuoteSubject`). */
  quoteHrefBase: string;
};

/**
 * Full-bleed photo carousel that swaps the whole hero — photo, copy, figures
 * and buttons — one slide per thing we sell.
 *
 * The picker sits at the bottom edge of the hero as a row of named pills
 * rather than dots: the names alone are a summary of the offer. The active
 * pill fills from left to right and that fill *is* the clock: the slide
 * advances when the fill animation ends, so pausing the animation pauses the
 * carousel and the two can never drift apart. Reduced motion drops the fill,
 * and with it the auto-advance — the pills still work by hand.
 *
 * The quote button lives on that same bottom bar, outside the swapping block:
 * it is the one thing every slide asks for, so it stays put instead of fading
 * in four times over. Only its mail subject follows the active slide.
 *
 * Two scrims, not one: a left-to-right wash on wide screens keeps the right of
 * the frame (where the people usually are) readable, but on a phone the copy
 * spans the full width, so there the wash has to run bottom-to-top instead.
 */
export function HeroCarousel({ slides, innerClassName, quoteHrefBase }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const isAnimated = slides.length > 1 && !prefersReducedMotion;

  const advance = () => setActiveIndex((current) => (current + 1) % slides.length);

  return (
    <section
      className="sq-section relative isolate overflow-hidden bg-obsidian"
      aria-roledescription={slides.length > 1 ? "karuzela" : undefined}
      aria-label={slides.length > 1 ? "Formaty eventów" : undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="absolute inset-0 -z-20">
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            className={`absolute inset-0 ${prefersReducedMotion ? "" : "transition-opacity duration-1000 ease-out"}`}
            style={{ opacity: index === activeIndex ? 1 : 0 }}
            aria-hidden={index !== activeIndex}
            {...(slides.length > 1 ? { role: "group", "aria-roledescription": "slajd" } : {})}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority={index === 0}
              className="object-cover object-center"
            />
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,#111419_2%,rgba(17,20,25,0.9)_44%,rgba(17,20,25,0.66)_100%)] md:bg-[linear-gradient(100deg,#111419_0%,rgba(17,20,25,0.95)_44%,rgba(17,20,25,0.72)_64%,rgba(17,20,25,0.34)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(245,166,35,0.2),transparent_46%)]"
      />

      <div
        className={`relative flex min-h-[34rem] flex-col py-14 sm:min-h-[38rem] sm:py-20 lg:min-h-[44rem] lg:py-24 ${innerClassName}`}
      >
        {/*
          Every slide's block is laid out in the same grid cell, so the hero is
          always as tall as the longest slide and does not jump when a wordy one
          gives way to a short one. Only the active block is visible; gaining the
          animation class on activation is what replays the fade.
        */}
        <div className="grid max-w-2xl flex-1 items-center">
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            const Heading = isActive ? "h1" : "p";

            return (
              <article
                key={slide.src}
                aria-hidden={!isActive}
                className={`col-start-1 row-start-1 ${isActive ? (prefersReducedMotion ? "" : "sq-hero-copy") : "invisible"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft">{slide.eyebrow}</p>
                <Heading className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ivory sm:text-5xl">
                  {slide.title}
                </Heading>
                <p className="mt-6 text-sm leading-relaxed text-ivory-muted sm:text-base lg:text-lg">{slide.lead}</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {slide.highlights.map((highlight) => (
                    <div key={highlight.label}>
                      <p className="text-2xl font-semibold leading-tight text-ivory">{highlight.value}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ivory-faint">{highlight.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link
                    href={slide.secondaryCta.href}
                    tabIndex={isActive ? undefined : -1}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-graphite px-5 py-3 text-sm font-semibold text-ivory transition hover:-translate-y-0.5 hover:bg-graphite-hi hover:text-amber-soft sm:w-auto"
                  >
                    {slide.secondaryCta.label}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {slides.length > 1 ? (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Wybierz format">
              {slides.map((slide, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={slide.src}
                    type="button"
                    role="tab"
                    onClick={() => setActiveIndex(index)}
                    aria-selected={isActive}
                    className={`relative overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
                      isActive
                        ? "bg-amber-deep/60 text-obsidian"
                        : "bg-ivory/10 text-ivory-muted hover:bg-ivory/20 hover:text-ivory"
                    }`}
                  >
                    {isActive && isAnimated ? (
                      <span
                        key={activeIndex}
                        aria-hidden
                        data-paused={isPaused ? "" : undefined}
                        onAnimationEnd={advance}
                        className="sq-pill-fill absolute inset-0 origin-left bg-amber"
                        style={{ "--sq-advance-ms": `${ADVANCE_INTERVAL_MS}ms` } as CSSProperties}
                      />
                    ) : null}
                    <span className="relative">{slide.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <Link
            href={withQuoteSubject(quoteHrefBase, slides[activeIndex].quoteSubject)}
            className="inline-flex w-full items-center justify-center rounded-xl bg-amber px-5 py-3 text-sm font-semibold text-obsidian transition hover:-translate-y-0.5 hover:bg-amber-soft active:translate-y-0 active:bg-amber-deep sm:w-auto sm:shrink-0"
          >
            Zapytaj o wycenę eventu
          </Link>
        </div>
      </div>
    </section>
  );
}
