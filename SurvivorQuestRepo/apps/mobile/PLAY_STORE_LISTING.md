# SurvivorQuest — treści do Google Play Console

## Automatyczna publikacja przez EAS Submit

Skonfigurowane i zweryfikowane (31.07.2026):

- Projekt Google Cloud: `survivorquest-play-publishing`, API `androidpublisher.googleapis.com` włączone
- Service account: `eas-play-publisher@survivorquest-play-publishing.iam.gserviceaccount.com`, zaproszony w Play Console → Użytkownicy i uprawnienia z uprawnieniami "Tworzenie wersji produkcyjnych" + "Tworzenie wersji do ścieżek testów"
- Klucz JSON: `apps/mobile/credentials/google-play-service-account.json` (poza gitem, katalog `credentials/` w `.gitignore`)
- `eas.json` → `submit.production.android` wskazuje na ten klucz, domyślny kanał: `internal`

Użycie:

```bash
pnpm --filter mobile build:apk                        # build beta (APK, internal distribution)
npx eas-cli build --platform android --profile production   # build .aab do Play
npx eas-cli submit --platform android --profile production --latest   # wyślij ostatni build na Test wewnętrzny
```

Pierwszy build+submit (1.0.0, kod wersji 1) trafił na ścieżkę **Test wewnętrzny** — ścieżka jest **Aktywna** (lista e-mailowa "Tablety eventowe" z adresem `admin@survivorquest.pl` dodana jako tester, 31.07.2026).

**Link instalacyjny dla tabletów** (opt-in + pobranie z Google Play, auto-aktualizacje działają jak w produkcji):
`https://play.google.com/apps/internaltest/4700500923351734303`

Otwórz ten link na koncie `admin@survivorquest.pl` na każdym tablecie → "Zostań testerem" → link do Google Play → zainstaluj. Play Store będzie odtąd sam aktualizował appkę przy każdym nowym `eas submit`.

Żeby wysyłać na inną ścieżkę (np. `beta`/closed testing czy `production`), zmień `track` w `eas.json` albo dodaj przy wywołaniu `eas submit --track production`.


Gotowe do wklejenia teksty i informacje potrzebne przy zakładaniu wpisu aplikacji w Play Console.
Bazują na obecnym stanie aplikacji (uprawnienia z `app.json`, treści z `apps/web` landing page).

## Podstawowe informacje

| Pole | Wartość |
|---|---|
| Nazwa aplikacji | SurvivorQuest |
| Package name | `com.survivorquest.app` |
| Kategoria (sugerowana) | Biznes (alternatywnie: Styl życia) |
| Typ aplikacji | Aplikacja |
| Adres e-mail kontaktowy | kontakt@survivorquest.pl |
| Strona WWW | https://survivorquest.pl |
| Adres URL polityki prywatności | https://survivorquest.pl/polityka-prywatnosci |

## Krótki opis (max 80 znaków)

```
Gra terenowa dla drużyn: skanuj QR, wykonuj zadania, zbieraj punkty.
```
(68 znaków)

## Pełny opis (max 4000 znaków)

```
SurvivorQuest to aplikacja mobilna dla uczestników gier terenowych i eventów firmowych organizowanych na platformie SurvivorQuest.

Dołączasz do gry kodem otrzymanym od organizatora, wybierasz swoją drużynę i ruszacie w teren. Na mapie widzicie stacje wyzwań — quizy, szyfry, zagadki logiczne, zadania audio i wiele innych — które odblokowują się w trakcie realizacji.

Co potrafi aplikacja:
• Dołączanie do gry kodem drużyny — bez zakładania konta
• Mapa realizacji z pozycją drużyny i lokalizacją stacji
• Skanowanie kodów QR przy stacjach, aby odblokować zadanie
• 16 typów wyzwań: quizy, quizy audio, wordle, hangman, mastermind, anagramy, szyfr Cezara, memory, simon, rebusy, boggle, mini-sudoku, dopasowywanie, mocne hasło, zadania czasowe i punktowe
• Zadania ze zdjęciem — wykonaj fotografię jako dowód ukończenia zadania
• Podgląd punktacji i postępu drużyny na żywo
• Wsparcie kilku języków: polski, angielski, ukraiński, rosyjski

Aplikacja jest częścią platformy SurvivorQuest, z której korzystają firmy organizujące eventy integracyjne, szkolenia terenowe i gry miejskie. Jeśli otrzymałeś/aś kod dołączenia od organizatora eventu — ta aplikacja jest dla Ciebie.

Aplikacja wymaga aktywnej realizacji utworzonej przez organizatora — nie działa jako samodzielna gra bez kodu dołączenia.
```
(ok. 1250 znaków — jest zapas do rozbudowy)

