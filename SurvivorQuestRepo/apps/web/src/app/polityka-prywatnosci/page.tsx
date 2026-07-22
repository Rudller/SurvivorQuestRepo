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

const sectionClassName =
  "space-y-3 rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5 text-sm text-[#bdcdbf] sm:text-base";
const headingClassName = "text-lg font-semibold text-[#f3f5ef]";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">Polityka prywatności</h1>
        <p className="text-sm text-[#bdcdbf] sm:text-base">
          Niniejsza polityka opisuje, jakie dane przetwarzamy w związku z korzystaniem z serwisu SurvivorQuest oraz
          aplikacji mobilnej SurvivorQuest (Android/iOS), i na jakich zasadach.
        </p>
        <p className="text-xs text-[#98ad9c]">Ostatnia aktualizacja: 16 lipca 2026 r.</p>
      </header>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>1. Administrator danych</h2>
        <p>
          Administratorem danych jest właściciel marki SurvivorQuest. W sprawach związanych z danymi osobowymi możesz
          skontaktować się mailowo na adres:{" "}
          <a href="mailto:kontakt@survivorquest.pl" className="text-[#f0c977] underline-offset-4 hover:underline">
            kontakt@survivorquest.pl
          </a>{" "}
          lub telefonicznie:{" "}
          <a href="tel:+48730622029" className="text-[#f0c977] underline-offset-4 hover:underline">
            +48 730 622 029
          </a>
          .
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>2. Jakie dane przetwarzamy</h2>
        <p>W zależności od tego, jak korzystasz z SurvivorQuest, możemy przetwarzać:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-[#f3f5ef]">Dane uczestnika gry (aplikacja mobilna):</span> kod dołączenia do
            wydarzenia, nazwa i kolor drużyny, opcjonalne imię uczestnika, identyfikator urządzenia oraz zdjęcie
            drużyny („selfie”) służące jako identyfikator wizualny drużyny w trakcie gry.
          </li>
          <li>
            <span className="text-[#f3f5ef]">Zdjęcia z zadań fotograficznych:</span> jeśli scenariusz wydarzenia
            zawiera zadanie fotograficzne, przesłane zdjęcie jest widoczne dla organizatora w celu weryfikacji
            wykonania zadania.
          </li>
          <li>
            <span className="text-[#f3f5ef]">Lokalizacja:</span> jeżeli organizator włączył tę funkcję dla danego
            wydarzenia, aplikacja mobilna przesyła bieżącą lokalizację GPS drużyny w trakcie trwania gry, aby
            wyświetlić pozycję na mapie wydarzenia (widoczną dla organizatora oraz, w zależności od ustawień
            wydarzenia, dla innych drużyn).
          </li>
          <li>
            <span className="text-[#f3f5ef]">Dane konta organizatora (panel administracyjny):</span> adres e-mail i
            hasło (przechowywane w formie zahaszowanej) osób zarządzających wydarzeniami.
          </li>
          <li>
            <span className="text-[#f3f5ef]">Dane kontaktowe:</span> jeśli piszesz do nas mailowo lub telefonicznie —
            treść korespondencji i podane przez Ciebie dane kontaktowe.
          </li>
        </ul>
        <p>
          Aplikacja mobilna SurvivorQuest nie zawiera narzędzi analitycznych ani śledzących osób trzecich (np.
          Google Analytics, Firebase, Meta Pixel) — nie profilujemy użytkowników w celach reklamowych.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>3. Uprawnienia aplikacji mobilnej</h2>
        <p>Aplikacja mobilna prosi o dostęp do:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-[#f3f5ef]">Aparatu</span> — do skanowania kodów QR stanowisk oraz robienia zdjęć
            (selfie drużyny, zadania fotograficzne).
          </li>
          <li>
            <span className="text-[#f3f5ef]">Lokalizacji</span> — do wyświetlania pozycji drużyny na mapie wydarzenia
            (tylko gdy funkcja ta jest włączona przez organizatora danego wydarzenia).
          </li>
          <li>
            <span className="text-[#f3f5ef]">Mikrofonu</span> — wymagane technicznie przez niektóre stanowiska
            audio (np. quiz dźwiękowy) do poprawnego odtwarzania nagrań w aplikacji; aplikacja nie nagrywa dźwięku z
            otoczenia.
          </li>
        </ul>
        <p>Każde z tych uprawnień możesz w dowolnym momencie wyłączyć w ustawieniach systemowych telefonu.</p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>4. Cele i podstawy prawne przetwarzania</h2>
        <p>Dane przetwarzamy w celu:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>przeprowadzenia gry/wydarzenia, w którym bierzesz udział (art. 6 ust. 1 lit. b RODO — wykonanie umowy),</li>
          <li>
            zapewnienia bezpieczeństwa i logistyki wydarzenia oraz umożliwienia organizatorowi weryfikacji zadań
            (art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes organizatora i administratora),
          </li>
          <li>kontaktu z Tobą w odpowiedzi na Twoje zapytanie (art. 6 ust. 1 lit. b lub f RODO),</li>
          <li>
            ewentualnych podstawowych analiz jakości działania serwisu — wyłącznie za Twoją zgodą (art. 6 ust. 1 lit.
            a RODO).
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>5. Komu udostępniamy dane</h2>
        <p>
          Dane drużyny (w tym zdjęcia, wyniki i — jeśli włączona — lokalizacja) są widoczne dla organizatora danego
          wydarzenia w panelu administracyjnym. Zdjęcia przechowujemy przy pomocy zewnętrznego dostawcy
          infrastruktury chmurowej (Cloudflare R2), który przetwarza je wyłącznie na nasze zlecenie jako podmiot
          przetwarzający. Nie sprzedajemy danych osobowych i nie udostępniamy ich podmiotom trzecim w celach
          marketingowych.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>6. Okres przechowywania danych</h2>
        <p>
          Dane związane z danym wydarzeniem przechowujemy przez czas jego trwania oraz przez okres niezbędny do
          rozliczenia się z organizatorem i obsługi ewentualnych reklamacji, a następnie usuwamy lub anonimizujemy —
          chyba że wcześniej otrzymamy od Ciebie żądanie usunięcia danych, które zrealizujemy zgodnie z sekcją 7.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>7. Twoje prawa</h2>
        <p>W związku z przetwarzaniem danych osobowych masz prawo do:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>dostępu do swoich danych oraz uzyskania ich kopii,</li>
          <li>sprostowania (poprawienia) danych,</li>
          <li>usunięcia danych („prawo do bycia zapomnianym”),</li>
          <li>ograniczenia przetwarzania,</li>
          <li>wniesienia sprzeciwu wobec przetwarzania,</li>
          <li>przenoszenia danych,</li>
          <li>
            wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uznasz, że przetwarzanie
            narusza przepisy o ochronie danych osobowych.
          </li>
        </ul>
        <p>
          Aby skorzystać z powyższych praw, napisz do nas na adres{" "}
          <a href="mailto:kontakt@survivorquest.pl" className="text-[#f0c977] underline-offset-4 hover:underline">
            kontakt@survivorquest.pl
          </a>
          .
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>8. Zmiany polityki prywatności</h2>
        <p>
          Możemy okresowo aktualizować tę politykę, w szczególności w związku z rozwojem aplikacji. Aktualna wersja
          jest zawsze dostępna pod tym adresem, wraz z datą ostatniej aktualizacji podaną powyżej.
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
