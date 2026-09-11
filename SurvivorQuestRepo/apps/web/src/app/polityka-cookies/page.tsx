import type { Metadata } from "next";
import { Wordmark } from "@/components/wordmark";
import { OG_IMAGE } from "@/lib/site-url";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka cookies | SurvivorQuest",
  description: "Informacje o plikach cookie wykorzystywanych w SurvivorQuest.",
  alternates: {
    canonical: "/polityka-cookies",
  },
  openGraph: {
    title: "Polityka cookies | SurvivorQuest",
    description: "Informacje o plikach cookie wykorzystywanych w SurvivorQuest.",
    url: "/polityka-cookies",
    type: "article",
    locale: "pl_PL",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Polityka cookies | SurvivorQuest",
    description: "Informacje o plikach cookie wykorzystywanych w SurvivorQuest.",
    images: [OG_IMAGE.url],
  },
};

export default function CookiesPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold">
          <Wordmark />
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">Polityka cookies</h1>
        <p className="text-sm text-ivory-muted sm:text-base">
          Korzystamy z plików cookie, aby serwis działał prawidłowo i mógł być rozwijany na podstawie anonimowych
          statystyk.
        </p>
        <p className="text-xs text-ivory-faint">Ostatnia aktualizacja: 5 września 2026 r.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-line/70 bg-graphite/85 p-5 text-sm text-ivory-muted sm:text-base">
        <p>
          <span className="font-semibold text-ivory">Niezbędne cookies</span> są wymagane do działania strony i
          funkcji bezpieczeństwa (np. logowanie, utrzymanie sesji, integralność żądań).
        </p>
        <p>
          <span className="font-semibold text-ivory">Analityczne cookies</span> pomagają nam zrozumieć, jak
          użytkownicy korzystają ze strony i ulepszać doświadczenie. Te pliki uruchamiamy dopiero po akceptacji.
        </p>

        <table className="w-full border-collapse text-left text-xs sm:text-sm">
          <caption className="sr-only">Pliki cookie wykorzystywane w serwisie</caption>
          <thead>
            <tr className="text-ivory">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Nazwa
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Rola
              </th>
              <th scope="col" className="py-2 font-semibold">
                Czas życia
              </th>
            </tr>
          </thead>
          <tbody className="align-top">
            <tr>
              <td className="py-2 pr-3 font-mono text-amber">sq_cookie_consent</td>
              <td className="py-2 pr-3">
                Nasz własny plik — zapamiętuje Twoją decyzję z banera, żeby nie pytać przy każdej wizycie. Niezbędny.
              </td>
              <td className="py-2">1 rok</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-mono text-amber">_ga, _ga_*</td>
              <td className="py-2 pr-3">
                Google Analytics 4 — anonimowe statystyki odwiedzin. Zakładane wyłącznie po zgodzie na cookies
                analityczne.
              </td>
              <td className="py-2">2 lata</td>
            </tr>
          </tbody>
        </table>

        <p>
          Twoją decyzję zapisujemy dodatkowo w pamięci lokalnej przeglądarki pod kluczem{" "}
          <span className="font-mono text-amber">sq-cookie-consent-v1</span>, żeby zadziałała natychmiast po
          wybraniu, bez przeładowania strony.
        </p>
        <p>
          Swoją decyzję możesz zmienić, czyszcząc dane strony w przeglądarce. W kolejnej wizycie baner zgód pokaże się
          ponownie.
        </p>
      </section>

      <div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-line bg-graphite/80 px-4 py-2.5 text-sm font-medium text-ivory transition hover:border-amber/60 hover:text-amber"
        >
          Wróć na stronę główną
        </Link>
      </div>
    </main>
  );
}
