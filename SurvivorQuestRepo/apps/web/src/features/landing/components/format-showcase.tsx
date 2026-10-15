import Image from "next/image";
import type { CSSProperties } from "react";
import type { EventFormat, EventGame } from "@/features/landing/model/content";
import { RevealOnView } from "./reveal-on-view";
import { SnowOverlay } from "./snow-overlay";

type FormatShowcaseProps = {
  formats: readonly EventFormat[];
};

/** Stagger index for one line of copy inside a revealed block. */
function revealOrder(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}

/**
 * Categories, each followed by one row per game. Rows alternate copy|photo and
 * photo|copy across the whole section — not restarting per category — so the
 * zig-zag never puts two photos on the same side in a row.
 */
export function FormatShowcase({ formats }: FormatShowcaseProps) {
  /* Index of each category's first row within the whole section. */
  const firstRowIndex = formats.map((_, index) =>
    formats.slice(0, index).reduce((count, format) => count + format.games.length, 0),
  );

  return (
    <div className="mt-14 space-y-20 sm:space-y-24">
      {formats.map((format, formatIndex) => (
        <div key={format.id}>
          <RevealOnView id={format.id} className="relative scroll-mt-32 sm:scroll-mt-36">
            <span
              aria-hidden
              className="sq-reveal-number pointer-events-none absolute -top-8 left-0 select-none text-[5.5rem] font-bold leading-none tracking-tighter text-transparent sm:-top-12 sm:text-[8rem]"
            >
              {String(formatIndex + 1).padStart(2, "0")}
            </span>
            <header className="relative max-w-2xl pt-8 sm:pt-12">
              <h3
                data-reveal-item
                style={revealOrder(0)}
                className="text-2xl font-semibold tracking-tight text-ivory sm:text-3xl"
              >
                {format.title}
              </h3>
              <p data-reveal-item style={revealOrder(1)} className="mt-3 text-sm leading-relaxed text-ivory-muted sm:text-base">
                {format.tagline}
              </p>
            </header>
          </RevealOnView>

          <div className="mt-10 space-y-14 sm:space-y-20">
            {format.games.map((game, gameIndex) => (
              <GameRow key={game.id} game={game} photoOnLeft={(firstRowIndex[formatIndex] + gameIndex) % 2 === 1} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type GameRowProps = {
  game: EventGame;
  photoOnLeft: boolean;
};

function GameRow({ game, photoOnLeft }: GameRowProps) {
  return (
    <RevealOnView id={game.id} className="group scroll-mt-22">
      <article className="grid items-center gap-7 md:grid-cols-12 md:gap-8 lg:gap-12">
        <div
          data-reveal-photo={photoOnLeft ? "left" : "right"}
          className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-graphite md:col-span-6 lg:col-span-7 ${
            photoOnLeft ? "md:order-1" : "md:order-2"
          }`}
        >
          {game.image ? (
            <Image
              src={game.image.src}
              alt={game.image.alt}
              fill
              sizes="(min-width: 1024px) 640px, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <PhotoPlaceholder game={game} />
          )}
          {game.photoEffect === "snow" ? <SnowOverlay /> : null}
        </div>

        <div className={`md:col-span-6 lg:col-span-5 ${photoOnLeft ? "md:order-2" : "md:order-1"}`}>
          <p
            data-reveal-item
            style={revealOrder(0)}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft"
          >
            {game.kind}
          </p>
          <h4
            data-reveal-item
            style={revealOrder(1)}
            className="mt-2.5 text-2xl font-semibold leading-tight tracking-tight text-ivory sm:text-3xl"
          >
            {game.title}
          </h4>
          <p data-reveal-item style={revealOrder(2)} className="mt-4 text-sm leading-relaxed text-ivory-muted sm:text-base">
            {game.description}
          </p>
          <ul data-reveal-item style={revealOrder(3)} className="mt-5 space-y-2.5">
            {game.points.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ivory-faint">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {game.variants ? (
            <ul data-reveal-item style={revealOrder(4)} className="mt-6 grid gap-3 sm:grid-cols-2">
              {game.variants.map((variant) => (
                <li key={variant.title} className="rounded-xl border-l-2 border-amber bg-graphite px-4 py-3.5">
                  <p className="text-sm font-semibold text-ivory">{variant.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ivory-muted">{variant.description}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {game.partner ? (
            <p
              data-reveal-item
              style={revealOrder(4)}
              className="mt-6 inline-flex items-center gap-3 rounded-xl bg-graphite px-3.5 py-2.5 text-xs text-ivory-muted"
            >
              <Image
                src={game.partner.logoSrc}
                alt={`Logo ${game.partner.name}`}
                width={253}
                height={219}
                className="h-8 w-auto"
              />
              <span>
                Scenariusz we współpracy z <span className="font-semibold text-ivory">{game.partner.name}</span>
              </span>
            </p>
          ) : null}
        </div>
      </article>
    </RevealOnView>
  );
}

/** Stands in for a game's photo until one is added to `public/formaty`. */
function PhotoPlaceholder({ game }: { game: EventGame }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col justify-end bg-[radial-gradient(circle_at_80%_15%,rgba(245,166,35,0.22),transparent_55%),repeating-linear-gradient(135deg,rgba(245,241,232,0.035)_0_1px,transparent_1px_18px),linear-gradient(160deg,var(--color-graphite-hi),var(--color-obsidian))] p-6 transition-transform duration-700 ease-out group-hover:scale-[1.03] sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft/80">{game.kind}</p>
      <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-ivory/90 sm:text-5xl">{game.title}</p>
    </div>
  );
}
