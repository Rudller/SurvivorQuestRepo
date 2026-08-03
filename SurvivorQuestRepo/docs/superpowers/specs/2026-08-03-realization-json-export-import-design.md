# Eksport / import realizacji jako JSON

## Cel

Umożliwić pobranie realizacji jako pliku JSON, żeby:
1. przenosić realizacje między środowiskiem produkcyjnym a testowym,
2. archiwizować konfigurację realizacji poza bazą danych.

## Zakres

- Eksportowana jest **tylko konfiguracja** realizacji: dane firmy/kontaktu, ustawienia gry, scenariusz ze stacjami. Bez danych z rozgrywki (drużyny, postępy zadań, event logi, zdjęcia, skany QR).
- URL-e assetów (logo, grafika mapy, PDF oferty, obrazki/audio stacji) są zapisywane 1:1 tak jak są w bazie źródłowej — bez pobierania i osadzania plików binarnych. Po imporcie na innym środowisku mogą nie działać, jeśli bucket R2 nie jest publicznie dostępny z drugiej strony; to świadomy kompromis, poza zakresem tego zadania.
- Eksport i import budowane razem, w jednej iteracji.
- **Zero zmian w backendzie.** `GET /realizations` już zwraca `scenarioStations: Station[]` dla każdej realizacji, a `POST /realizations` (`createRealization`) już przyjmuje opcjonalny `scenarioStations` (draft stacji), który w całości nadpisuje stacje sklonowane ze wskazanego `scenarioId` — niezależnie od liczby stacji w oryginalnym scenariuszu (`realization.service.ts::syncScenarioStations`, dopasowanie pozycyjne po indeksie, nie po `id`). Import może więc w pełni wykorzystać istniejący formularz i endpoint tworzenia realizacji.

## Eksport

**Lokalizacja UI:** nowy przycisk "Pobierz JSON" w kolumnie *Akcje* w `apps/admin/src/features/realizations/components/realizations-table.tsx`, obok istniejących "Kody QR" i "Edytuj". Widoczny dla każdego, kto widzi tabelę (admin i instruktor) — to odczyt danych już widocznych na liście.

**Logika:** nowy plik `apps/admin/src/features/realizations/realization-export.ts`:

- `buildRealizationExport(realization: Realization): RealizationExportFile` — buduje obiekt:
  ```
  {
    schemaVersion: 1,
    exportedAt: string (ISO),
    realization: { <pola konfiguracyjne, patrz niżej> },
    scenarioStations: RealizationStationDraft[]
  }
  ```
  Pola **pomijane** z `Realization` (specyficzne dla środowiska źródłowego / bazodanowe): `id`, `scenarioId`, `scenarioTemplateId`, `scenarioTemplateName`, `stationIds`, `joinCode`, `requiredDevicesCount`, `positionsCount`, `locationRequired`, `createdAt`, `updatedAt`, `logs`.
  Stacje konwertowane istniejącą funkcją `toRealizationStationDraft` (z `realization-stations-editor.tsx`), z dodatkowym usunięciem pola `id` (id stacji ze środowiska źródłowego nie ma znaczenia przy tworzeniu nowych stacji).
- `downloadRealizationExport(realization: Realization): void` — serializuje do JSON (ładne formatowanie, `JSON.stringify(..., null, 2)`), tworzy Blob i wymusza pobranie pliku o nazwie `realizacja-<slug-firmy>-<YYYYMMDD>.json` (slug: lowercase, spacje/diakrytyki → `-`).

## Import

**Lokalizacja UI:** nowy przycisk "Importuj z JSON" na `apps/admin/src/app/realizations/page.tsx`, obok istniejącego "Nowa realizacja" (tylko gdy `canManageRealizations`). Klik otwiera ukryty `<input type="file" accept=".json">`.

**Logika:**
- Po wybraniu pliku: odczyt tekstu → `JSON.parse` → walidacja przez nową funkcję `parseRealizationExportFile(raw: unknown): RealizationExportFile | null` w `realization-export.ts` (sprawdza `schemaVersion === 1`, obecność wymaganych pól w `realization`, że `scenarioStations` jest tablicą).
- Błąd parsowania/walidacji → komunikat inline (wzorem istniejącego `formError` w formularzach), nic więcej się nie dzieje.
- Sukces → otwiera się `CreateRealizationForm` z nowym opcjonalnym propem `initialData?: RealizationExportFile`, który inicjalizuje cały stan formularza (firma, kontakt, ustawienia gry, mapa, harmonogram, `scenarioStations`) z danych z pliku zamiast pustych wartości domyślnych.
- **Scenariusz (szablon)** pozostaje polem wymaganym do ręcznego wyboru — tak jak dziś przy zwykłym tworzeniu — bo `scenarioId` ze środowiska źródłowego nie istnieje na docelowym, a i tak zostaje w całości nadpisany przez zaimportowane `scenarioStations`.
- Zapis idzie przez istniejący `createRealization` mutation, bez żadnych zmian w API.

## Obsługa błędów

- Niepoprawny/uszkodzony JSON → komunikat inline, import przerwany.
- Środowisko docelowe bez żadnego scenariusza-szablonu → istniejący komunikat formularza "Brak dostępnego scenariusza do utworzenia realizacji." (bez zmian).
- Niedostępne assety (inny bucket R2) → brak specjalnej obsługi w tej iteracji; admin uzupełnia ręcznie po imporcie.

## Testowanie

Brak testów jednostkowych w adminie (projekt ich nie ma na tym poziomie). Weryfikacja manualna przez dev server:
1. Eksport realizacji → podgląd zawartości JSON.
2. Import tego samego pliku → sprawdzenie, że formularz jest poprawnie wypełniony (dane firmy, ustawienia, lista stacji z quizami/punktami/kodami).
3. Wybór scenariusza-szablonu + zapis → porównanie utworzonej realizacji z oryginałem (poza polami bazodanowymi).
