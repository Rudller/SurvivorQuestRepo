"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  persistCookieConsent,
  readCookieConsentState,
} from "@/features/cookies/lib/cookie-consent";

function CookieBadgeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="mt-0.5 size-8 shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
    >
      <circle cx="16" cy="16" r="12" fill="#f0c977" />
      <circle cx="24.5" cy="9.5" r="4.3" fill="#173227" />
      <circle cx="10.5" cy="12" r="1.7" fill="#8a5937" />
      <circle cx="18.5" cy="14.2" r="1.4" fill="#8a5937" />
      <circle cx="13.8" cy="20" r="1.5" fill="#8a5937" />
      <circle cx="20.2" cy="21.2" r="1.25" fill="#8a5937" />
    </svg>
  );
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const existing = readCookieConsentState();
    setIsVisible(!existing);
  }, []);

  function acceptNecessaryOnly() {
    persistCookieConsent(false);
    setIsVisible(false);
  }

  function acceptAnalytics() {
    persistCookieConsent(true);
    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[#f0c977]/65 bg-gradient-to-br from-[#1f352b]/98 via-[#183126]/95 to-[#13271f]/95 p-4 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.92),0_0_0_1px_rgba(240,201,119,0.18)] backdrop-blur sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-xl">
      <div className="flex items-start gap-3">
        <CookieBadgeIcon />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f0c977]">Cookies</p>
          <p className="mt-1 text-sm font-semibold text-[#f3f5ef]">Dbamy o Twoją prywatność</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#d7e1d8] sm:text-sm">
        Używamy plików cookie niezbędnych do działania serwisu oraz opcjonalnych cookie analitycznych. Wybierz, na co
        się zgadzasz.
      </p>
      <p className="mt-2 text-[11px] text-[#b8c8ba] sm:text-xs">
        Szczegóły:{" "}
        <Link href="/polityka-prywatnosci" className="text-[#f0c977] underline-offset-2 hover:underline">
          Polityka prywatności
        </Link>{" "}
        i{" "}
        <Link href="/polityka-cookies" className="text-[#f0c977] underline-offset-2 hover:underline">
          Polityka cookies
        </Link>
        .
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={acceptNecessaryOnly}
          className="inline-flex items-center justify-center rounded-xl border border-[#8aa293]/65 bg-[#1b3027]/85 px-4 py-2 text-xs font-medium text-[#f3f5ef] transition hover:border-[#f0c977]/75 hover:text-[#f0c977] sm:text-sm"
        >
          Tylko niezbędne
        </button>
        <button
          type="button"
          onClick={acceptAnalytics}
          className="inline-flex items-center justify-center rounded-xl bg-[#f0c977] px-4 py-2 text-xs font-semibold text-[#13231b] transition hover:bg-[#ffd98d] sm:text-sm"
        >
          Akceptuję analityczne
        </button>
      </div>
    </aside>
  );
}