## Grafiki wymagane przez Play Console

| Zasób | Wymagany rozmiar | Status w repo |
|---|---|---|
| Ikona aplikacji | 512×512 PNG (32-bit z alfa) | `assets/survivor_icon_512.png` — do weryfikacji wymiarów |
| Grafika polecana (feature graphic) | 1024×500 PNG/JPG | brak — do przygotowania |
| Zrzuty ekranu telefonu | min. 2, max 8; 16:9 lub 9:16, min. 320px | brak — zrób ze zrzutów: mapa realizacji, panel stacji (np. quiz), skaner QR |

Feature graphic i zrzuty ekranu nie istnieją jeszcze w repo — mogę je przygotować, jeśli podeślesz zrzuty z działającej aplikacji, albo zrobimy je razem przez `run`/emulator.

## Formularz "Bezpieczeństwo danych" (Data safety)

Na podstawie uprawnień w `app.json` (`CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`) i analizy kodu:

| Typ danych | Zbierane? | Cel | Udostępniane stronom trzecim? | Uwagi |
|---|---|---|---|---|
| Lokalizacja przybliżona/dokładna | Tak | Funkcjonalność aplikacji (pozycja drużyny na mapie realizacji) | Nie | Widoczna tylko dla organizatora danej realizacji (panel admina), nie jest sprzedawana ani udostępniana |
| Zdjęcia | Tak | Funkcjonalność aplikacji (zadania fotograficzne) | Nie | Przesyłane do backendu organizatora jako dowód ukończenia zadania |
| Dźwięk (mikrofon) | Nie | — | — | `RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS` wymagane technicznie przez bibliotekę audio (odtwarzanie dźwięków w zadaniach), aplikacja **nie nagrywa** głosu użytkownika |
| Dane osobowe (imię, e-mail, telefon) | Nie | — | — | Dołączenie do gry odbywa się kodem drużyny, bez rejestracji konta ani danych osobowych |
| Szyfrowanie danych w tranzycie | Tak | — | — | Komunikacja z backendem po HTTPS |
| Możliwość usunięcia danych | Tak | — | — | Dane realizacji usuwa organizator po zakończeniu eventu; kontakt: kontakt@survivorquest.pl |

## Kwestionariusz oceny treści (content rating)

Sugerowane odpowiedzi (IARC): brak przemocy, brak treści dla dorosłych, brak hazardu, brak generowanych przez użytkowników treści publicznych (zdjęcia widoczne tylko dla organizatora, nie publikowane). Aplikacja powinna otrzymać najniższą kategorię wiekową (PEGI 3 / Everyone).

## Ścieżka wydania

Konta deweloperskie założone **po listopadzie 2023** muszą przejść zamknięty test (closed testing) z **min. 12 testerami przez min. 14 dni** zanim Google odblokuje publikację produkcyjną. Jeśli konto Google Play Developer dla SurvivorQuest jest nowe:

1. Utwórz aplikację w Play Console, uzupełnij powyższe treści.
2. Wgraj `.aab` z builda EAS do ścieżki **Testy zamknięte** (Closed testing), dodaj min. 12 testerów (adresy e-mail lub grupa Google).
3. Poczekaj min. 14 dni z aktywnymi testerami.
4. Uzupełnij kwestionariusz treści, Data safety, deklarację docelowej grupy odbiorców (aplikacja B2B — nie kierowana do dzieci).
5. Po spełnieniu wymagań Google odblokuje promocję do produkcji.

Jeśli konto istnieje od dawna i ma już opublikowane aplikacje, ten krok może nie być wymagany — Play Console pokaże to explicité przy próbie utworzenia wydania produkcyjnego.
