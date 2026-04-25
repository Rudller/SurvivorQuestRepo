import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka prywatności | SurvivorQuest",
  description: "Informacje o przetwarzaniu danych osobowych w SurvivorQuest.",
  alternates: {
    canonical: "/polityka-prywatnosci",
  },
  openGraph: {
    title: "Polityka prywatności | SurvivorQuest",
    description: "Informacje o przetwarzaniu danych osobowych w SurvivorQuest.",
    url: "/polityka-prywatnosci",
    type: "article",
    locale: "pl_PL",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">Polityka prywatności</h1>
        <p className="text-sm text-[#bdcdbf] sm:text-base">
          Poniżej znajdziesz podstawowe informacje o tym, jak przetwarzamy dane osobowe podczas korzystania z
          SurvivorQuest.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5 text-sm text-[#bdcdbf] sm:text-base">
        <p>
          Administratorem danych jest właściciel marki SurvivorQuest. W sprawach związanych z danymi osobowymi możesz
          skontaktować się mailowo na adres:{" "}
          <a href="mailto:hello@survivorquest.pl" className="text-[#f0c977] underline-offset-4 hover:underline">
            hello@survivorquest.pl
          </a>
          .
        </p>
        <p>
          Dane przetwarzamy w celu realizacji usług, kontaktu z użytkownikiem, zapewnienia bezpieczeństwa systemu oraz
          prowadzenia podstawowych analiz jakości działania serwisu (jeśli użytkownik wyrazi na to zgodę).
        </p>
        <p>
          Użytkownik ma prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz
          wniesienia sprzeciwu.
        </p>
        <p>
          Ta strona ma charakter informacyjny i może być uzupełniona o pełną dokumentację prawną przed publikacją
          produkcyjną.
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
