"use client";

import { useEffect, useState } from "react";
import { LandingScrollLink } from "./landing-scroll-link";

type NavItem = {
  href: string;
  label: string;
};

type LandingNavProps = {
  items: readonly NavItem[];
};

/** Below this width the six section links stop fitting beside the logo lockup. */
const INLINE_NAV_QUERY = "(min-width: 1024px)";

const INLINE_LINK_CLASS =
  "group relative inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium tracking-[0.02em] text-ivory-faint transition after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-amber-soft after:transition-all after:duration-200 hover:bg-graphite-hi hover:text-ivory hover:after:w-[56%] focus-visible:bg-graphite-hi focus-visible:text-ivory focus-visible:outline-none focus-visible:after:w-[56%]";

const SHEET_LINK_CLASS =
  "flex w-full items-center rounded-lg px-4 py-2.5 text-sm font-medium text-ivory transition hover:bg-graphite-hi hover:text-amber-soft focus-visible:bg-graphite-hi focus-visible:text-amber-soft focus-visible:outline-none";

/**
 * Section navigation, inline beside the logo on wide screens and behind a
 * burger below that.
 *
 * Both variants render the same list from the same source; only one is ever in
 * the accessibility tree, because the inline one is `display: none` under the
 * breakpoint and the sheet is not mounted at all until it is opened.
 */
export function LandingNav({ items }: LandingNavProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!isSheetOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSheetOpen(false);
      }
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest("[data-landing-nav-sheet]")) {
        setIsSheetOpen(false);
      }
    };

    // Growing past the breakpoint swaps in the inline nav; a sheet left open
    // would otherwise stay stuck on screen with no button to close it.
    const inlineNav = window.matchMedia(INLINE_NAV_QUERY);
    const closeWhenInline = () => {
      if (inlineNav.matches) {
        setIsSheetOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("click", closeOnOutsideClick);
    inlineNav.addEventListener("change", closeWhenInline);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("click", closeOnOutsideClick);
      inlineNav.removeEventListener("change", closeWhenInline);
    };
  }, [isSheetOpen]);

  return (
    <>
      <nav aria-label="Nawigacja sekcji strony" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <LandingScrollLink href={item.href} className={INLINE_LINK_CLASS}>
                {item.label}
              </LandingScrollLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="relative lg:hidden" data-landing-nav-sheet>
        <button
          type="button"
          aria-expanded={isSheetOpen}
          aria-controls="landing-nav-sheet"
          onClick={() => setIsSheetOpen((open) => !open)}
          className="flex size-11 items-center justify-center rounded-xl bg-graphite text-ivory transition hover:bg-graphite-hi hover:text-amber-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          <span className="sr-only">{isSheetOpen ? "Zamknij menu" : "Otwórz menu"}</span>
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>

        {isSheetOpen ? (
          <nav
            id="landing-nav-sheet"
            aria-label="Nawigacja sekcji strony"
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-ink p-2 shadow-[0_24px_44px_-24px_rgba(0,0,0,0.9)]"
          >
            <ul className="grid gap-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <LandingScrollLink
                    href={item.href}
                    className={SHEET_LINK_CLASS}
                    onNavigate={() => setIsSheetOpen(false)}
                  >
                    {item.label}
                  </LandingScrollLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </>
  );
}
