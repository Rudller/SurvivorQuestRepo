import type { Metadata } from "next";
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
  },
};

export default function CookiesPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">Polityka cookies</h1>
        <p className="text-sm text-[#bdcdbf] sm:text-base">
          Korzystamy z plików cookie, aby serwis działał prawidłowo i mógł być rozwijany na podstawie anonimowych
          statystyk.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5 text-sm text-[#bdcdbf] sm:text-base">
        <p>
          <span className="font-semibold text-[#f3f5ef]">Niezbędne cookies</span> są wymagane do działania strony i
          funkcji bezpieczeństwa (np. logowanie, utrzymanie sesji, integralność żądań).
        </p>
        <p>
          <span className="font-semibold text-[#f3f5ef]">Analityczne cookies</span> pomagają nam zrozumieć, jak
          użytkownicy korzystają ze strony i ulepszać doświadczenie. Te pliki uruchamiamy dopiero po akceptacji.
        </p>
        <p>
          Swoją decyzję możesz zmienić, czyszcząc dane strony w przeglądarce. W kolejnej wizycie baner zgód pokaże się
          ponownie.
        </p>
      </section>

      <div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-[#446251] bg-[#12221b]/80 px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977]"
        >
          Wróć na stronę główną
        </Link>
      </div>
    </main>
  );
}
