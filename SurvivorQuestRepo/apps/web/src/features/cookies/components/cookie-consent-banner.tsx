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
    <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-[#365546]/60 bg-[#e8ba63]/82 shadow-[0_-20px_40px_-26px_rgba(0,0,0,0.55)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="flex items-start gap-3">
            <CookieBadgeIcon />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#173227]">Cookies</p>
              <p className="mt-1 text-sm font-semibold text-[#13231b]">Dbamy o Twoją prywatność</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#1e352a] sm:text-sm">
            Używamy plików cookie niezbędnych do działania serwisu oraz opcjonalnych cookie analitycznych. Wybierz, na
            co się zgadzasz.
          </p>
          <p className="mt-2 text-[11px] text-[#2b4739] sm:text-xs">
            Szczegóły:{" "}
            <Link href="/polityka-prywatnosci" className="text-[#173227] underline-offset-2 hover:underline">
              Polityka prywatności
            </Link>{" "}
            i{" "}
            <Link href="/polityka-cookies" className="text-[#173227] underline-offset-2 hover:underline">
              Polityka cookies
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <button
            type="button"
            onClick={acceptNecessaryOnly}
            className="inline-flex items-center justify-center rounded-xl border border-[#365546]/70 bg-[#2a4438]/92 px-4 py-2 text-xs font-medium text-[#f3f5ef] transition hover:border-[#173227] hover:bg-[#315042] sm:text-sm"
          >
            Tylko niezbędne
          </button>
          <button
            type="button"
            onClick={acceptAnalytics}
            className="inline-flex items-center justify-center rounded-xl bg-[#173227] px-4 py-2 text-xs font-semibold text-[#f3f5ef] transition hover:bg-[#1f3f31] sm:text-sm"
          >
            Akceptuję analityczne
          </button>
        </div>
      </div>
    </aside>
  );
}
